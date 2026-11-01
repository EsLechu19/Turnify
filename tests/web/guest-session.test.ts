import { describe, expect, it, vi } from 'vitest';
import { GuestSessionController, calledSecondsRemaining, canRespondToCall, ratingState } from '../../apps/web/src/features/public/guest-session';
import type { GuestTicketAccess, GuestTicketState } from '../../apps/web/src/features/public/customer-public-api';

const access = (ticketId: string): GuestTicketAccess => ({ ticketId, visibleCode: ticketId, capability: `secret-${ticketId}` });
const state = (status: GuestTicketState['status'], extras: Partial<GuestTicketState> = {}): GuestTicketState => ({
  visibleCode: 'A', status, peopleAhead: 2, waitMinutes: 8, serviceName: null,
  requestedBarberName: null, assignedBarberName: null, calledDeadlineAt: null,
  customerResponse: null, customerResponseAt: null, rating: null, canRate: false, ratingDeadlineAt: null, ...extras,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup(saved: GuestTicketAccess | null = null) {
  let stored = saved;
  const deps = {
    read: vi.fn(() => stored),
    write: vi.fn((value: GuestTicketAccess) => { stored = value; }),
    clear: vi.fn(() => { stored = null; }),
    create: vi.fn(), refresh: vi.fn(), respond: vi.fn(), rate: vi.fn(), cancel: vi.fn(),
  };
  const controller = new GuestSessionController('business', deps);
  return { controller, deps, stored: () => stored };
}

describe('guest session lifecycle', () => {
  it('records the last successful refresh and leaves it unchanged after an offline failure', async () => {
    const { controller, deps } = setup(access('old'));
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-31T12:00:00Z'));
      deps.refresh.mockResolvedValueOnce(state('en_espera')).mockRejectedValueOnce(new Error('offline'));
      expect(controller.getSnapshot().updatedAt).toBeNull();
      await controller.refresh();
      expect(controller.getSnapshot().updatedAt).toBe(Date.now());
      vi.advanceTimersByTime(60_000);
      await controller.refresh();
      expect(controller.getSnapshot()).toMatchObject({ updatedAt: Date.parse('2026-10-31T12:00:00Z'), error: expect.any(String) });
    } finally { vi.useRealTimers(); }
  });
  it('holds a restored access through failure and retry instead of offering another creation', async () => {
    const { controller, deps, stored } = setup(access('old'));
    deps.refresh.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(state('en_espera'));
    await controller.refresh();
    expect(controller.getSnapshot()).toMatchObject({ access: access('old'), ticket: null, error: expect.any(String) });
    await controller.create({ serviceId: 'service', requestedBarberId: null, details: { name: 'Guest' } });
    controller.restart();
    expect(deps.create).not.toHaveBeenCalled();
    expect(stored()).toEqual(access('old'));
    await controller.refresh();
    expect(controller.getSnapshot().ticket?.status).toBe('en_espera');
  });

  it('ignores older overlapping refreshes and does not clear newer access after restart', async () => {
    const { controller, deps } = setup(access('old'));
    const old = deferred<GuestTicketState>();
    deps.refresh.mockReturnValueOnce(old.promise).mockResolvedValueOnce(state('cancelado'));
    const pending = controller.refresh();
    await controller.refresh();
    controller.restart();
    deps.create.mockResolvedValue(access('new'));
    deps.refresh.mockResolvedValueOnce(state('en_espera'));
    await controller.create({ serviceId: 'service', requestedBarberId: null, details: { name: 'Guest' } });
    old.resolve(state('finalizado'));
    await pending;
    expect(controller.getSnapshot()).toMatchObject({ access: access('new'), ticket: { status: 'en_espera' } });
    expect(deps.clear).toHaveBeenCalledTimes(2); // terminal resolution and explicit restart
  });

  it('invalidates a refresh begun before cancellation', async () => {
    const { controller, deps } = setup(access('old'));
    const old = deferred<GuestTicketState>();
    deps.refresh.mockReturnValueOnce(old.promise).mockResolvedValueOnce(state('en_espera'));
    const pending = controller.refresh();
    await controller.refresh();
    deps.cancel.mockResolvedValue(undefined);
    await controller.cancel();
    old.resolve(state('llamado'));
    await pending;
    expect(controller.getSnapshot().ticket?.status).toBe('cancelado');
    expect(controller.getSnapshot().access).toEqual(access('old'));
  });

  it('does not fabricate a ticket on creation; a failed refresh retains the saved access', async () => {
    const { controller, deps, stored } = setup();
    deps.create.mockResolvedValue(access('new'));
    deps.refresh.mockRejectedValue(new Error('offline'));
    await controller.create({ serviceId: 'service', requestedBarberId: null, details: { name: 'Guest' } });
    expect(stored()).toEqual(access('new'));
    expect(controller.getSnapshot()).toMatchObject({ ticket: null, error: expect.any(String), busy: false });
    expect(deps.create).toHaveBeenCalledTimes(1);
  });

  it('allows only one pending creation and does not publish a second ticket before status arrives', async () => {
    const { controller, deps } = setup();
    const created = deferred<GuestTicketAccess>();
    const retrieved = deferred<GuestTicketState>();
    deps.create.mockReturnValue(created.promise);
    deps.refresh.mockReturnValue(retrieved.promise);
    const pending = controller.create({ serviceId: 'service', requestedBarberId: null, details: { name: 'Guest' } });
    await controller.create({ serviceId: 'service', requestedBarberId: null, details: { name: 'Guest' } });
    expect(deps.create).toHaveBeenCalledTimes(1);
    created.resolve(access('new'));
    await vi.waitFor(() => expect(deps.refresh).toHaveBeenCalledTimes(1));
    expect(controller.getSnapshot()).toMatchObject({ access: access('new'), ticket: null });
    retrieved.resolve(state('notificado'));
    await pending;
    expect(controller.getSnapshot().ticket?.status).toBe('notificado');
  });

  it('does not overwrite a confirmed response or rating when the following refresh fails', async () => {
    const { controller, deps } = setup(access('old'));
    deps.refresh.mockResolvedValueOnce(state('llamado', { calledDeadlineAt: new Date(Date.now() + 60_000).toISOString() }));
    await controller.refresh();
    deps.respond.mockResolvedValue(undefined);
    deps.refresh.mockRejectedValueOnce(new Error('offline'));
    await controller.respond('presente');
    expect(controller.getSnapshot()).toMatchObject({ ticket: { customerResponse: 'presente' }, error: expect.stringContaining('registró') });
    deps.refresh.mockResolvedValueOnce(state('finalizado', { canRate: true, ratingDeadlineAt: new Date(Date.now() + 60_000).toISOString() }));
    await controller.refresh();
    deps.rate.mockResolvedValue(undefined);
    deps.refresh.mockRejectedValueOnce(new Error('offline'));
    await controller.rate(4);
    expect(controller.getSnapshot()).toMatchObject({ ticket: { rating: 4 }, error: expect.stringContaining('registró') });
  });

  it('keeps only eligible finished access, including across a new controller, then clears after voting', async () => {
    const { controller, deps, stored } = setup(access('old'));
    deps.refresh.mockResolvedValueOnce(state('finalizado', { canRate: true, ratingDeadlineAt: new Date(Date.now() + 60_000).toISOString() }));
    await controller.refresh();
    expect(stored()).toEqual(access('old'));
    expect(deps.write).toHaveBeenCalled();
    const reopened = new GuestSessionController('business', deps);
    expect(reopened.getSnapshot().access).toEqual(access('old'));
    deps.refresh.mockResolvedValueOnce(state('finalizado', { rating: 5 }));
    await reopened.refresh();
    expect(stored()).toBeNull();
  });

  it('rejects rating at the exact deadline and missing or invalid timestamps', async () => {
    const { controller, deps } = setup(access('old'));
    const deadline = '2026-10-31T12:00:00Z';
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(deadline));
      deps.refresh.mockResolvedValueOnce(state('finalizado', { canRate: true, ratingDeadlineAt: deadline }));
      await controller.refresh();
      await controller.rate(4);
      expect(deps.rate).not.toHaveBeenCalled();
      expect(deps.clear).toHaveBeenCalled();
      deps.refresh.mockResolvedValueOnce(state('finalizado', { canRate: true, ratingDeadlineAt: 'invalid' }));
      await controller.refresh();
      await controller.rate(4);
      expect(deps.rate).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });

  it('recovers from Strict Mode effect cleanup and setup without accepting stale results', async () => {
    const { controller, deps } = setup(access('old'));
    const old = deferred<GuestTicketState>();
    deps.refresh.mockReturnValueOnce(old.promise).mockResolvedValueOnce(state('en_espera'));
    const unsubscribe = controller.subscribe(() => undefined);
    const pending = controller.refresh();
    unsubscribe();
    controller.dispose();
    controller.subscribe(() => undefined);
    await controller.refresh();
    old.resolve(state('finalizado'));
    await pending;
    expect(controller.getSnapshot().ticket?.status).toBe('en_espera');
  });

  it('does not publish or persist late results after disposal', async () => {
    const { controller, deps } = setup();
    const created = deferred<GuestTicketAccess>();
    deps.create.mockReturnValue(created.promise);
    const pending = controller.create({ serviceId: 'service', requestedBarberId: null, details: { name: 'Guest' } });
    controller.dispose();
    created.resolve(access('late'));
    await pending;
    expect(deps.write).not.toHaveBeenCalled();
    expect(controller.getSnapshot().access).toBeNull();
  });

  it('requires a successful status refresh before repeating an uncertain response', async () => {
    const { controller, deps } = setup(access('old'));
    const called = state('llamado', { calledDeadlineAt: new Date(Date.now() + 60_000).toISOString() });
    deps.refresh.mockResolvedValue(called);
    await controller.refresh();
    deps.respond.mockRejectedValueOnce(new Error('timeout'));
    await controller.respond('presente');
    expect(controller.getSnapshot().needsRefresh).toBe(true);
    await controller.respond('presente');
    expect(deps.respond).toHaveBeenCalledTimes(1);
    deps.refresh.mockResolvedValueOnce(state('llamado', { ...called, customerResponse: 'presente' }));
    await controller.refresh();
    expect(controller.getSnapshot()).toMatchObject({ needsRefresh: false, ticket: { customerResponse: 'presente' } });
    await controller.respond('presente');
    expect(deps.respond).toHaveBeenCalledTimes(1);
  });
});

describe('effective called deadline', () => {
  it('uses server timestamp, ticks to zero and refuses missing or expired deadlines', () => {
    const now = Date.parse('2026-10-31T12:00:00Z');
    const called = state('llamado', { calledDeadlineAt: '2026-10-31T12:00:02Z' });
    expect(calledSecondsRemaining(called, now)).toBe(2);
    expect(canRespondToCall(called, now)).toBe(true);
    expect(canRespondToCall(called, now + 2000)).toBe(false);
    expect(canRespondToCall(state('llamado'), now)).toBe(false);
    expect(calledSecondsRemaining(state('en_atencion', { calledDeadlineAt: called.calledDeadlineAt }), now)).toBeNull();
  });
});

describe('rating projection', () => {
  it('treats server eligibility as authoritative and refuses missing timestamps', () => {
    const deadline = Date.parse('2026-11-01T00:00:00Z');
    const eligible = state('finalizado', { canRate: true, ratingDeadlineAt: new Date(deadline).toISOString() });
    expect(ratingState(eligible, deadline - 1)).toBe('pending');
    expect(ratingState(eligible, deadline)).toBe('expired');
    expect(ratingState({ ...eligible, canRate: false }, deadline - 1)).toBe('expired');
    expect(ratingState({ ...eligible, rating: 5 }, deadline - 1)).toBe('rated');
    expect(ratingState({ ...eligible, ratingDeadlineAt: null }, deadline - 1)).toBe('unavailable');
  });
});
