import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0033_demanda_lima.sql'),
  'utf8',
);

describe('hourly demand baseline in Lima time', () => {
  it('follows the shop clock instead of the database UTC clock', () => {
    expect(migration).toContain('create or replace function public.demanda_estimada');
    expect(migration).toContain("at time zone 'America/Lima'");
    expect(migration).toContain('generate_series(0, 23)');
  });

  it('restricts the baseline to staff', () => {
    expect(migration).toContain('revoke all on function public.demanda_estimada(integer) from public;');
    expect(migration).toContain('grant execute on function public.demanda_estimada(integer) to authenticated;');
  });
});
