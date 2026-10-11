import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  buildNominatimSearchUrl,
  LIMA_DEFAULT,
  formatShopPoint,
  isValidShopPoint,
  parseGeolocationPosition,
  parseNominatimResults,
  parseShopPoint,
} from '../../apps/web/src/features/settings/shop-location';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('shop location value object (web)', () => {
  it('parses nullable admin coordinates', () => {
    expect(parseShopPoint({ lat: -12.0464, lng: -77.0428 })).toEqual({ lat: -12.0464, lng: -77.0428 });
    expect(parseShopPoint(null)).toBeNull();
    expect(parseShopPoint({ lat: null, lng: null })).toBeNull();
  });

  it('rejects out-of-range points', () => {
    expect(isValidShopPoint({ lat: -91, lng: 0 })).toBe(false);
    expect(isValidShopPoint({ lat: 0, lng: 181 })).toBe(false);
    expect(isValidShopPoint(LIMA_DEFAULT)).toBe(true);
    expect(formatShopPoint({ lat: -12.0464, lng: -77.0428 })).toContain('-12,0464');
  });
});

describe('admin picker persistence contract', () => {
  it('persists shop coordinates through the live company settings', () => {
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(live).toContain('shopLatitude');
    expect(live).toContain('shopLongitude');
    expect(live).toContain('latitud');
    expect(live).toContain('longitud');
    expect(live).toContain('fetchShopSettings');
    expect(live).toContain('saveShopSettings');
  });

  it('saves the selected Nominatim display address in the settings payload', () => {
    const picker = read('apps', 'web', 'src', 'features', 'settings', 'ShopLocationPicker.tsx');
    const page = read('apps', 'web', 'src', 'features', 'settings', 'SettingsPage.tsx');
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(picker).toContain('onAddressChange');
    expect(picker).toContain('suggestion.label');
    expect(page).toContain('shopAddress');
    expect(live).toContain('direccion');
  });

  it('restores the saved address when fetching settings', () => {
    const live = read('apps', 'web', 'src', 'data', 'live.ts');
    const page = read('apps', 'web', 'src', 'features', 'settings', 'SettingsPage.tsx');

    expect(live).toContain('latitud,longitud,direccion');
    expect(live).toContain('shopAddress: row.direccion');
    expect(page).toContain('shopAddress: settings.shopAddress');
  });

  it('keeps the saved address when only coordinates are updated', () => {
    const live = read('apps', 'web', 'src', 'data', 'live.ts');
    const picker = read('apps', 'web', 'src', 'features', 'settings', 'ShopLocationPicker.tsx');

    expect(live).toContain('if (input.shopAddress !== undefined) update.direccion = input.shopAddress;');
    expect(picker).toContain('onChangeRef.current(point);');
    expect(picker).toContain('Quitar punto');
    expect(picker).toContain('solo quita las coordenadas');
  });

  it('replaces the previous address only when the admin selects a new one', () => {
    const picker = read('apps', 'web', 'src', 'features', 'settings', 'ShopLocationPicker.tsx');
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(picker).toContain('onAddressChangeRef.current(suggestion.label)');
    expect(live).toContain('shopAddress?: string | null');
    expect(live).toContain('direccion?: string | null');
  });

  it('renders a Leaflet + OpenStreetMap picker with Spanish copy and no key', () => {
    const picker = read('apps', 'web', 'src', 'features', 'settings', 'ShopLocationPicker.tsx');
    const page = read('apps', 'web', 'src', 'features', 'settings', 'SettingsPage.tsx');

    expect(picker).toContain('leaflet');
    expect(picker).toContain('tile.openstreetmap.org');
    expect(picker).toContain('OpenStreetMap');
    expect(picker).toContain('Ubicación del local');
    expect(picker).toMatch(/Toca el mapa|Quitar punto/);
    expect(picker.toLowerCase()).not.toContain('google');
    expect(page).toContain('ShopLocationPicker');
    expect(page).toContain('Ubicación del local');
  });
});

describe('fast shop location paths (search + current location)', () => {
  it('builds a keyless Nominatim search URL with an encoded query', () => {
    const url = buildNominatimSearchUrl('Av. Arequipa 123, Lima');
    expect(url).toContain('https://nominatim.openstreetmap.org/search');
    expect(url).toContain('format=jsonv2');
    expect(url).toContain(encodeURIComponent('Av. Arequipa 123, Lima'));
    expect(url.toLowerCase()).not.toContain('api_key');
    expect(url.toLowerCase()).not.toContain('apikey');
  });

  it('parses Nominatim results into valid suggestion points', () => {
    const suggestions = parseNominatimResults([
      { place_id: 1, display_name: 'Av. Arequipa 123, Lima, Perú', lat: '-12.0891', lon: '-77.0290' },
      { place_id: 2, display_name: 'Invalid', lat: '250', lon: '500' },
      { place_id: 3, display_name: 'Missing coords' },
    ]);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.label).toContain('Arequipa');
    expect(suggestions[0]?.point).toEqual({ lat: -12.0891, lng: -77.029 });
    expect(isValidShopPoint(suggestions[0]!.point)).toBe(true);
  });

  it('returns no suggestions for garbage payloads without throwing', () => {
    expect(parseNominatimResults(null)).toEqual([]);
    expect(parseNominatimResults({})).toEqual([]);
    expect(parseNominatimResults('nope')).toEqual([]);
  });

  it('parses browser geolocation positions into shop points', () => {
    expect(parseGeolocationPosition({ coords: { latitude: -12.0464, longitude: -77.0428 } })).toEqual({
      lat: -12.0464,
      lng: -77.0428,
    });
    expect(parseGeolocationPosition(null)).toBeNull();
    expect(parseGeolocationPosition({})).toBeNull();
    expect(parseGeolocationPosition({ coords: { latitude: 250, longitude: 0 } })).toBeNull();
  });

  it('offers search + current-location fast paths with graceful denial copy', () => {
    const picker = read('apps', 'web', 'src', 'features', 'settings', 'ShopLocationPicker.tsx');

    expect(picker).toContain('Buscar direcci');
    expect(picker).toContain('nominatim.openstreetmap.org');
    expect(picker).toContain('Usar mi ubicación actual');
    expect(picker).toContain('geolocation');
    expect(picker).toMatch(/permiso|deneg|No pudimos obtener tu ubicaci/);
    // Map stays as visual confirmation with attribution.
    expect(picker).toContain('tile.openstreetmap.org');
    expect(picker).toContain('OpenStreetMap');
  });

  it('adds no paid geocoding vendor to the settings picker path', () => {
    const picker = read('apps', 'web', 'src', 'features', 'settings', 'ShopLocationPicker.tsx');
    const lib = read('apps', 'web', 'src', 'features', 'settings', 'shop-location.ts');
    const page = read('apps', 'web', 'src', 'features', 'settings', 'SettingsPage.tsx');
    const combined = `${picker}\n${lib}\n${page}`.toLowerCase();

    for (const vendor of ['google', 'mapbox', 'maptiler', 'hereapi', 'tomtom', 'api_key', 'apikey']) {
      expect(combined).not.toContain(vendor);
    }
    expect(combined).toContain('nominatim');
  });
});
