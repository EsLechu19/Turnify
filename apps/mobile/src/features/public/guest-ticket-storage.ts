import { secureStorage, type SecureStorageAdapter } from '@/lib/secure-storage';
import type { GuestTicketAccess } from '@/features/queue/public-guest-ticket-api';

/** Storage surface behind guest ticket persistence (injectable for tests). */
export type GuestTicketStore = Pick<SecureStorageAdapter, 'getItem' | 'setItem' | 'removeItem'>;

const STORAGE_KEY = 'turnify.guest-ticket-access.v1';
const pending = new WeakMap<GuestTicketStore, Promise<unknown>>();

function ordered<T>(store: GuestTicketStore, operation: () => Promise<T>): Promise<T> {
  const result = (pending.get(store) ?? Promise.resolve()).then(operation);
  pending.set(store, result.catch(() => undefined));
  return result;
}

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
  await ordered(store, () => store.setItem(STORAGE_KEY, JSON.stringify({
    ticketId: access.ticketId,
    visibleCode: access.visibleCode,
    capability: access.capability,
  })));
}

/** Reads back a well-formed stored access, or null when absent or invalid. */
export async function loadStoredGuestTicketAccess(
  store: GuestTicketStore = secureStorage,
): Promise<GuestTicketAccess | null> {
  return ordered(store, () => readAccess(store));
}

async function readAccess(store: GuestTicketStore): Promise<GuestTicketAccess | null> {
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
  expected?: GuestTicketAccess,
): Promise<void> {
  await ordered(store, async () => {
    try {
      if (expected) {
        const current = await readAccess(store);
        if (current?.ticketId !== expected.ticketId || current.capability !== expected.capability) return;
      }
      await store.removeItem(STORAGE_KEY);
    } catch {
      // Clearing is best-effort; a stale row is revalidated on next launch.
    }
  });
}
