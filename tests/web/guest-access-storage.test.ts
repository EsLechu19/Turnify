import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearGuestAccess, readGuestAccess, writeGuestAccess } from '../../apps/web/src/features/public/guest-access-storage';

function storage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
    removeItem: (key: string) => { entries.delete(key); },
    clear: () => entries.clear(),
  };
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('browser guest rating recovery', () => {
  it('survives a browser close only for the same business until the exact deadline', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-31T00:00:00Z'));
    const session = storage();
    const local = storage();
    vi.stubGlobal('sessionStorage', session);
    vi.stubGlobal('localStorage', local);
    const access = { ticketId: 'private-uuid', visibleCode: 'A-1', capability: 'private-secret' };
    writeGuestAccess('shop', access);
    expect(local.getItem('turnify.public-ticket-session.v1:shop:rating')).toBeNull();
    writeGuestAccess('shop', access, '2026-11-01T00:00:00Z');
    session.clear();
    expect(readGuestAccess('shop')).toEqual(access);
    expect(readGuestAccess('other-shop')).toBeNull();
    vi.setSystemTime(new Date('2026-11-01T00:00:00Z'));
    expect(readGuestAccess('shop')).toBeNull();
    expect(local.getItem('turnify.public-ticket-session.v1:shop:rating')).toBeNull();
  });

  it('does not extend retention on refresh, and clears on rating or restart', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-31T00:00:00Z'));
    vi.stubGlobal('sessionStorage', storage());
    vi.stubGlobal('localStorage', storage());
    const access = { ticketId: 'uuid', visibleCode: 'A', capability: 'secret' };
    writeGuestAccess('shop', access, '2026-11-02T00:00:00Z');
    vi.setSystemTime(new Date('2026-10-31T23:59:59Z'));
    writeGuestAccess('shop', access, '2026-11-02T00:00:00Z');
    vi.setSystemTime(new Date('2026-11-01T00:00:00Z'));
    expect(readGuestAccess('shop')).toBeNull();
    writeGuestAccess('shop', access, '2026-11-01T01:00:00Z');
    clearGuestAccess('shop');
    expect(readGuestAccess('shop')).toBeNull();
  });
});
