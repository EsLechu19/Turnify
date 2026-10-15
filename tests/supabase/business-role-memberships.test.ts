import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0057_business_role_memberships.sql'),
  'utf8',
);

describe('business role membership foundation', () => {
  it('defines additive ADMIN and WORKER memberships with revocation and uniqueness', () => {
    expect(migration).toContain("create type public.rol_membresia_empresa as enum ('ADMIN', 'WORKER')");
    expect(migration).toContain('create table public.membresias_empresa');
    expect(migration).toContain('primary key (usuario_id, empresa_id, rol)');
    expect(migration).toContain('activa boolean not null default true');
    expect(migration).toContain('revocada_en timestamptz');
  });

  it('backfills admins and active workers without changing legacy selection state', () => {
    expect(migration).toContain("where p.rol = 'admin' and p.empresa_id is not null");
    expect(migration).toContain("where p.rol = 'personal' and m.activa");
    expect(migration).toContain('from public.membresias_personal_empresa as m');
    expect(migration).toContain('not a replacement');
    expect(migration).not.toMatch(/update\s+public\.perfiles/i);
  });

  it('does not create memberships for clients', () => {
    expect(migration).not.toContain("p.rol = 'cliente'");
    expect(migration).toContain("p.rol = 'admin'");
    expect(migration).toContain("p.rol = 'personal'");
  });

  it('uses auth.uid-backed security-definer helpers and tenant-isolated RLS', () => {
    expect(migration).toContain('security definer');
    expect(migration).toContain("m.usuario_id = auth.uid()");
    expect(migration).toContain('public.soy_admin_de_empresa(empresa_id)');
    expect(migration).toContain('alter table public.membresias_empresa enable row level security');
    expect(migration).not.toContain('p_usuario_id');
    expect(migration).toContain('revoke all on table public.membresias_empresa from anon, authenticated');
  });
});
