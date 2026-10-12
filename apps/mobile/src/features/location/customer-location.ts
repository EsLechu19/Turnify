import type * as ExpoLocation from 'expo-location';

/**
 * Phone GPS boundary for the guest "how to get there" card.
 * expo-location is imported lazily so unit tests can inject fakes and the
 * module never pulls native code at import time.
 */

export type CustomerLocationOk = {
  status: 'ok';
  latitude: number;
  longitude: number;
};

export type CustomerLocationUnavailable = {
  status: 'denegado' | 'no-disponible' | 'error';
};

export type CustomerLocationResult = CustomerLocationOk | CustomerLocationUnavailable;

export type CustomerLocationDeps = {
  requestPermissions?: () => Promise<{ granted: boolean }>;
  getPosition?: () => Promise<{ latitude: number; longitude: number }>;
};

let cachedCustomerLocation: CustomerLocationOk | null = null;
let customerLocationRequest: Promise<CustomerLocationResult> | null = null;

async function defaultRequestPermissions(): Promise<{ granted: boolean }> {
  const location = await import('expo-location');
  const permission: ExpoLocation.PermissionResponse = await location.requestForegroundPermissionsAsync();
  return { granted: permission.granted };
}

async function defaultGetPosition(): Promise<{ latitude: number; longitude: number }> {
  const location = await import('expo-location');
  const position = await location.getCurrentPositionAsync({ accuracy: location.Accuracy.Balanced });
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

/**
 * Resolves the customer position once. Every failure mode degrades to a
 * status the UI can render; this function never throws and never blocks
 * ticket creation.
 */
export async function requestCustomerLocation(deps: CustomerLocationDeps = {}): Promise<CustomerLocationResult> {
  const requestPermissions = deps.requestPermissions ?? defaultRequestPermissions;
  const getPosition = deps.getPosition ?? defaultGetPosition;

  let granted = false;
  try {
    granted = (await requestPermissions()).granted;
  } catch {
    return { status: 'error' };
  }
  if (!granted) return { status: 'denegado' };

  try {
    const position = await getPosition();
    if (!Number.isFinite(position.latitude) || !Number.isFinite(position.longitude)) {
      return { status: 'error' };
    }
    return { status: 'ok', latitude: position.latitude, longitude: position.longitude };
  } catch {
    return { status: 'no-disponible' };
  }
}

/**
 * Returns the session-local customer position, sharing both the first request
 * and its successful result between the root prefetch and guest cards.
 * Denials and unavailable positions are intentionally not cached so retry can
 * ask for permission or position again.
 */
export function getCustomerLocation(deps: CustomerLocationDeps = {}): Promise<CustomerLocationResult> {
  if (cachedCustomerLocation) return Promise.resolve(cachedCustomerLocation);
  if (customerLocationRequest) return customerLocationRequest;

  customerLocationRequest = requestCustomerLocation(deps)
    .then((result) => {
      if (result.status === 'ok') cachedCustomerLocation = result;
      return result;
    })
    .finally(() => {
      customerLocationRequest = null;
    });

  return customerLocationRequest;
}

export const prefetchCustomerLocation = getCustomerLocation;

/** Test seam for resetting the memory-only session cache between scenarios. */
export function resetCustomerLocationCache(): void {
  cachedCustomerLocation = null;
  customerLocationRequest = null;
}
