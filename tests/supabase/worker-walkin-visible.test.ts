import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

const migration = read('supabase', 'migrations', '0049_ticket_manual_visible.sql');
const migration50 = read('supabase', 'migrations', '0050_ticket_manual_con_servicio.sql');
const walkinApi = read('apps', 'mobile', 'src', 'features', 'queue', 'worker-barber-api.ts');

describe('manual ticket visibility', () => {
  it('shows walk-in tickets in the worker queue scoped to their creator', () => {
    expect(migration).toContain('create or replace function public.mi_cola_barbero()');
    expect(migration).toContain('t.servicio_id is null and t.barbero_solicitado_id=v_barbero.id');
    expect(migration).toContain("'inicio_en', t.inicio_en");
    expect(migration).toContain("'personas_delante'");
  });

  it('lets llamar_mi_siguiente fall back to walk-ins after compatible tickets', () => {
    expect(migration50).toContain('create or replace function public.llamar_mi_siguiente(p_fila_id uuid)');
    expect(migration50).toContain("t.origen='presencial' and t.barbero_solicitado_id=v_id");
    expect(migration50).toContain('minutos_gracia');
  });

  it('labels manual options with the real service name instead of the queue name', () => {
    expect(walkinApi).toContain('name: service.nombre');
  });

  it('stores the chosen service on manual tickets through an optional validated parameter', () => {
    const sql = read('supabase', 'migrations', '0050_ticket_manual_con_servicio.sql');

    expect(sql).toContain('p_servicio_id uuid default null');
    expect(sql).toContain('grant execute on function public.crear_mi_ticket_presencial(uuid, public.prioridad_ticket, text, uuid) to authenticated;');
    expect(sql).toContain('servicio_id,servicio_nombre,servicio_duracion_seg');
    expect(walkinApi).toContain('serviceId?: string | null');
  });

  it('routes manual tickets to a barber actually authorized for the service', () => {
    const sql = read('supabase', 'migrations', '0051_ticket_manual_asignado.sql');

    expect(sql).toContain('p_barbero_solicitado_id uuid default null');
    expect(sql).toContain('grant execute on function public.crear_mi_ticket_presencial(uuid, public.prioridad_ticket, text, uuid, uuid) to authenticated;');
    expect(sql).toContain('Ese barbero no atiende este servicio');
    expect(walkinApi).toContain('serviceIds: string[]');
    expect(walkinApi).toContain('barberId?: string | null');
  });
});
