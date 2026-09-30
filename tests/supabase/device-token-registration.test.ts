import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'supabase',
    'migrations',
    '0008_device_token_registration.sql',
  ),
  'utf8',
);

describe('device token registration migration', () => {
  it('keeps each provider token globally unique and refreshable', () => {
    expect(migration).toContain('on public.dispositivos (push_token)');
    expect(migration).toContain('on conflict (push_token) do update');
    expect(migration).toContain('actualizado_en = now()');
  });

  it('derives customer ownership from auth and does not grant direct table access', () => {
    expect(migration).toContain('v_uid uuid := auth.uid()');
    expect(migration).toContain("where p.id = v_uid and p.rol = 'cliente'");
    expect(migration).toContain('where usuario_id = v_uid');
    expect(migration).toContain('revoke all on table public.dispositivos from anon, authenticated;');
  });

  it('limits mobile clients to the registration and revocation RPCs', () => {
    expect(migration).toContain('security definer');
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain('grant execute on function public.registrar_dispositivo(text, text) to authenticated;');
    expect(migration).toContain('grant execute on function public.revocar_dispositivo(text) to authenticated;');
  });
});
