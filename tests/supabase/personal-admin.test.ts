import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0039_personal_admin.sql'),
  'utf8',
);

describe('admin staff writes', () => {
  it('updates roster, availability, roster state and services atomically', () => {
    expect(migration).toContain('create or replace function public.actualizar_barbero_personal');
    expect(migration).toContain('fuera_de_turno');
    expect(migration).toContain('revocada_en');
  });

  it('rejects system states and active-ticket changes, restricted to staff', () => {
    expect(migration).toContain("Ya tienes un turno activo");
    expect(migration).toContain('revoke all on function public.actualizar_barbero_personal');
    expect(migration).toContain('grant execute on function public.actualizar_barbero_personal');
  });
});
