import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

const migration = read('supabase', 'migrations', '0053_solicitud_miembro_activo.sql');
const membershipApi = read('apps', 'mobile', 'src', 'features', 'worker', 'worker-membership-api.ts');

describe('invitation requests from existing members', () => {
  it('refuses redemption with a clear message instead of queueing admin noise', () => {
    expect(migration).toContain('create or replace function public.solicitar_invitacion_personal(p_codigo text)');
    expect(migration).toContain("m.perfil_id = auth.uid() and m.empresa_id = v_empresa and m.activa");
    expect(migration).toContain("raise exception 'Ya perteneces a esta barbería'");
  });

  it('hides legacy requested rows whose requester is already an active member', () => {
    expect(migration).toContain('create or replace function public.solicitudes_personal_de_mi_empresa()');
    expect(migration).toContain('m.perfil_id = s.solicitada_por and m.empresa_id = s.empresa_id and m.activa');
  });

  it('surfaces the membership message in the app instead of the generic error', () => {
    expect(membershipApi).toContain("error.message.includes('Ya perteneces')");
    expect(membershipApi).toContain("throw new Error('Ya perteneces a esta barbería.')");
  });
});
