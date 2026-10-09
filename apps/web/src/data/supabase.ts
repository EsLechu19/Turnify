import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

/** True when the panel can talk to the real backend; otherwise fixtures rule. */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Falta configurar Supabase. Copia apps/web/.env.example a apps/web/.env y completa los valores.');
  }

  if (!client) {
    client = createClient(supabaseUrl as string, supabaseAnonKey as string);
  }

  return client;
}
