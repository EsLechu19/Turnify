import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0058_mis_membresias_empresa.sql'),
  'utf8',
);
const foundation = readFileSync(
  join(root, 'supabase', 'migrations', '0057_business_role_memberships.sql'),
  'utf8',
);

describe('current business memberships RPC', () => {
  it('owns membership filtering by the authenticated user', () => {
    expect(migration).toContain('where m.usuario_id = auth.uid()');
    expect(migration).toContain('from public.membresias_empresa as m');
  });

  it('returns active memberships only', () => {
    expect(migration).toContain('and m.activa');
  });

  it('exposes both ADMIN and WORKER membership roles', () => {
    expect(foundation).toContain("create type public.rol_membresia_empresa as enum ('ADMIN', 'WORKER')");
    expect(migration).toContain('rol public.rol_membresia_empresa');
    expect(migration).toContain('m.rol');
  });

  it('returns business identity fields for a future context chooser', () => {
    expect(migration).toContain('empresa_nombre text');
    expect(migration).toContain('empresa_codigo text');
    expect(migration).toContain('join public.empresas as e on e.id = m.empresa_id');
    expect(migration).toContain('select m.empresa_id, e.nombre, e.codigo, m.rol');
  });

  it('does not accept a user id or client-provided business scope', () => {
    expect(migration).toContain('mis_membresias_empresa()');
    expect(migration).not.toMatch(/p_user_id|p_usuario_id|p_empresa_id|user_id\s+uuid|usuario_id\s+uuid/i);
  });

  it('uses a locked-down security-definer function with authenticated-only execution', () => {
    expect(migration).toContain('security definer');
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain('revoke all on function public.mis_membresias_empresa() from public, anon');
    expect(migration).toContain('grant execute on function public.mis_membresias_empresa() to authenticated');
  });

  it('is read-only and contains no mutation statements', () => {
    expect(migration).not.toMatch(/\b(insert|update|delete|truncate)\b/i);
  });
});
