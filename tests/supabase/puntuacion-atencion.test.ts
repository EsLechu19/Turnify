import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0030_puntuacion_atencion.sql'),
  'utf8',
);
const eligibilityMigration = readFileSync(
  join(root, 'supabase', 'migrations', '0061_guest_rating_window.sql'),
  'utf8',
);
const latestProjection = readFileSync(
  join(root, 'supabase', 'migrations', '0052_espera_con_ritmo_medido.sql'),
  'utf8',
);

function projectionKeys(sql: string): string[] {
  const projection = sql.slice(sql.indexOf('return jsonb_build_object('));
  return [...projection.matchAll(/'([a-z_]+)'\s*,/g)].map((match) => match[1]);
}

describe('guest attention rating', () => {
  it('stores the vote on the ticket with a 1 to 5 guard', () => {
    expect(migration).toContain('add column if not exists puntuacion');
    expect(migration).toContain('puntuacion between 1 and 5');
    expect(migration).toContain('puntuacion_en');
  });

  it('accepts the vote only on a finished visit through the guest capability', () => {
    expect(migration).toContain('create or replace function public.puntuar_atencion_invitado');
    expect(migration).toContain('acceso_publico_hash');
    expect(migration).toContain("v_ticket.estado <> 'finalizado'");
    expect(migration).toContain('grant execute on function public.puntuar_atencion_invitado');
  });

  it('exposes the vote to the guest state and aggregates it per barber', () => {
    expect(migration).toContain("'puntuacion',v_ticket.puntuacion");
    expect(migration).toContain('create or replace function public.metricas_puntuacion');
    expect(migration).toContain('promedio');
  });

  it('preserves capability authorization, locking, grants and single-vote idempotency', () => {
    const rating = eligibilityMigration.split('create or replace function public.estado_ticket_invitado')[0];
    expect(rating).toContain("acceso_publico_hash = extensions.digest(p_capacidad, 'sha256') for update");
    expect(rating).toContain("v_ticket.estado <> 'finalizado'");
    expect(rating).toMatch(/if v_ticket\.puntuacion is not null then\s*if v_ticket\.puntuacion = p_puntos then return; end if;/);
    expect(rating).toContain('revoke all on function public.puntuar_atencion_invitado(uuid, text, integer) from public');
    expect(rating).toContain('grant execute on function public.puntuar_atencion_invitado(uuid, text, integer) to anon, authenticated');
  });

  it('rejects missing, future and expired completion times before accepting even an identical retry', () => {
    const rating = eligibilityMigration.split('create or replace function public.estado_ticket_invitado')[0];
    expect(rating).toContain('v_ahora := clock_timestamp();');
    expect(rating).toMatch(/v_ticket\.fin_en is null\s+or v_ticket\.fin_en > v_ahora\s+or v_ahora >= v_ticket\.fin_en \+ interval '24 hours'/);
    expect(rating.indexOf("v_ahora >= v_ticket.fin_en + interval '24 hours'"))
      .toBeLessThan(rating.indexOf('if v_ticket.puntuacion is not null then'));
    expect(rating).toContain('puntuacion_en = v_ahora');
  });

  it('keeps every latest guest projection field and measured-pace calculation', () => {
    expect(projectionKeys(eligibilityMigration)).toEqual([
      ...projectionKeys(latestProjection),
      'puede_puntuar',
      'puntuacion_vencimiento_en',
    ]);
    expect(eligibilityMigration).toContain('public.ritmo_medido_servicio_seg(t.empresa_id, t.servicio_id)');
    expect(eligibilityMigration).toContain('public.vencimiento_efectivo_llamado(v_ticket)');
    expect(eligibilityMigration).toContain('acceso_publico_hash = extensions.digest(p_capacidad, \'sha256\')');
    expect(eligibilityMigration).not.toMatch(/'(?:telefono_invitado|nombre_invitado|acceso_publico_hash)'\s*,/);
  });

  it('projects eligibility only for an unrated finished ticket inside the same strict window', () => {
    expect(eligibilityMigration).toContain("v_ticket.estado = 'finalizado'");
    expect(eligibilityMigration).toContain('v_ticket.puntuacion is null');
    expect(eligibilityMigration).toContain('v_ticket.fin_en is not null');
    expect(eligibilityMigration).toContain('v_ticket.fin_en <= v_ahora');
    expect(eligibilityMigration).toContain("v_ahora < v_ticket.fin_en + interval '24 hours'");
  });
});
