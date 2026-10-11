/** Nullable shop point managed by the admin map picker (pure, no Leaflet here). */

export type ShopPoint = {
  lat: number;
  lng: number;
};

/** Map fallback when the shop has no point yet (Plaza Mayor, Lima). */
export const LIMA_DEFAULT: ShopPoint = { lat: -12.0464, lng: -77.0428 };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isValidShopPoint(point: ShopPoint): boolean {
  return (
    isFiniteNumber(point.lat) &&
    isFiniteNumber(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

/** Parses admin input or a Supabase row into a point; null when unset or invalid. Never throws. */
export function parseShopPoint(value: unknown): ShopPoint | null {
  if (value === null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const lat = record['lat'] ?? record['latitud'] ?? record['latitude'] ?? null;
  const lng = record['lng'] ?? record['longitud'] ?? record['longitude'] ?? null;
  const point = { lat, lng } as ShopPoint;
  return isValidShopPoint(point) ? point : null;
}

function withCommaDecimals(value: number, decimals: number): string {
  return value.toFixed(decimals).replace('.', ',');
}

/** Spanish label for the current point, e.g. "-12,0464 · -77,0428". */
export function formatShopPoint(point: ShopPoint): string {
  return `${withCommaDecimals(point.lat, 4)} · ${withCommaDecimals(point.lng, 4)}`;
}
