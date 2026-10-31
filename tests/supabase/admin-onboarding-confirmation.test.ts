import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(join(root, 'supabase', 'migrations', '0059_admin_onboarding_confirmation.sql'), 'utf8');
const legacy = readFileSync(join(root, 'supabase', 'migrations', '0002_queue_rpcs.sql'), 'utf8');

describe('durable admin onboarding contract', () => {
  it('uses authenticated identity and signup metadata without a client user id', () => {
    expect(migration).toContain('create or replace function public.completar_onboarding_empresa()');
    expect(migration).toContain("auth.users as u");
    expect(migration).toContain("raw_user_meta_data ->> 'empresa_nombre'");
    expect(migration).toContain('auth.uid()');
    expect(migration).not.toContain('p_usuario_id');
  });

  it('contains idempotence and concurrency cues and is authenticated-only', () => {
    expect(migration).toContain('for update');
    expect(migration).toContain('on conflict (usuario_id, empresa_id, rol) do update');
    expect(migration).toContain('revoke all on function public.completar_onboarding_empresa() from public, anon');
    expect(migration).toContain('grant execute on function public.completar_onboarding_empresa() to authenticated');
  });

  it('preserves the complete legacy crear_empresa signature', () => {
    expect(legacy).toMatch(
      /public\.crear_empresa\(\s*p_nombre text,\s*p_id_fiscal text default null,\s*p_correo text default null,\s*p_telefono text default null,\s*p_direccion text default null/s,
    );
    expect(legacy).toContain('grant execute on function public.crear_empresa(text, text, text, text, text)');
  });
});
