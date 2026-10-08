import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0026_worker_public_code_request.sql'),
  'utf8',
);

describe('worker public code request migration', () => {
  it('modifies the pending request index to ensure 1 unique active request without blocking new requests if rejected', () => {
    expect(migration).toContain('drop index if exists public.solicitudes_invitacion_personal_activa_email_idx');
    expect(migration).toContain('create unique index solicitudes_invitacion_personal_pendientes_idx');
  });

  it('exposes a new RPC to bypass issued state and insert requested via public code', () => {
    expect(migration).toContain('create or replace function public.solicitar_acceso_codigo_publico');
    expect(migration).toContain('v_email text := public.normalizar_correo_invitacion_personal(auth.jwt() ->> \'email\')');
    expect(migration).toContain('where codigo = upper(btrim(p_codigo))');
  });

  it('guards against spam using on conflict do nothing and checks for existing active membership', () => {
    expect(migration).toContain('membresias_personal_empresa where perfil_id = auth.uid() and empresa_id = v_empresa_id and activa = true');
    expect(migration).toContain('raise exception \'Ya tienes una membresía activa en esta barbería\'');
    expect(migration).toContain('on conflict (empresa_id, email_hash) where estado in (\'issued\', \'requested\') do nothing');
  });
});
