import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0024_estaciones_de_mi_empresa.sql'),
  'utf8',
);

describe('shop stations rpc migration', () => {
  it('exposes linked roster barbers with operational state and active ticket', () => {
    expect(migration).toContain('create or replace function public.estaciones_de_mi_empresa');
    expect(migration).toContain('b.perfil_id is not null');
    expect(migration).toContain('membresias_personal_empresa');
    expect(migration).toContain('barbero_operaciones');
  });

  it('restricts station reads to staff of the selected shop', () => {
    expect(migration).toContain('mi_empresa_personal_actual_id');
    expect(migration).toContain('grant execute on function public.estaciones_de_mi_empresa() to authenticated;');
  });
});
