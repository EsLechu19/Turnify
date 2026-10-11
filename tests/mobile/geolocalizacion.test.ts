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
import { requestCustomerLocation } from '../../apps/mobile/src/features/location/customer-location';
import {
  HaversineRouteProvider,
  OpenRouteServiceProvider,
  formatRouteSummary,
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
});

describe('guest distance/time rendering and degradation', () => {
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
