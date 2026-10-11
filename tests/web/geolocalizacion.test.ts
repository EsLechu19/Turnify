import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  LIMA_DEFAULT,
  formatShopPoint,
  isValidShopPoint,
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
