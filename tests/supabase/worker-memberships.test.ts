import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(join(root, 'supabase', 'migrations', '0019_worker_memberships.sql'), 'utf8');

describe('worker membership migration', () => {
  it('models active, revocable multi-shop memberships and a selected shop', () => {
    expect(migration).toContain('create table public.membresias_personal_empresa');
    expect(migration).toContain('activa boolean not null default true');
    expect(migration).toContain('empresa_personal_actual_id');
    expect(migration).toContain('seleccionar_mi_empresa_personal');
  });

  it('authorizes worker operations from the server-owned selected membership', () => {
    expect(migration).toContain('mi_empresa_personal_actual_id');
    expect(migration).toContain('Selecciona una barbería aprobada antes de operar');
    expect(migration).toContain('and empresa_id=v_empresa');
  });

  it('lets only an administrator add an existing personal account by exact email', () => {
    expect(migration).toContain("where id = auth.uid() and rol = 'admin'");
    expect(migration).toContain('lower(u.email) = lower(btrim(p_email))');
    expect(migration).toContain("p.rol = 'personal'");
  });
});
