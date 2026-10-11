/** Nullable shop coordinates shared by the guest flow (pure, no GPS here). */

export type ShopCoordinates = {
  latitude: number;
  longitude: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isValidLatitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

/** Parses the catalog payload into coordinates; returns null when unset or invalid. Never throws. */
export function parseShopCoordinates(value: unknown): ShopCoordinates | null {
  if (value === null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const latitude = record['latitud'] ?? record['latitude'] ?? null;
  const longitude = record['longitud'] ?? record['longitude'] ?? null;
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;
  return { latitude, longitude };
}

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Straight-line distance in meters between two points. */
export function haversineMeters(from: ShopCoordinates, to: ShopCoordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

/**
 * Fallback driving-time estimate for a straight-line distance.
 * Assumes ~30 km/h urban driving and a 1.3x road circuity factor.
 * Always labelled as an estimate; never presented as live traffic.
 */
export function estimateDrivingSeconds(straightLineMeters: number): number {
  const roadMeters = Math.max(0, straightLineMeters) * 1.3;
  return Math.max(60, Math.round((roadMeters / 1000 / 30) * 3600));
}

function withCommaDecimals(value: number, decimals: number): string {
  return value.toFixed(decimals).replace('.', ',');
}

/** Spanish distance label: "850 m" or "1,2 km". */
export function formatDistanceKm(meters: number): string {
  const safe = Math.max(0, meters);
  if (safe < 1000) return `${Math.round(safe)} m`;
  return `${withCommaDecimals(safe / 1000, 1)} km`;
}

/** Spanish duration label: "~8 min". */
export function formatTravelMinutes(seconds: number): string {
  return `~${Math.max(1, Math.round(Math.max(0, seconds) / 60))} min`;
}
