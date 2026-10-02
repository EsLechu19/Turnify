import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  useMemo: <T>(factory: () => T, dependencies: readonly unknown[]) => cached(factory, dependencies),
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

    const initial = render();
    const discoveryAction = initial.beginDiscovery;
    discoveryAction('TURNIFY', { name: 'Barbería Central' });
    const identifiedShop = render();

    expect(identifiedShop.draft?.catalog.name).toBe('Barbería Central');
    expect(identifiedShop.beginDiscovery).toBe(discoveryAction);
  });
});
