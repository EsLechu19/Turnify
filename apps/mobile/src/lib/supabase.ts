import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { secureStorage, type SecureStorageAdapter } from '@/lib/secure-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Throws a descriptive error instead of letting `createClient` fail with an
 * opaque invalid-URL message when the env file is missing.
 */
function requireConfig(): { url: string; anonKey: string } {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy apps/mobile/.env.example to apps/mobile/.env and fill in the values.'
    );
  }
  return { url: supabaseUrl, anonKey: supabaseAnonKey };
}

function buildClient(storage?: SecureStorageAdapter): SupabaseClient {
  const { url, anonKey } = requireConfig();
  return createClient(url, anonKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

let client: SupabaseClient | undefined;

/**
 * Returns the shared session-persisted client, creating it on first use.
 *
 * It is lazy on purpose: importing this module must not throw when the env file
 * is missing, so the UI can render a configuration notice instead of crashing.
 *
 * The anon key is public by design: RLS is what protects the data, and the
 * service_role key must never reach the bundle.
 */
export function getSupabase(): SupabaseClient {
  client ??= buildClient(secureStorage);
  return client;
}
