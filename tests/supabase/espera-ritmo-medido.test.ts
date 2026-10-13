import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

const migration = read('supabase', 'migrations', '0052_espera_con_ritmo_medido.sql');
const ticket = read('apps', 'mobile', 'src', 'app', '(public)', 'ticket.tsx');
const home = read('apps', 'mobile', 'src', 'app', 'index.tsx');

describe('measured-pace wait estimate', () => {
  it('paces ahead tickets at recent measured averages with snapshot fallback', () => {
    expect(migration).toContain('create or replace function public.ritmo_medido_servicio_seg(p_empresa uuid, p_servicio_id uuid)');
    expect(migration).toContain("order by fin_en desc limit 10");
    expect(migration).toContain('coalesce(public.ritmo_medido_servicio_seg(t.empresa_id, t.servicio_id), t.servicio_duracion_seg, 0)');
    expect(migration).toContain('create or replace function public.estado_ticket_invitado(p_ticket_id uuid, p_capacidad text)');
  });

  it('keeps the established position display while the estimate improves underneath', () => {
    expect(ticket).toContain('delante de ti');
    expect(ticket).toContain('espera aprox.');
    expect(home).toContain('{activeTicket.peopleAhead} delante · {activeTicket.waitMinutes} min');
  });
});
