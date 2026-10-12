import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

import {
  estimateDrivingSeconds,
  formatDistanceKm,
  formatTravelMinutes,
  haversineMeters,
  parseShopCoordinates,
} from '../../apps/mobile/src/features/location/shop-coordinates';
import {
  getCustomerLocation,
  requestCustomerLocation,
  resetCustomerLocationCache,
} from '../../apps/mobile/src/features/location/customer-location';
import {
  HaversineRouteProvider,
  OpenRouteServiceProvider,
  OsrmRouteProvider,
  createDefaultRouteProvider,
  formatRouteSummary,
  getDrivingRouteWithFallback,
  resolveRoutingProviderKind,
} from '../../apps/mobile/src/features/routing/route-provider';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

const PLAZA_MAYOR = { latitude: -12.0464, longitude: -77.0428 };
const MIRAFLORES = { latitude: -12.1219, longitude: -77.0295 };

describe('shop coordinates (pure)', () => {
  it('parses nullable coordinates from the catalog payload', () => {
    expect(parseShopCoordinates({ latitud: -12.0464, longitud: -77.0428 })).toEqual(PLAZA_MAYOR);
    expect(parseShopCoordinates({ latitud: null, longitud: null })).toBeNull();
    expect(parseShopCoordinates(null)).toBeNull();
    expect(parseShopCoordinates({})).toBeNull();
  });

  it('rejects out-of-range or non-numeric coordinates without throwing', () => {
    expect(parseShopCoordinates({ latitud: -91, longitud: 0 })).toBeNull();
    expect(parseShopCoordinates({ latitud: 0, longitud: 181 })).toBeNull();
    expect(parseShopCoordinates({ latitud: 'x', longitud: 0 })).toBeNull();
  });

  it('measures straight-line distance with haversine', () => {
    const meters = haversineMeters(PLAZA_MAYOR, MIRAFLORES);
    expect(meters).toBeGreaterThan(7500);
    expect(meters).toBeLessThan(9500);
  });

  it('formats distance and travel time in Spanish', () => {
    expect(formatDistanceKm(850)).toBe('850 m');
    expect(formatDistanceKm(1200)).toBe('1,2 km');
    expect(formatTravelMinutes(480)).toBe('~8 min');
    expect(estimateDrivingSeconds(9000)).toBeGreaterThan(0);
  });
});

describe('routing provider abstraction', () => {
  it('exposes a swappable distanceMatrix-style interface', () => {
    const haversine = new HaversineRouteProvider();
    const ors = new OpenRouteServiceProvider({ apiKey: 'key', fetchImpl: vi.fn() });
    for (const provider of [haversine, ors]) {
      expect(typeof provider.name).toBe('string');
      expect(typeof provider.getDrivingRoute).toBe('function');
    }
    expect(haversine.name).not.toBe(ors.name);
  });

  it('falls back to an honest offline estimate without a key', async () => {
    const estimate = await new HaversineRouteProvider().getDrivingRoute(PLAZA_MAYOR, MIRAFLORES);
    expect(estimate.source).toBe('estimate');
    expect(estimate.distanceMeters).toBeGreaterThan(0);
    expect(estimate.durationSeconds).toBeGreaterThan(0);
  });

  it('reads driving distance and duration from OpenRouteService', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ features: [{ properties: { segments: [{ distance: 9500, duration: 720 }] } }] }),
        { status: 200 },
      ),
    );
    const estimate = await new OpenRouteServiceProvider({ apiKey: 'free-key', fetchImpl }).getDrivingRoute(
      PLAZA_MAYOR,
      MIRAFLORES,
    );
    expect(estimate.source).toBe('openrouteservice');
    expect(estimate.distanceMeters).toBe(9500);
    expect(estimate.durationSeconds).toBe(720);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(String(fetchImpl.mock.calls[0][0])).toContain('openrouteservice.org');
  });

  it('degrades gracefully when the key is missing or the network fails', async () => {
    await expect(new OpenRouteServiceProvider({ apiKey: '' }).getDrivingRoute(PLAZA_MAYOR, MIRAFLORES)).rejects.toMatchObject({
      reason: 'sin-clave',
    });
    const failingFetch = vi.fn(async () => {
      throw new Error('offline');
    });
    await expect(
      new OpenRouteServiceProvider({ apiKey: 'free-key', fetchImpl: failingFetch }).getDrivingRoute(PLAZA_MAYOR, MIRAFLORES),
    ).rejects.toMatchObject({ reason: 'red' });
  });

  it('labels travel time as a route-based estimate without live traffic', () => {
    const summary = formatRouteSummary({ distanceMeters: 1200, durationSeconds: 480, source: 'openrouteservice' });
    expect(summary).toContain('1,2 km');
    expect(summary).toContain('~8 min');
    expect(summary).toContain('sin tráfico en vivo');
  });

  it('keeps Google out of the guest flow', () => {
    for (const file of [
      ['apps', 'mobile', 'src', 'features', 'routing', 'route-provider.ts'],
      ['apps', 'mobile', 'src', 'features', 'location', 'customer-location.ts'],
      ['apps', 'mobile', 'src', 'components', 'customer', 'how-to-get-there.tsx'],
    ] as const) {
      expect(read(...file).toLowerCase()).not.toContain('google');
    }
  });

  it('uses OSRM as the temporary default and keeps ORS dormant behind env', () => {
    expect(resolveRoutingProviderKind({})).toBe('osrm');
    expect(resolveRoutingProviderKind({ EXPO_PUBLIC_ROUTING_PROVIDER: 'openrouteservice' })).toBe(
      'openrouteservice',
    );
    expect(createDefaultRouteProvider({ env: {} })).toBeInstanceOf(OsrmRouteProvider);
    expect(
      createDefaultRouteProvider({
        env: { EXPO_PUBLIC_ROUTING_PROVIDER: 'openrouteservice' },
        apiKey: 'free-key',
        fetchImpl: vi.fn(),
      }),
    ).toBeInstanceOf(OpenRouteServiceProvider);
  });

  it('reads driving distance and duration from the OSRM public demo server', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ routes: [{ distance: 9600, duration: 730 }] }), { status: 200 }),
    );
    const estimate = await new OsrmRouteProvider({ fetchImpl }).getDrivingRoute(PLAZA_MAYOR, MIRAFLORES);
    expect(estimate.source).toBe('osrm');
    expect(estimate.distanceMeters).toBe(9600);
    expect(estimate.durationSeconds).toBe(730);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain('router.project-osrm.org/route/v1/driving/');
    expect(url).toContain('overview=false');
    // OSRM expects lng,lat order for both points.
    expect(url).toContain(`${PLAZA_MAYOR.longitude},${PLAZA_MAYOR.latitude};${MIRAFLORES.longitude},${MIRAFLORES.latitude}`);
  });

  it('degrades gracefully when OSRM is unreachable or returns no route', async () => {
    const failingFetch = vi.fn(async () => {
      throw new Error('offline');
    });
    await expect(
      new OsrmRouteProvider({ fetchImpl: failingFetch }).getDrivingRoute(PLAZA_MAYOR, MIRAFLORES),
    ).rejects.toMatchObject({ reason: 'red' });
    const emptyFetch = vi.fn(async () => new Response(JSON.stringify({ routes: [] }), { status: 200 }));
    await expect(
      new OsrmRouteProvider({ fetchImpl: emptyFetch }).getDrivingRoute(PLAZA_MAYOR, MIRAFLORES),
    ).rejects.toMatchObject({ reason: 'sin-ruta' });
  });

  it('falls back to the haversine estimate when the OSRM default fails', async () => {
    const failingFetch = vi.fn(async () => {
      throw new Error('offline');
    });
    const estimate = await getDrivingRouteWithFallback(PLAZA_MAYOR, MIRAFLORES, {
      provider: new OsrmRouteProvider({ fetchImpl: failingFetch }),
    });
    expect(estimate.source).toBe('estimate');
    expect(estimate.distanceMeters).toBeGreaterThan(0);
    expect(estimate.durationSeconds).toBeGreaterThan(0);
    const summary = formatRouteSummary(estimate);
    expect(summary).toContain('sin tráfico en vivo');
  });

  it('keeps a single request per card render without polling', () => {
    const card = read('apps', 'mobile', 'src', 'components', 'customer', 'how-to-get-there.tsx');
    expect(card).not.toContain('setInterval');
    expect(card).toContain('getCustomerLocation');
  });
});

describe('guest distance/time rendering and degradation', () => {
  it('shares one in-flight location request and reuses the cached success', async () => {
    resetCustomerLocationCache();
    let resolvePermission!: (value: { granted: boolean }) => void;
    const requestPermissions = vi.fn(
      () => new Promise<{ granted: boolean }>((resolve) => (resolvePermission = resolve)),
    );
    const getPosition = vi.fn(async () => ({ latitude: -12.0464, longitude: -77.0428 }));

    const first = getCustomerLocation({ requestPermissions, getPosition });
    const second = getCustomerLocation({ requestPermissions, getPosition });
    expect(requestPermissions).toHaveBeenCalledOnce();
    resolvePermission({ granted: true });
    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: 'ok', latitude: -12.0464, longitude: -77.0428 },
      { status: 'ok', latitude: -12.0464, longitude: -77.0428 },
    ]);

    await expect(getCustomerLocation({ requestPermissions, getPosition })).resolves.toMatchObject({ status: 'ok' });
    expect(requestPermissions).toHaveBeenCalledOnce();
    expect(getPosition).toHaveBeenCalledOnce();
  });

  it('does not cache denial or unavailability, so retry can request again', async () => {
    resetCustomerLocationCache();
    const requestPermissions = vi
      .fn<() => Promise<{ granted: boolean }>>()
      .mockResolvedValueOnce({ granted: false })
      .mockResolvedValueOnce({ granted: true });
    const getPosition = vi.fn(async () => ({ latitude: -12.0464, longitude: -77.0428 }));

    await expect(getCustomerLocation({ requestPermissions, getPosition })).resolves.toEqual({ status: 'denegado' });
    await expect(getCustomerLocation({ requestPermissions, getPosition })).resolves.toMatchObject({ status: 'ok' });
    expect(requestPermissions).toHaveBeenCalledTimes(2);
    expect(getPosition).toHaveBeenCalledOnce();
  });

  it('starts the root prefetch once without requesting location in demo mode', () => {
    const root = read('apps', 'mobile', 'src', 'app', '_layout.tsx');
    expect(root).toContain('prefetchCustomerLocation');
    expect(root).toContain("process.env.EXPO_PUBLIC_SKIP_AUTH === '1'");
  });

  it('requests GPS through an injectable boundary with denial paths', async () => {
    await expect(
      requestCustomerLocation({
        requestPermissions: async () => ({ granted: false }) as never,
        getPosition: async () => {
          throw new Error('must not be called when denied');
        },
      }),
    ).resolves.toMatchObject({ status: 'denegado' });
    await expect(
      requestCustomerLocation({
        requestPermissions: async () => ({ granted: true }) as never,
        getPosition: async () => ({ latitude: -12.0464, longitude: -77.0428 }),
      }),
    ).resolves.toMatchObject({ status: 'ok', latitude: -12.0464 });
  });

  it('shows "Cómo llegar" after code/QR entry without blocking ticket creation', () => {
    const card = read('apps', 'mobile', 'src', 'components', 'customer', 'how-to-get-there.tsx');
    const shop = read('apps', 'mobile', 'src', 'app', '(public)', 'shop.tsx');
    const details = read('apps', 'mobile', 'src', 'app', '(public)', 'details.tsx');

    expect(card).toContain('Cómo llegar');
    expect(card).toContain('sin tráfico en vivo');
    expect(card).toMatch(/tu ubicación|ubicación no disponible|sin coordenadas/i);
    expect(shop).toContain('HowToGetThere');
    expect(shop).toContain('Elegir servicio');
    expect(details).toContain('createGuestTicket');
  });
});
