/**
 * In-memory `expo-secure-store` stand-in for Vitest. Mirrors the async surface
 * the app uses; each test file gets a fresh module registry, so state never
 * leaks between files.
 */
const vault = new Map<string, string>();

export async function getItemAsync(key: string): Promise<string | null> {
  return vault.has(key) ? (vault.get(key) as string) : null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  vault.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  vault.delete(key);
}
