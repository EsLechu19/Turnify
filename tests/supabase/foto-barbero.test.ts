import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0038_foto_barbero.sql'),
  'utf8',
);

describe('worker avatar backend', () => {
  it('stores the photo with owner-only writes on a public bucket', () => {
    expect(migration).toContain('foto_url');
    expect(migration).toContain('avatares-barberos');
    expect(migration).toContain('create or replace function public.actualizar_mi_foto_barbero');
    expect(migration).toContain('mi_barbero_actual_id');
  });

  it('serves the photo in the guest catalog without touching grants', () => {
    expect(migration).toContain("'foto_url', b.foto_url");
    expect(migration).not.toContain('revoke all on function public.catalogo_comercial');
  });
});
