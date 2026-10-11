import {
  estimateDrivingSeconds,
  formatDistanceKm,
  formatTravelMinutes,
  haversineMeters,
  type ShopCoordinates,
} from '../location/shop-coordinates';

/**
 * Routing provider abstraction (distanceMatrix-style).
 *
 * The guest flow depends only on this interface, so a future paid provider
 * can be plugged in later as another implementation without touching any flow.
 * Travel time is always a route-based estimate, never live traffic.
 */

export type RoutePoint = ShopCoordinates;

export type RouteSource = 'openrouteservice' | 'osrm' | 'estimate';

export type RouteEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  source: RouteSource;
};

export type RouteUnavailableReason = 'sin-clave' | 'red' | 'sin-ruta';

export class RouteUnavailableError extends Error {
  readonly reason: RouteUnavailableReason;

  constructor(reason: RouteUnavailableReason, message: string) {
    super(message);
    this.name = 'RouteUnavailableError';
    this.reason = reason;
  }
}

export interface RouteProvider {
  readonly name: string;
  getDrivingRoute(origin: RoutePoint, destination: RoutePoint): Promise<RouteEstimate>;
}

/** Offline fallback: straight-line distance with an honest driving estimate. */
export class HaversineRouteProvider implements RouteProvider {
  readonly name = 'haversine-estimate';

  async getDrivingRoute(origin: RoutePoint, destination: RoutePoint): Promise<RouteEstimate> {
    const distanceMeters = haversineMeters(origin, destination);
    return { distanceMeters, durationSeconds: estimateDrivingSeconds(distanceMeters), source: 'estimate' };
  }
}

export type OpenRouteServiceProviderDeps = {
  /** Free-tier key from https://openrouteservice.org (dashboard -> API keys). */
  apiKey: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
};

type OrsDirectionsResponse = {
  features?: Array<{ properties?: { segments?: Array<{ distance?: number; duration?: number }> } }>;
};

/**
 * Driving distance/duration from the OpenRouteService free tier.
 * Key resolution stays with the caller: an empty key fails fast with
 * 'sin-clave' so the UI can degrade to the offline estimate.
 */
export class OpenRouteServiceProvider implements RouteProvider {
  readonly name = 'openrouteservice';
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(deps: OpenRouteServiceProviderDeps) {
    this.apiKey = deps.apiKey;
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.baseUrl = deps.baseUrl ?? 'https://api.openrouteservice.org';
  }

  async getDrivingRoute(origin: RoutePoint, destination: RoutePoint): Promise<RouteEstimate> {
    if (!this.apiKey.trim()) {
      throw new RouteUnavailableError('sin-clave', 'Falta la clave de OpenRouteService.');
    }

    const url =
      `${this.baseUrl}/v2/directions/driving-car` +
      `?api_key=${encodeURIComponent(this.apiKey)}` +
      `&start=${origin.longitude},${origin.latitude}` +
      `&end=${destination.longitude},${destination.latitude}`;

    let response: Response;
    try {
      response = await this.fetchImpl(url);
    } catch {
      throw new RouteUnavailableError('red', 'No pudimos conectar con el servicio de rutas.');
    }
    if (!response.ok) {
      throw new RouteUnavailableError('red', 'El servicio de rutas no respondió.');
    }

    let payload: OrsDirectionsResponse;
    try {
      payload = (await response.json()) as OrsDirectionsResponse;
    } catch {
      throw new RouteUnavailableError('red', 'El servicio de rutas devolvió datos inválidos.');
    }

    const segments = payload.features?.[0]?.properties?.segments ?? [];
    const distanceMeters = segments.reduce((sum, s) => sum + (s.distance ?? 0), 0);
    const durationSeconds = segments.reduce((sum, s) => sum + (s.duration ?? 0), 0);
    if (segments.length === 0 || distanceMeters <= 0 || durationSeconds <= 0) {
      throw new RouteUnavailableError('sin-ruta', 'No encontramos una ruta en auto.');
    }
    return { distanceMeters, durationSeconds, source: 'openrouteservice' };
  }
}

/** Spanish summary with the honest no-live-traffic limitation. */
export function formatRouteSummary(estimate: RouteEstimate): string {
  return `${formatDistanceKm(estimate.distanceMeters)} · ${formatTravelMinutes(estimate.durationSeconds)} en auto (estimado según ruta, sin tráfico en vivo)`;
}

export type OsrmRouteProviderDeps = {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
};

type OsrmRouteResponse = {
  routes?: Array<{ distance?: number; duration?: number }>;
};

/**
 * Driving distance/duration from the OSRM public demo server (no key).
 * Temporary default while guest routing needs no signup; fair use means
 * callers issue a single request per card render (no polling, no prefetch).
 */
export class OsrmRouteProvider implements RouteProvider {
  readonly name = 'osrm';
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(deps: OsrmRouteProviderDeps = {}) {
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.baseUrl = deps.baseUrl ?? 'https://router.project-osrm.org';
  }

  async getDrivingRoute(origin: RoutePoint, destination: RoutePoint): Promise<RouteEstimate> {
    const url =
      `${this.baseUrl}/route/v1/driving/` +
      `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
      `?overview=false`;

    let response: Response;
    try {
      response = await this.fetchImpl(url);
    } catch {
      throw new RouteUnavailableError('red', 'No pudimos conectar con el servicio de rutas.');
    }
    if (!response.ok) {
      throw new RouteUnavailableError('red', 'El servicio de rutas no respondió.');
    }

    let payload: OsrmRouteResponse;
    try {
      payload = (await response.json()) as OsrmRouteResponse;
    } catch {
      throw new RouteUnavailableError('red', 'El servicio de rutas devolvió datos inválidos.');
    }

    const route = payload.routes?.[0];
    const distanceMeters = route?.distance ?? 0;
    const durationSeconds = route?.duration ?? 0;
    if (!route || distanceMeters <= 0 || durationSeconds <= 0) {
      throw new RouteUnavailableError('sin-ruta', 'No encontramos una ruta en auto.');
    }
    return { distanceMeters, durationSeconds, source: 'osrm' };
  }
}

export type RoutingProviderKind = 'osrm' | 'openrouteservice';

/**
 * Temporary default: OSRM unless the caller explicitly opts back into
 * OpenRouteService via `EXPO_PUBLIC_ROUTING_PROVIDER=openrouteservice`.
 * ORS stays dormant in code; switching back is config-only.
 */
export function resolveRoutingProviderKind(env?: Record<string, string | undefined>): RoutingProviderKind {
  const source = env ?? process.env;
  return source['EXPO_PUBLIC_ROUTING_PROVIDER'] === 'openrouteservice' ? 'openrouteservice' : 'osrm';
}

export type DefaultRouteProviderDeps = {
  env?: Record<string, string | undefined>;
  /** Free-tier ORS key; only used when the env selects `openrouteservice`. */
  apiKey?: string;
  fetchImpl?: typeof fetch;
};

/** Builds the configured provider: OSRM by default, ORS only when selected via env. */
export function createDefaultRouteProvider(deps: DefaultRouteProviderDeps = {}): RouteProvider {
  if (resolveRoutingProviderKind(deps.env) === 'openrouteservice') {
    return new OpenRouteServiceProvider({ apiKey: deps.apiKey ?? '', fetchImpl: deps.fetchImpl });
  }
  return new OsrmRouteProvider({ fetchImpl: deps.fetchImpl });
}

export type RouteFallbackDeps = {
  provider?: RouteProvider;
  fallback?: RouteProvider;
};

/**
 * Runs the configured provider and degrades to the honest haversine
 * estimate on any routing failure. Never throws, never blocks callers.
 */
export async function getDrivingRouteWithFallback(
  origin: RoutePoint,
  destination: RoutePoint,
  deps: RouteFallbackDeps = {},
): Promise<RouteEstimate> {
  const provider = deps.provider ?? new OsrmRouteProvider();
  const fallback = deps.fallback ?? new HaversineRouteProvider();
  try {
    return await provider.getDrivingRoute(origin, destination);
  } catch (error) {
    if (error instanceof RouteUnavailableError) {
      return fallback.getDrivingRoute(origin, destination);
    }
    throw error;
  }
}
