import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(join(root, 'supabase', 'migrations', '0014_worker_barber_operations.sql'), 'utf8');
const reassignmentMigration = readFileSync(join(root, 'supabase', 'migrations', '0015_worker_barber_reassignment.sql'), 'utf8');

describe('worker barber operations migration', () => {
  it('limits the operational queue to the authenticated barber assignment or compatible work', () => {
    expect(migration).toContain('create or replace function public.mi_cola_barbero()');
    expect(migration).toContain('t.barbero_asignado_id = v_uid');
    expect(migration).toContain('t.barbero_solicitado_id is null or t.barbero_solicitado_id = v_uid');
    expect(migration).toContain('bs.barbero_id = v_uid and bs.servicio_id = t.servicio_id');
  });

  it('claims atomically and protects state changes with barber assignment ownership', () => {
    expect(migration).toContain('create or replace function public.llamar_mi_siguiente');
    expect(migration).toContain("bo.estado = 'disponible' for update");
    expect(migration).toContain("set estado = 'ocupado'");
    expect(migration).toContain('barbero_asignado_id = auth.uid() and atendido_por = auth.uid()');
    expect(migration).toContain("p_ausente then 'ausente'");
  });

  it('allows workers to report only supported non-busy availability states', () => {
    expect(migration).toContain("if p_estado = 'ocupado' then raise exception");
    expect(migration).toContain('Finaliza o marca ausente tu turno activo antes de cambiar disponibilidad');
  });

  it('authorizes reassignment only for the assigned worker or an admin in the ticket business', () => {
    expect(reassignmentMigration).toContain("v_rol not in ('admin', 'personal')");
    expect(reassignmentMigration).toContain("v_rol = 'personal' and (v_ticket.barbero_asignado_id <> v_uid or v_ticket.atendido_por <> v_uid)");
    expect(reassignmentMigration).toContain('id = p_ticket_id and empresa_id = v_empresa');
  });

  it('rejects reassignment after service has started and requires a compatible on-shift target', () => {
    expect(reassignmentMigration).toContain("if v_ticket.estado <> 'llamado' then raise exception");
    expect(reassignmentMigration).toContain("bo.estado = 'disponible' and bs.servicio_id = v_ticket.servicio_id");
    expect(reassignmentMigration).toContain("where activo.barbero_asignado_id = b.id and activo.estado in ('llamado', 'en_atencion')");
  });

  it('locks the called ticket and target operation before atomically transferring operational ownership', () => {
    expect(reassignmentMigration).toContain('where id = p_ticket_id and empresa_id = v_empresa for update');
    expect(reassignmentMigration).toContain('for update of bo');
    expect(reassignmentMigration).toContain("set estado = 'ocupado'");
    expect(reassignmentMigration).toContain("set estado = 'disponible'");
    expect(reassignmentMigration).toContain('atendido_por = v_destino.id');
    expect(reassignmentMigration).toContain('v_origen_id := v_ticket.barbero_asignado_id');
    expect(reassignmentMigration).toContain('where barbero_id = v_origen_id');
  });
});
