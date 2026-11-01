import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { queueMetrics } from '../../apps/mobile/src/features/public/guest-ticket-display';
import type { GuestTicketState } from '../../apps/mobile/src/features/queue/public-guest-ticket-api';

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
    expect(ticket).toContain('const metrics = ticket ? queueMetrics(ticket) : null');
    expect(home).toContain('{queueMetrics(activeTicket).ahead} delante · {queueMetrics(activeTicket).wait}');
    expect(queueMetrics({ peopleAhead: 2, waitMinutes: 7.2 } as GuestTicketState)).toEqual({ ahead: '2', wait: '~8 min' });
    expect(queueMetrics({ peopleAhead: 0, waitMinutes: 0 } as GuestTicketState)).toEqual({ ahead: '0', wait: 'Ahora' });
    expect(queueMetrics({ peopleAhead: -1, waitMinutes: -1 } as GuestTicketState)).toEqual({ ahead: 'Sin datos', wait: 'Sin estimación' });
  });
});
