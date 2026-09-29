/**
 * SecureStore is only available on native platforms, so the web build keeps the
 * session in `localStorage` through the same adapter interface.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isNative = Platform.OS !== 'web';

/**
 * Minimal `AsyncStorage`-compatible surface used by the Supabase client.
 */
export interface SecureStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Persists the auth session in the OS keychain / keystore instead of plain
 * AsyncStorage, so tokens are not stored in the clear on the device.
 *
 * Caveat: Android caps a single SecureStore value at 2048 bytes. The Supabase
 * session is normally well under that, but if a future refresh makes it grow
 * we should move the session to a chunked key or an encrypted database.
 */
export const secureStorage: SecureStorageAdapter = {
  async getItem(key) {
    if (isNative) {
      return SecureStore.getItemAsync(key);
    }
    return globalThis.localStorage?.getItem(key) ?? null;
  },
  async setItem(key, value) {
    if (isNative) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    globalThis.localStorage?.setItem(key, value);
  },
  async removeItem(key) {
    if (isNative) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    globalThis.localStorage?.removeItem(key);
  },
};
