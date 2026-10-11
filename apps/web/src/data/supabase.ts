import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

function hasValidSupabaseUrl(value: string | undefined): boolean {
  if (!value?.trim()) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** True when both public Supabase values are present and the URL is usable. */
export function isSupabaseConfigured(): boolean {
  return hasValidSupabaseUrl(supabaseUrl) && Boolean(supabaseAnonKey?.trim());
}

/** The panel is unavailable in every runtime mode without valid Supabase configuration. */
export function isSupabaseConfigurationUnavailable(): boolean {
  return !isSupabaseConfigured();
}

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Falta configurar Supabase. Copia apps/web/.env.example a apps/web/.env y completa los valores.');
  }

  if (!client) {
    client = createClient(supabaseUrl!.trim(), supabaseAnonKey!.trim());
  }

  return client;
}
