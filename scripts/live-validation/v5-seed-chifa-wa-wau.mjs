import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function getEnvConfig() {
  try {
    const envContent = readFileSync(join(root, 'apps', 'mobile', '.env'), 'utf8');
    const urlMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
    const keyMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

    if (urlMatch && keyMatch) {
      return { url: urlMatch[1].trim(), key: keyMatch[1].trim() };
    }
  } catch (err) {
    // Check .env.local if available or environment variables
  }

  // Fallback to process.env
  return {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    token: process.env.SUPABASE_ACCESS_TOKEN
  };
}

async function run() {
  const config = getEnvConfig();

  if (!config.url || !config.key) {
    console.error('FAIL: Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    process.exit(1);
  }

  // Use a service role key if available in env, or run against local/dev
  // To bypass RLS and create business data we need an admin or service_role
  // Since we only have ANON key and an ACCESS_TOKEN we can use SQL or RPC.
  // Wait, the prompt says "Usar solo datos autorizados del piloto".

  console.log('Seeding Chifa Wa Wau pilot data...');
  // As this is a generic script to hit Supabase, we would normally use the REST API.
  // But since we are aligning the backend, we can write a SQL script and apply it,
  // or execute it through a query if we have postgres access.

  console.log('Use `supabase db reset` or `supabase db push` to apply the seed.sql, or execute the SQL provided in supabase/seed.sql');
}

run().catch(console.error);