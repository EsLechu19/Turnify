import { describe, expect, it } from 'vitest';

import {
  clearStoredGuestTicketAccess,
  loadStoredGuestTicketAccess,
  storeGuestTicketAccess,
  type GuestTicketStore,
} from '../../apps/mobile/src/features/public/guest-ticket-storage';

function memoryStore(initial: string | null = null): GuestTicketStore & { raw(): string | null } {
  let value = initial;
  return {
    raw: () => value,
    getItem: async () => value,
    setItem: async (_key: string, next: string) => { value = next; },
    removeItem: async () => { value = null; },
  };
}

const ACCESS = { ticketId: 'ticket-1', visibleCode: 'A-001', capability: 'secret-capability' };

describe('guest ticket storage', () => {
  it('round-trips the guest access through the device store', async () => {
    const store = memoryStore();

    await storeGuestTicketAccess(store, ACCESS);
    expect(store.raw()).toContain('ticket-1');
    await expect(loadStoredGuestTicketAccess(store)).resolves.toEqual(ACCESS);
  });

  it('returns null when nothing valid was stored', async () => {
    await expect(loadStoredGuestTicketAccess(memoryStore())).resolves.toBeNull();
    await expect(loadStoredGuestTicketAccess(memoryStore('not-json'))).resolves.toBeNull();
    await expect(loadStoredGuestTicketAccess(memoryStore('{"ticketId":"x"}'))).resolves.toBeNull();
  });

  it('clears the stored access on session end', async () => {
    const store = memoryStore();

    await storeGuestTicketAccess(store, ACCESS);
    await clearStoredGuestTicketAccess(store);
    await expect(loadStoredGuestTicketAccess(store)).resolves.toBeNull();
  });
});
