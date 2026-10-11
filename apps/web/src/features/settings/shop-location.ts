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

/** One address-search suggestion: display label plus the point it resolves to. */
export type AddressSuggestion = {
  id: string;
  label: string;
  point: ShopPoint;
};

/** Free Nominatim/OSM geocoding endpoint. No key, no paid vendor. */
export const NOMINATIM_SEARCH_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

/** Builds a keyless Nominatim search URL for the given query. Never throws. */
export function buildNominatimSearchUrl(query: string, limit = 5): string {
  const clamped = Math.min(Math.max(Math.trunc(limit), 1), 10);
  return `${NOMINATIM_SEARCH_ENDPOINT}?format=jsonv2&limit=${clamped}&q=${encodeURIComponent(query.trim())}`;
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parses a Nominatim `search` payload into suggestions, dropping entries
 * without a valid point. Accepts unknown input; never throws.
 */
export function parseNominatimResults(data: unknown): AddressSuggestion[] {
  if (!Array.isArray(data)) return [];
  const suggestions: AddressSuggestion[] = [];
  for (const item of data) {
    if (item === null || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const label = record['display_name'];
    if (typeof label !== 'string' || label.trim() === '') continue;
    const lat = toFiniteNumber(record['lat']);
    const lng = toFiniteNumber(record['lon'] ?? record['lng']);
    if (lat === null || lng === null) continue;
    const point: ShopPoint = { lat, lng };
    if (!isValidShopPoint(point)) continue;
    const rawId = record['place_id'] ?? record['osm_id'] ?? `${lat},${lng}`;
    suggestions.push({ id: String(rawId), label, point });
  }
  return suggestions;
}

/**
 * Parses a browser `GeolocationPosition` into a point; null when missing or
 * invalid (denied, unavailable, or out of range). Never throws.
 */
export function parseGeolocationPosition(value: unknown): ShopPoint | null {
  if (value === null || typeof value !== 'object') return null;
  const coords = (value as { coords?: unknown }).coords;
  if (coords === null || typeof coords !== 'object') return null;
  const record = coords as Record<string, unknown>;
  const point = { lat: record['latitude'], lng: record['longitude'] } as ShopPoint;
  return isValidShopPoint(point) ? point : null;
}
