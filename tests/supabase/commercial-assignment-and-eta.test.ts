import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0013_commercial_assignment_and_eta.sql'),
  'utf8',
);

describe('commercial assignment and ETA migration', () => {
  it('separates immutable projected routing from capacity-reserving assignment', () => {
    expect(migration).toContain('barbero_estimado_id');
    expect(migration).toContain('Los snapshots de servicio, solicitud y estimación son inmutables');
    expect(migration).toContain('tickets_barbero_capacidad_activa_idx');
    expect(migration).toContain("estado in ('llamado', 'en_atencion')");
  });

  it('keeps named on-shift requests intact and routes any-available deterministically', () => {
    expect(migration).toContain("bo.estado <> 'fuera_de_turno'");
    expect(migration).toContain("case bo.estado when 'disponible' then 0 else 1 end, b.nombre, b.id");
    expect(migration).toContain('v_ticket.barbero_solicitado_id is not null');
    expect(migration).toContain("bo.estado = 'disponible'");
  });

  it('assigns only while calling and exposes service-aware projected ETA data', () => {
    const callStart = migration.indexOf('create or replace function public.llamar_siguiente');
    const etaStart = migration.indexOf('create or replace function public.mi_ticket_estado');
    const dispatch = migration.slice(callStart, etaStart);

    expect(dispatch).toContain('barbero_asignado_id = v_barbero.id');
    expect(dispatch).toContain('atendido_por = v_uid');
    expect(migration).toContain('sum(t.servicio_duracion_seg)');
    expect(migration).toContain("'barbero_estimado_nombre', v_ticket.barbero_estimado_nombre");
    expect(migration).toContain("'barbero_asignado_nombre', v_ticket.barbero_asignado_nombre");
  });
});
