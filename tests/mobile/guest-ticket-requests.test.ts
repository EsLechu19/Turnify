import { describe, expect, it, vi } from 'vitest';
import { GuestTicketRequests } from '../../apps/mobile/src/features/public/guest-ticket-requests';

const access = { ticketId: 'one', capability: 'private', visibleCode: 'A1' };
const second = { ticketId: 'two', capability: 'other', visibleCode: 'A2' };
const ticket = (status: 'en_espera' | 'llamado') => ({ status }) as Parameters<Parameters<GuestTicketRequests['refresh']>[2]>[0];
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('mobile guest status ordering', () => {
  it('ignores an older status after a newer poll completes', async () => {
    const requests = new GuestTicketRequests();
    requests.setIdentity(access); requests.setActive(true);
    const older = deferred<ReturnType<typeof ticket>>();
    const newer = deferred<ReturnType<typeof ticket>>();
    const apply = vi.fn(); const fail = vi.fn(); const finish = vi.fn();
    const first = requests.refresh(access, () => older.promise, apply, fail, finish);
    const latest = requests.refresh(access, () => newer.promise, apply, fail, finish);
    newer.resolve(ticket('llamado')); await latest;
    older.resolve(ticket('en_espera')); await first;
    expect(apply).toHaveBeenCalledExactlyOnceWith(ticket('llamado'));
    expect(finish).toHaveBeenCalledTimes(1);
  });

  it('drops failures and terminal results after blur, action or identity replacement', async () => {
    const requests = new GuestTicketRequests();
    requests.setIdentity(access); requests.setActive(true);
    const old = deferred<ReturnType<typeof ticket>>();
    const apply = vi.fn(); const fail = vi.fn(); const finish = vi.fn();
    const operation = requests.refresh(access, () => old.promise, apply, fail, finish);
    requests.invalidate(); old.resolve(ticket('llamado')); await operation;
    const blurred = deferred<ReturnType<typeof ticket>>();
    const blur = requests.refresh(access, () => blurred.promise, apply, fail, finish);
    requests.setActive(false); blurred.reject(new Error('offline')); await blur;
    requests.setIdentity(second); requests.setActive(true);
    expect(await requests.refresh(access, () => Promise.resolve(ticket('llamado')), apply, fail, finish)).toBe(false);
    expect(apply).not.toHaveBeenCalled(); expect(fail).not.toHaveBeenCalled(); expect(finish).not.toHaveBeenCalled();
  });
});
