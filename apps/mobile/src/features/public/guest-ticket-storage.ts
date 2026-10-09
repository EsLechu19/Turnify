import { secureStorage, type SecureStorageAdapter } from '@/lib/secure-storage';
import type { GuestTicketAccess } from '@/features/queue/public-guest-ticket-api';

/** Storage surface behind guest ticket persistence (injectable for tests). */
export type GuestTicketStore = Pick<SecureStorageAdapter, 'getItem' | 'setItem' | 'removeItem'>;

const STORAGE_KEY = 'turnify.guest-ticket-access.v1';

function isGuestTicketAccess(value: unknown): value is GuestTicketAccess {
  if (!value || typeof value !== 'object') return false;
  const access = value as Record<string, unknown>;
  return (
    typeof access.ticketId === 'string' && access.ticketId.length > 0 &&
    typeof access.visibleCode === 'string' && access.visibleCode.length > 0 &&
    typeof access.capability === 'string' && access.capability.length > 0
  );
}

/**
 * Persists the guest access in the device keychain/keystore (or the test
 * double). The secret never leaves this module except toward storage or the
 * ticket RPCs; callers must not log it.
 */
export async function storeGuestTicketAccess(
  store: GuestTicketStore = secureStorage,
  access: GuestTicketAccess,
): Promise<void> {
  await store.setItem(STORAGE_KEY, JSON.stringify({
    ticketId: access.ticketId,
    visibleCode: access.visibleCode,
    capability: access.capability,
  }));
}

/** Reads back a well-formed stored access, or null when absent or invalid. */
export async function loadStoredGuestTicketAccess(
  store: GuestTicketStore = secureStorage,
): Promise<GuestTicketAccess | null> {
  let raw: string | null = null;
  try {
    raw = await store.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isGuestTicketAccess(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Drops the stored access: terminal tickets, cancellation, sign-out. */
export async function clearStoredGuestTicketAccess(
  store: GuestTicketStore = secureStorage,
): Promise<void> {
  try {
    await store.removeItem(STORAGE_KEY);
  } catch {
    // Clearing is best-effort; a stale row is revalidated on next launch.
  }
}
