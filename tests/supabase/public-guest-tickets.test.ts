import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(join(root, 'supabase', 'migrations', '0016_public_guest_tickets.sql'), 'utf8');

describe('public guest tickets migration', () => {
  it('permits anonymous discovery through RPCs without granting anon table access', () => {
    expect(migration).toContain('create or replace function public.crear_ticket_invitado');
    expect(migration).toContain('grant execute on function public.crear_ticket_invitado');
    expect(migration).not.toMatch(/grant\s+(select|insert|update|delete|all)\s+on\s+(table\s+)?public\.tickets\s+to\s+anon/i);
  });

  it('requires approved guest details and preserves named or any-available routing', () => {
    expect(migration).toContain("'under_18', '18_24', '25_34', '35_44', '45_plus'");
    expect(migration).toContain("'male', 'female', 'prefer_not_to_say'");
    expect(migration).toContain('char_length(btrim(p_nombre)) not between 1 and 80');
    expect(migration).toContain("bo.estado <> 'fuera_de_turno'");
    expect(migration).toContain('case when p_barbero_solicitado_id is null then null else v_estimado.id end');
  });

  it('hashes the one-time capability and never returns another guest profile', () => {
    expect(migration).toContain("extensions.digest(v_capacidad, 'sha256')");
    expect(migration).toContain("acceso_publico_hash = extensions.digest(p_capacidad, 'sha256')");
    const stateStart = migration.indexOf('create or replace function public.estado_ticket_invitado');
    const stateEnd = migration.indexOf('create or replace function public.cancelar_ticket_invitado');
    const state = migration.slice(stateStart, stateEnd);
    expect(state).not.toContain('nombre_invitado');
    expect(state).not.toContain('rango_edad_invitado');
    expect(state).not.toContain('genero_invitado');
  });

  it('keeps cancellation capability-bound and leaves worker ownership controls untouched', () => {
    expect(migration).toContain('create or replace function public.cancelar_ticket_invitado');
    expect(migration).toContain("and estado in ('en_espera', 'notificado')");
    expect(migration).toContain('revoke all on function public.estado_ticket_invitado(uuid, text) from public;');
    expect(migration).not.toContain('llamar_mi_siguiente');
    expect(migration).not.toContain('iniciar_mi_atencion');
  });
});
