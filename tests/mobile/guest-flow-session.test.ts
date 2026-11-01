import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearStoredGuestTicketAccess, loadStoredGuestTicketAccess, storeGuestTicketAccess } from '../../apps/mobile/src/features/public/guest-ticket-storage';
import { getGuestTicketState } from '../../apps/mobile/src/features/queue/public-guest-ticket-api';

vi.mock('../../apps/mobile/src/features/public/guest-ticket-storage', () => ({
  loadStoredGuestTicketAccess: vi.fn(() => Promise.resolve(null)),
  storeGuestTicketAccess: vi.fn(() => Promise.resolve()),
  clearStoredGuestTicketAccess: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../apps/mobile/src/features/queue/public-guest-ticket-api', () => ({ getGuestTicketState: vi.fn() }));

type HookSlot = unknown | { deps: readonly unknown[]; value: unknown };

const slots: HookSlot[] = [];
let cursor = 0;

function dependenciesMatch(left: readonly unknown[], right: readonly unknown[]) {
  return left.length === right.length && left.every((dependency, index) => Object.is(dependency, right[index]));
}

function cached<T>(factory: () => T, dependencies: readonly unknown[]) {
  const index = cursor++;
  const current = slots[index] as { deps: readonly unknown[]; value: T } | undefined;
  if (current && dependenciesMatch(current.deps, dependencies)) return current.value;
  const value = factory();
  slots[index] = { deps: dependencies, value };
  return value;
}

vi.mock('react', () => ({
  createContext: () => ({ Provider: 'GuestFlowProvider' }),
  useCallback: <T>(callback: T, dependencies: readonly unknown[]) => cached(() => callback, dependencies),
  useContext: () => undefined,
  useEffect: (effect: () => void, dependencies: readonly unknown[]) => cached(() => { effect(); }, dependencies),
  useMemo: <T>(factory: () => T, dependencies: readonly unknown[]) => cached(factory, dependencies),
  useRef: <T,>(value: T) => cached(() => ({ current: value }), []),
  useState: <T,>(initialValue: T) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initialValue;
    return [slots[index] as T, (next: T | ((current: T) => T)) => {
      slots[index] = typeof next === 'function' ? (next as (current: T) => T)(slots[index] as T) : next;
    }] as const;
  },
}));

describe('GuestFlowProvider discovery actions', () => {
  beforeEach(() => {
    slots.length = 0;
    cursor = 0;
    vi.mocked(loadStoredGuestTicketAccess).mockReset().mockResolvedValue(null);
    vi.mocked(getGuestTicketState).mockReset();
    vi.mocked(storeGuestTicketAccess).mockClear();
    vi.mocked(clearStoredGuestTicketAccess).mockClear();
  });

  it('keeps discovery settled after a successful catalog lookup', async () => {
    const { GuestFlowProvider } = await import('../../apps/mobile/src/features/public/guest-flow-session');
    const render = () => {
      cursor = 0;
      return (GuestFlowProvider({ children: null }) as unknown as { props: { value: {
        draft: { catalog: { name: string } } | null;
        beginDiscovery(companyCode: string, catalog: { name: string }): void;
      } } }).props.value;
    };

    render();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const initial = render();
    const discoveryAction = initial.beginDiscovery;
    discoveryAction('TURNIFY', { name: 'Barbería Central' });
    const identifiedShop = render();

    expect(identifiedShop.draft?.catalog.name).toBe('Barbería Central');
    expect(identifiedShop.beginDiscovery).toBe(discoveryAction);
  });

  it('preserves active ticket access when discovery is attempted after home navigation', async () => {
    const { GuestFlowProvider } = await import('../../apps/mobile/src/features/public/guest-flow-session');
    const render = () => {
      cursor = 0;
      return (GuestFlowProvider({ children: null }) as unknown as { props: { value: {
        hasActiveTicketAccess: boolean;
        ticketAccess: { ticketId: string; capability: string } | null;
        setTicketAccess(access: { ticketId: string; visibleCode: string; capability: string }): void;
        beginDiscovery(companyCode: string, catalog: { name: string }): boolean;
        endGuestTicketSession(): void;
      } } }).props.value;
    };
    render();
    await new Promise((resolve) => setTimeout(resolve, 0));
    render().setTicketAccess({ ticketId: 'ticket-1', visibleCode: 'A-1', capability: 'private-capability' });
    const active = render();

    expect(active.hasActiveTicketAccess).toBe(true);
    expect(active.beginDiscovery('OTHER', { name: 'Other shop' })).toBe(false);
    expect(render().ticketAccess?.ticketId).toBe('ticket-1');

    active.endGuestTicketSession();
    expect(render().hasActiveTicketAccess).toBe(false);
  });

  it('does not let a slow restore replace a ticket created while validation was pending', async () => {
    const stored = { ticketId: 'old', visibleCode: 'A-1', capability: 'old-private' };
    const newer = { ticketId: 'new', visibleCode: 'A-2', capability: 'new-private' };
    let finish!: (state: { status: 'en_espera' }) => void;
    vi.mocked(loadStoredGuestTicketAccess).mockResolvedValue(stored);
    vi.mocked(getGuestTicketState).mockImplementation(() => new Promise((resolve) => { finish = resolve; }) as ReturnType<typeof getGuestTicketState>);
    const { GuestFlowProvider } = await import('../../apps/mobile/src/features/public/guest-flow-session');
    const render = () => {
      cursor = 0;
      return (GuestFlowProvider({ children: null }) as unknown as { props: { value: {
        ticketAccess: typeof stored | null;
        setTicketAccess(access: typeof stored): void;
      } } }).props.value;
    };
    render();
    await new Promise((resolve) => setTimeout(resolve, 0));
    render().setTicketAccess(newer);
    finish({ status: 'en_espera' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(render().ticketAccess).toEqual(newer);
  });

  it('unblocks discovery when the guest ends a session during a pending restore', async () => {
    const saved = { ticketId: 'old', visibleCode: 'A-1', capability: 'old-private' };
    let finish!: (state: { status: 'en_espera' }) => void;
    vi.mocked(loadStoredGuestTicketAccess).mockResolvedValue(saved);
    vi.mocked(getGuestTicketState).mockImplementation(() => new Promise((resolve) => { finish = resolve; }) as ReturnType<typeof getGuestTicketState>);
    const { GuestFlowProvider } = await import('../../apps/mobile/src/features/public/guest-flow-session');
    const render = () => {
      cursor = 0;
      return (GuestFlowProvider({ children: null }) as unknown as { props: { value: {
        ticketAccess: typeof saved | null;
        hasActiveTicketAccess: boolean;
        beginDiscovery(code: string, catalog: never): boolean;
        endGuestTicketSession(): void;
      } } }).props.value;
    };
    render();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(render().hasActiveTicketAccess).toBe(true);
    render().endGuestTicketSession();
    expect(render().hasActiveTicketAccess).toBe(false);
    expect(render().beginDiscovery('new-shop', {} as never)).toBe(true);
    finish({ status: 'en_espera' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(render().ticketAccess).toBeNull();
    expect(clearStoredGuestTicketAccess).toHaveBeenCalledWith(undefined, saved);
  });

  it('restores finished unrated access, but not rated, cancelled or absent tickets', async () => {
    const saved = { ticketId: 'finished', visibleCode: 'A', capability: 'private' };
    const { GuestFlowProvider } = await import('../../apps/mobile/src/features/public/guest-flow-session');
    for (const status of ['finalizado', 'cancelado', 'ausente'] as const) {
      slots.length = 0;
      vi.mocked(loadStoredGuestTicketAccess).mockResolvedValue(saved);
      vi.mocked(getGuestTicketState).mockResolvedValue({ status, puntuacion: null, canRate: true, ratingDeadlineAt: new Date(Date.now() + 60_000).toISOString() } as Awaited<ReturnType<typeof getGuestTicketState>>);
      const render = () => { cursor = 0; return (GuestFlowProvider({ children: null }) as unknown as { props: { value: { ticketAccess: typeof saved | null } } }).props.value; };
      render();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(render().ticketAccess).toEqual(status === 'finalizado' ? saved : null);
    }
    slots.length = 0;
    vi.mocked(getGuestTicketState).mockResolvedValue({ status: 'finalizado', puntuacion: 4, canRate: false, ratingDeadlineAt: new Date(Date.now() + 60_000).toISOString() } as Awaited<ReturnType<typeof getGuestTicketState>>);
    cursor = 0;
    GuestFlowProvider({ children: null });
    await new Promise((resolve) => setTimeout(resolve, 0));
    cursor = 0;
    expect((GuestFlowProvider({ children: null }) as unknown as { props: { value: { ticketAccess: unknown } } }).props.value.ticketAccess).toBeNull();
  });

  it('retains stored access when the restore RPC fails so discovery cannot create a second ticket', async () => {
    const saved = { ticketId: 'old', visibleCode: 'A', capability: 'private' };
    vi.mocked(loadStoredGuestTicketAccess).mockResolvedValue(saved);
    vi.mocked(getGuestTicketState).mockRejectedValue(new Error('offline'));
    const { GuestFlowProvider } = await import('../../apps/mobile/src/features/public/guest-flow-session');
    const render = () => { cursor = 0; return (GuestFlowProvider({ children: null }) as unknown as { props: { value: { ticketAccess: typeof saved | null; beginDiscovery: (code: string, catalog: never) => boolean } } }).props.value; };
    render();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(render().ticketAccess).toEqual(saved);
    expect(render().beginDiscovery('shop', {} as never)).toBe(false);
  });
});
