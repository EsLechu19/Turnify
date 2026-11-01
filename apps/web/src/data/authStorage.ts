export type AuthPersistenceMode = 'persistent' | 'session';

export interface AuthStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface AuthStorageOptions {
  localStorage?: AuthStorageLike;
  sessionStorage?: AuthStorageLike;
  managedKeys?: string[];
}

const PERSISTENCE_KEY = 'turnify.auth.persistence';
export const PANEL_SESSION_KEY = 'turnify.panel.session';

function readBrowserStorage(kind: 'localStorage' | 'sessionStorage'): AuthStorageLike | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window[kind];
  } catch {
    return undefined;
  }
}

export function createAuthStorage(options: AuthStorageOptions = {}) {
  const memory = new Map<string, string>();
  let managedKeys = options.managedKeys ?? [];
  let persistenceMode: AuthPersistenceMode = 'persistent';

  const local = () => options.localStorage ?? readBrowserStorage('localStorage');
  const session = () => options.sessionStorage ?? readBrowserStorage('sessionStorage');
  const storeFor = (mode: AuthPersistenceMode) => mode === 'persistent' ? local() : session();
  const alternateFor = (mode: AuthPersistenceMode) => mode === 'persistent' ? session() : local();

  function safeGet(store: AuthStorageLike | undefined, key: string): string | null {
    try {
      return store?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  function safeSet(store: AuthStorageLike | undefined, key: string, value: string): boolean {
    try {
      if (!store) return false;
      store.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function safeRemove(store: AuthStorageLike | undefined, key: string): void {
    try {
      store?.removeItem(key);
    } catch {
      // Browser storage can be disabled or unavailable in private contexts.
    }
  }

  function readSavedMode(): AuthPersistenceMode {
    const localMode = safeGet(local(), PERSISTENCE_KEY);
    if (localMode === 'persistent') return 'persistent';
    if (localMode === 'session') return 'session';
    if (safeGet(session(), PERSISTENCE_KEY) === 'session') return 'session';
    return 'persistent';
  }

  persistenceMode = readSavedMode();

  function setPersistenceMode(mode: AuthPersistenceMode): boolean {
    if (mode === persistenceMode) {
      const preferenceStore = mode === 'persistent' ? local() : session();
      return safeSet(preferenceStore, PERSISTENCE_KEY, mode);
    }

    const target = storeFor(mode);
    const source = alternateFor(mode);
    const copiedKeys: string[] = [];

    for (const key of managedKeys) {
      const existingTarget = safeGet(target, key);
      const sourceValue = safeGet(source, key);
      if (existingTarget === null && sourceValue !== null) {
        if (!safeSet(target, key, sourceValue)) {
          copiedKeys.forEach((copiedKey) => safeRemove(target, copiedKey));
          return false;
        }
        copiedKeys.push(key);
      }
    }

    const preferenceStore = mode === 'persistent' ? local() : session();
    if (!safeSet(preferenceStore, PERSISTENCE_KEY, mode)) {
      copiedKeys.forEach((copiedKey) => safeRemove(target, copiedKey));
      return false;
    }

    for (const key of managedKeys) safeRemove(source, key);
    safeRemove(mode === 'persistent' ? session() : local(), PERSISTENCE_KEY);
    persistenceMode = mode;
    return true;
  }

  function getItem(key: string): string | null {
    const current = storeFor(persistenceMode);
    const other = alternateFor(persistenceMode);
    const value = safeGet(current, key);
    if (value !== null) return value;

    const legacyValue = safeGet(other, key);
    if (legacyValue !== null) {
      if (safeSet(current, key, legacyValue)) safeRemove(other, key);
      return legacyValue;
    }

    return memory.get(key) ?? null;
  }

  function setItem(key: string, value: string): void {
    if (safeSet(storeFor(persistenceMode), key, value)) {
      safeRemove(alternateFor(persistenceMode), key);
      memory.delete(key);
      return;
    }
    memory.set(key, value);
  }

  function removeItem(key: string): void {
    safeRemove(local(), key);
    safeRemove(session(), key);
    memory.delete(key);
  }

  const storageAdapter = { getItem, setItem, removeItem };

  return {
    ...storageAdapter,
    storageAdapter,
    getPersistenceMode: () => persistenceMode,
    setPersistenceMode,
    setManagedKeys(keys: string[]) {
      managedKeys = [...new Set(keys)];
    },
    clearManagedSessions() {
      managedKeys.forEach(removeItem);
    },
  };
}

export const authStorage = createAuthStorage();
