import { describe, expect, it } from 'vitest';
import { createAuthStorage } from '../../apps/web/src/data/authStorage';

const PANEL_SESSION = 'turnify.panel.session';
const SUPABASE_SESSION = 'sb-turnify-auth-token';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
    values,
  };
}

function createHarness(managedKeys = [SUPABASE_SESSION, PANEL_SESSION]) {
  const localStorage = memoryStorage();
  const sessionStorage = memoryStorage();
  const storage = createAuthStorage({ localStorage, sessionStorage, managedKeys });
  return { localStorage, sessionStorage, storage };
}

describe('auth persistence storage', () => {
  it('prefers the persistent preference over a stale tab preference', () => {
    const localStorage = memoryStorage();
    const sessionStorage = memoryStorage();
    localStorage.setItem('turnify.auth.persistence', 'persistent');
    sessionStorage.setItem('turnify.auth.persistence', 'session');
    const storage = createAuthStorage({ localStorage, sessionStorage });

    expect(storage.getPersistenceMode()).toBe('persistent');
  });

  it('defaults to persistent storage and writes Supabase and panel sessions there', () => {
    const { localStorage, sessionStorage, storage } = createHarness();

    expect(storage.getPersistenceMode()).toBe('persistent');
    storage.setItem(SUPABASE_SESSION, 'supabase-token');
    storage.setItem(PANEL_SESSION, 'panel-session');

    expect(localStorage.getItem(SUPABASE_SESSION)).toBe('supabase-token');
    expect(localStorage.getItem(PANEL_SESSION)).toBe('panel-session');
    expect(sessionStorage.length).toBe(0);
  });

  it('migrates both managed sessions and removes the old copy when persistence changes', () => {
    const { localStorage, sessionStorage, storage } = createHarness();
    storage.setItem(SUPABASE_SESSION, 'supabase-token');
    storage.setItem(PANEL_SESSION, 'panel-session');

    expect(storage.setPersistenceMode('session')).toBe(true);
    expect(storage.getPersistenceMode()).toBe('session');
    expect(sessionStorage.getItem(SUPABASE_SESSION)).toBe('supabase-token');
    expect(sessionStorage.getItem(PANEL_SESSION)).toBe('panel-session');
    expect(localStorage.getItem(SUPABASE_SESSION)).toBeNull();
    expect(localStorage.getItem(PANEL_SESSION)).toBeNull();

    expect(storage.setPersistenceMode('persistent')).toBe(true);
    expect(localStorage.getItem(SUPABASE_SESSION)).toBe('supabase-token');
    expect(localStorage.getItem(PANEL_SESSION)).toBe('panel-session');
    expect(sessionStorage.getItem(SUPABASE_SESSION)).toBeNull();
    expect(sessionStorage.getItem(PANEL_SESSION)).toBeNull();
  });

  it('restores a legacy session from the alternate store and migrates it safely', () => {
    const { localStorage, sessionStorage, storage } = createHarness([SUPABASE_SESSION]);
    sessionStorage.setItem(SUPABASE_SESSION, 'legacy-token');

    expect(storage.getItem(SUPABASE_SESSION)).toBe('legacy-token');
    expect(localStorage.getItem(SUPABASE_SESSION)).toBe('legacy-token');
    expect(sessionStorage.getItem(SUPABASE_SESSION)).toBeNull();
  });

  it('removes the key from both stores on sign-out cleanup', () => {
    const { localStorage, sessionStorage, storage } = createHarness();
    localStorage.setItem(SUPABASE_SESSION, 'persistent-token');
    sessionStorage.setItem(SUPABASE_SESSION, 'stale-token');
    localStorage.setItem(PANEL_SESSION, 'panel-session');
    sessionStorage.setItem(PANEL_SESSION, 'stale-panel');

    storage.clearManagedSessions();

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('does not throw when browser storage is unavailable', () => {
    const unavailable = {
      getItem: () => { throw new Error('storage blocked'); },
      setItem: () => { throw new Error('storage blocked'); },
      removeItem: () => { throw new Error('storage blocked'); },
      clear: () => { throw new Error('storage blocked'); },
      key: () => null,
      get length() { throw new Error('storage blocked'); },
    };
    const storage = createAuthStorage({
      localStorage: unavailable,
      sessionStorage: unavailable,
      managedKeys: [SUPABASE_SESSION, PANEL_SESSION],
    });

    expect(() => storage.setItem(PANEL_SESSION, 'volatile-session')).not.toThrow();
    expect(storage.getItem(PANEL_SESSION)).toBe('volatile-session');
    expect(() => storage.clearManagedSessions()).not.toThrow();
  });
});
