// V1 checks: RLS isolation matrix against turnify-dev.
// Reads SUPABASE_URL, SUPABASE_ANON_KEY, TEST_PASSWORD from env,
// plus TEST_USERS_JSON (array of {role,email} from v1-signup output).
// Prints PASS/FAIL lines and exits non-zero on any FAIL.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? '';
const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
const password = process.env.TEST_PASSWORD ?? 'Turnify-Test-1234!';
const users = JSON.parse(process.env.TEST_USERS_JSON ?? '[]');
if (!url || !anonKey || users.length !== 4) {
  console.error('Missing env (SUPABASE_URL, SUPABASE_ANON_KEY, TEST_USERS_JSON[4])');
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

const byRole = Object.fromEntries(users.map((u) => [u.role, u.email]));
const clientA = await signIn(byRole['client-a']);
const clientB = await signIn(byRole['client-b']);
const staffC = await signIn(byRole['staff-c']);
const adminD = await signIn(byRole['admin-d']);

// Admin A creates empresa 1; admin D creates empresa 2.
const { data: emp1, error: e1 } = await clientA.rpc('crear_empresa', {
  p_nombre: 'Turnify Test Uno',
  p_id_fiscal: 'TEST-001',
});
if (e1) throw new Error(`crear_empresa 1: ${e1.message}`);
const { data: emp2, error: e2 } = await adminD.rpc('crear_empresa', {
  p_nombre: 'Turnify Test Dos',
  p_id_fiscal: 'TEST-002',
});
if (e2) throw new Error(`crear_empresa 2: ${e2.message}`);
check('two empresas created with unique codes', emp1.codigo !== emp2.codigo, `${emp1.codigo} vs ${emp2.codigo}`);

// Admin A invites staff C; C redeems.
const { data: inv, error: e3 } = await clientA.rpc('crear_invitacion', {
  p_email: byRole['staff-c'],
  p_rol: 'personal',
});
if (e3) throw new Error(`crear_invitacion: ${e3.message}`);
const { error: e4 } = await staffC.rpc('aceptar_invitacion', { p_token: inv.token });
check('staff invite redeemed', !e4, e4 ? e4.message : `staff of ${emp1.codigo}`);

// Client B takes a turn in empresa 1; staff creates a walk-in.
const { data: ticketB, error: e5 } = await clientB.rpc('tomar_turno', { p_codigo: emp1.codigo });
if (e5) throw new Error(`tomar_turno: ${e5.message}`);
const summary = await clientB.rpc('resumen_empresa', { p_codigo: emp1.codigo });
const filaId = summary.data.filas[0].fila_id;
const { data: walkIn, error: e6 } = await staffC.rpc('crear_ticket_presencial', {
  p_fila_id: filaId,
  p_prioridad: 'normal',
});
if (e6) throw new Error(`crear_ticket_presencial: ${e6.message}`);
check('turn taken + walk-in created', !!ticketB.id && !!walkIn.id, `${ticketB.codigo_visible} / ${walkIn.codigo_visible}`);

// B reads own ticket state.
const { data: stateB, error: e7 } = await clientB.rpc('mi_ticket_estado', { p_ticket_id: ticketB.id });
check('owner reads own ticket state', !e7 && stateB.codigo_visible === ticketB.codigo_visible);

// B must NOT read A's... A has no ticket; use cross-ticket: B reads walk-in id (no cliente) -> must fail.
const { error: e8 } = await clientB.rpc('mi_ticket_estado', { p_ticket_id: walkIn.id });
check('client cannot read non-owned ticket', !!e8, e8 ? e8.message : 'unexpectedly readable');

// B direct table select returns only own ticket.
const { data: rowsB } = await clientB.from('tickets').select('id');
check(
  'client table select returns only own ticket',
  Array.isArray(rowsB) && rowsB.length === 1 && rowsB[0].id === ticketB.id,
  `rows=${rowsB?.length ?? 'err'}`,
);

// Staff sees empresa tickets (B + walk-in), nothing from empresa 2.
const { data: rowsStaff1 } = await staffC.from('tickets').select('id').eq('empresa_id', emp1.id);
const { data: rowsStaff2 } = await staffC.from('tickets').select('id').eq('empresa_id', emp2.id);
check('staff sees own empresa tickets', (rowsStaff1?.length ?? -1) >= 2, `rows=${rowsStaff1?.length}`);
check('staff sees zero of other empresa', (rowsStaff2?.length ?? -1) === 0, `rows=${rowsStaff2?.length}`);

// Admin of empresa 2 sees nothing of empresa 1.
const { data: rowsD } = await adminD.from('tickets').select('id').eq('empresa_id', emp1.id);
check('foreign admin sees zero tickets', (rowsD?.length ?? -1) === 0, `rows=${rowsD?.length}`);

// Second active turn for B must be rejected.
const { error: e9 } = await clientB.rpc('tomar_turno', { p_codigo: emp1.codigo });
check('second active turn rejected', !!e9 && e9.message.includes('Ya tienes un turno activo'), e9?.message ?? 'allowed?!');

// Preview exposes no personal data.
const keys = JSON.stringify(summary.data);
check(
  'preview exposes no personal data',
  !keys.includes('cliente_id') && !keys.includes(' turnify-test-'),
  'aggregate only',
);

console.log(JSON.stringify({ empresa1: { id: emp1.id, codigo: emp1.codigo }, empresa2: { id: emp2.id, codigo: emp2.codigo }, ticketB: ticketB.id, walkIn: walkIn.id, filaId }));
const failed = results.filter((r) => !r.ok);
if (failed.length > 0) process.exit(2);
