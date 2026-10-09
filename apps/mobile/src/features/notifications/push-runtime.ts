import Constants from 'expo-constants';

export type PushModule = typeof import('expo-notifications');

/**
 * Remote push only exists outside Expo Go (development builds carry the native
 * module; since SDK 53 merely importing it in Expo Go throws at load time).
 * `expo-constants` itself is safe to import anywhere.
 *
 * Push is additionally behind the `EXPO_PUBLIC_ENABLE_PUSH` kill-switch while
 * it stays deferred: set it to `1` on a development build to re-enable the
 * registration path. Until then every runtime degrades silently.
 */
export function isPushRuntimeSupported(): boolean {
  if (process.env.EXPO_PUBLIC_ENABLE_PUSH !== '1') return false;
  return Constants.appOwnership !== 'expo';
}

let cachedModule: Promise<PushModule | null> | undefined;

/**
 * Loads the push module on capable runtimes only. Resolves `null` in Expo Go
 * so callers degrade instead of crashing the boot path.
 */
export function loadPushModule(): Promise<PushModule | null> {
  cachedModule ??= (async () => {
    if (!isPushRuntimeSupported()) return null;
    try {
      return await import('expo-notifications');
    } catch {
      return null;
    }
  })();
  return cachedModule;
}
