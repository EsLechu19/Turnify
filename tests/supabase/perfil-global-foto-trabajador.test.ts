import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0042_perfil_global_foto_trabajador.sql'),
  'utf8',
);

describe('worker global photo backend', () => {
  it('adds a forward-only global photo column on perfiles with worker-only writes', () => {
    expect(migration).toContain('alter table public.perfiles add column if not exists foto_url');
    expect(migration).toContain('grant update (foto_url)');
    expect(migration).toContain('create or replace function public.actualizar_mi_foto_barbero');
    expect(migration).toContain('update public.perfiles set foto_url');
  });

  it('resolves the global photo in the guest catalog with per-shop fallback', () => {
    expect(migration).toContain('coalesce(p.foto_url, b.foto_url)');
    expect(migration).toContain("'foto_url', coalesce(p.foto_url, b.foto_url)");
    expect(migration).not.toContain('revoke all on function public.catalogo_comercial');
  });
});
