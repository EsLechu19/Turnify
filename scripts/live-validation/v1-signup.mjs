// V1 signup: create throwaway test users in turnify-dev.
// Reads SUPABASE_URL and SUPABASE_ANON_KEY from env (never hardcoded).
// Prints one JSON object per line: { role, email, id }.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? '';
const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
const password = process.env.TEST_PASSWORD ?? 'Turnify-Test-1234!';
if (!url || !anonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const stamp = Date.now().toString(36);
const only = new Set(process.argv.slice(2));
const roles = ['client-a', 'client-b', 'staff-c', 'admin-d', 'client-e', 'client-f'].filter((r) => only.size === 0 || only.has(r));
const supabase = createClient(url, anonKey);

for (const role of roles) {
  const email = `turnifytest+${role}-${stamp}@gmail.com`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre: `Test ${role}` } },
  });
  if (error) {
    console.error(JSON.stringify({ role, email, error: error.message }));
    process.exit(1);
  }
  console.log(JSON.stringify({ role, email, id: data.user?.id ?? null }));
}
