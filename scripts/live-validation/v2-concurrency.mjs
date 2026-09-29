// V2 concurrency: parallel tomar_turno must not duplicate numbers,
// and the same client racing itself gets exactly one active ticket.
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, TEST_PASSWORD, TEST_V2_JSON
// { codigo, bEmail, eEmail, fEmail }. Prints PASS/FAIL, exit non-zero on FAIL.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? '';
const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
const password = process.env.TEST_PASSWORD ?? 'Turnify-Test-4291!';
const cfg = JSON.parse(process.env.TEST_V2_JSON ?? '{}');
if (!url || !anonKey || !cfg.codigo || !cfg.bEmail || !cfg.eEmail || !cfg.fEmail) {
  console.error('Missing env (SUPABASE_URL, SUPABASE_ANON_KEY, TEST_V2_JSON{codigo,bEmail,eEmail,fEmail})');
  process.exit(1);
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function signIn(email) {
  const client = createClient(url, anonKey);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signin ${email}: ${error.message}`);
  return client;
}

const b = await signIn(cfg.bEmail);
const e = await signIn(cfg.eEmail);
const f = await signIn(cfg.fEmail);

// B cancels its V1 ticket (also proves cancelar live).
const { data: ownB } = await b.from('tickets').select('id');
if (ownB?.length === 1) {
  const { error } = await b.rpc('cancelar_ticket', { p_ticket_id: ownB[0].id });
  check('cancel prior ticket live', !error, error ? error.message : 'cancelado');
} else {
  check('cancel prior ticket live', false, `own rows=${ownB?.length}`);
}

// Three different clients race for the same fila.
const attempts = await Promise.allSettled([
  b.rpc('tomar_turno', { p_codigo: cfg.codigo }),
  e.rpc('tomar_turno', { p_codigo: cfg.codigo }),
  f.rpc('tomar_turno', { p_codigo: cfg.codigo }),
]);
const won = attempts.filter((a) => a.status === 'fulfilled' && !a.value.error).map((a) => a.value.data);
check('parallel turns all succeed', won.length === 3, `won=${won.length}`);
const codes = won.map((t) => t.codigo_visible);
const numbers = won.map((t) => t.numero);
check(
  'no duplicate numbers in race',
  new Set(numbers).size === numbers.length && new Set(codes).size === codes.length,
  codes.join(', '),
);

// Same client races itself: cancel E, then fire twice in parallel.
const ticketE = won.find((t) => t.cliente_id);
const { data: ownE } = await e.from('tickets').select('id');
if (ownE?.length === 1) await e.rpc('cancelar_ticket', { p_ticket_id: ownE[0].id });
const duel = await Promise.allSettled([
  e.rpc('tomar_turno', { p_codigo: cfg.codigo }),
  e.rpc('tomar_turno', { p_codigo: cfg.codigo }),
]);
const duelWon = duel.filter((d) => d.status === 'fulfilled' && !d.value.error);
const duelLost = duel.filter((d) => d.status === 'fulfilled' && d.value.error);
check(
  'self-race yields exactly one active ticket',
  duelWon.length === 1 &&
    duelLost.length === 1 &&
    (duelLost[0].value.error.message || '').includes('Ya tienes un turno activo'),
  `won=${duelWon.length} lost=${duelLost.length}`,
);

console.log(JSON.stringify({ numbers, codes }));
if (results.some((r) => !r.ok)) process.exit(2);
