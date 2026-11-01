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

  it('serializes a delayed write and clear, and will not delete a replacement session', async () => {
    let value: string | null = null;
    let release!: () => void;
    const delayed = new Promise<void>((resolve) => { release = resolve; });
    const store: GuestTicketStore = {
      getItem: async () => value,
      setItem: async (_key, next) => { await delayed; value = next; },
      removeItem: async () => { value = null; },
    };
    const write = storeGuestTicketAccess(store, ACCESS);
    const clear = clearStoredGuestTicketAccess(store, ACCESS);
    release(); await Promise.all([write, clear]);
    expect(value).toBeNull();

    const newer = { ...ACCESS, ticketId: 'ticket-2', capability: 'new-secret' };
    await storeGuestTicketAccess(store, newer);
    await clearStoredGuestTicketAccess(store, ACCESS);
    await expect(loadStoredGuestTicketAccess(store)).resolves.toEqual(newer);
  });

  it('reads after a pending device write rather than observing the old value', async () => {
    let value: string | null = null;
    let release!: () => void;
    const pendingWrite = new Promise<void>((resolve) => { release = resolve; });
    const store: GuestTicketStore = {
      getItem: async () => value,
      setItem: async (_key, next) => { await pendingWrite; value = next; },
      removeItem: async () => { value = null; },
    };
    const write = storeGuestTicketAccess(store, ACCESS);
    const read = loadStoredGuestTicketAccess(store);
    release();
    await write;
    await expect(read).resolves.toEqual(ACCESS);
  });

  it('retains a finished access strictly before deadline, then deletes it at the boundary', async () => {
    const store = memoryStore();
    const deadline = Date.now() + 1000;
    await storeGuestTicketAccess(store, ACCESS, new Date(deadline).toISOString());
    await expect(loadStoredGuestTicketAccess(store)).resolves.toEqual(ACCESS);
    const original = Date.now;
    Date.now = () => deadline;
    try {
      await expect(loadStoredGuestTicketAccess(store)).resolves.toBeNull();
      expect(store.raw()).toBeNull();
    } finally { Date.now = original; }
  });

  it('orders a finished write before a clear without deleting a newer ticket', async () => {
    const store = memoryStore();
    const finished = storeGuestTicketAccess(store, ACCESS, new Date(Date.now() + 1000).toISOString());
    const clear = clearStoredGuestTicketAccess(store, ACCESS);
    const next = { ...ACCESS, ticketId: 'new', capability: 'new-secret' };
    const replacement = storeGuestTicketAccess(store, next);
    await Promise.all([finished, clear, replacement]);
    await expect(loadStoredGuestTicketAccess(store)).resolves.toEqual(next);
  });
});
