// V4 step runner: staff service cycle + ticket taking for average validation.
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, TEST_PASSWORD.
// Usage: node v4-step.mjs llamar <filaId> | iniciar <ticketId> |
//        finalizar <ticketId> | tomar <codigo> <email> | promedio <filaId>
// Staff identity: TEST_STAFF (defaults to the V1 staff address).
// Prints JSON results only.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? '';
const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
const password = process.env.TEST_PASSWORD ?? 'Turnify-Test-4291!';
const staffEmail = process.env.TEST_STAFF ?? 'turnifytest+staff-c-mun0h7c2@gmail.com';
if (!url || !anonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

async function signIn(email) {
  const client = createClient(url, anonKey);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signin ${email}: ${error.message}`);
  return client;
}

const [cmd, arg1, arg2] = process.argv.slice(2);
const staff = await signIn(staffEmail);

if (cmd === 'llamar') {
  const { data, error } = await staff.rpc('llamar_siguiente', { p_fila_id: arg1 });
  if (error) throw new Error(error.message);
  console.log(JSON.stringify(data));
} else if (cmd === 'iniciar') {
  const { data, error } = await staff.rpc('iniciar_atencion', { p_ticket_id: arg1 });
  if (error) throw new Error(error.message);
  console.log(JSON.stringify({ id: data.id, estado: data.estado }));
} else if (cmd === 'finalizar') {
  const { data, error } = await staff.rpc('finalizar_atencion', { p_ticket_id: arg1 });
  if (error) throw new Error(error.message);
  const fila = await staff.from('filas').select('duracion_promedio_seg').eq('id', data.fila_id).single();
  console.log(JSON.stringify({ id: data.id, estado: data.estado, promedio: fila.data?.duracion_promedio_seg }));
} else if (cmd === 'tomar') {
  const who = await signIn(arg2);
  const { data, error } = await who.rpc('tomar_turno', { p_codigo: arg1 });
  if (error) throw new Error(error.message);
  console.log(JSON.stringify({ id: data.id, codigo: data.codigo_visible }));
} else if (cmd === 'promedio') {
  const fila = await staff.from('filas').select('duracion_promedio_seg').eq('id', arg1).single();
  console.log(JSON.stringify({ promedio: fila.data?.duracion_promedio_seg }));
} else {
  console.error('unknown command');
  process.exit(1);
}
