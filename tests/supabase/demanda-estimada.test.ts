import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0032_demanda_estimada.sql'),
  'utf8',
);

describe('hourly demand baseline', () => {
  it('defines a company-scoped weekday baseline over full days', () => {
    expect(migration).toContain('create or replace function public.demanda_estimada');
    expect(migration).toContain('generate_series(0, 23)');
    expect(migration).toContain('isodow');
    expect(migration).toContain('mi_empresa_id');
  });

  it('restricts the baseline to staff', () => {
    expect(migration).toContain('revoke all on function public.demanda_estimada(integer) from public;');
    expect(migration).toContain('grant execute on function public.demanda_estimada(integer) to authenticated;');
  });
});
