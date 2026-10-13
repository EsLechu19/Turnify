import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0036_gracia_configurable.sql'),
  'utf8',
);

describe('configurable grace window', () => {
  it('stamps the call deadline from the company grace in both call paths', () => {
    expect(migration).toContain('create or replace function public.llamar_siguiente');
    expect(migration).toContain('create or replace function public.llamar_mi_siguiente');
    expect(migration).toContain('minutos_gracia');
    expect(migration).not.toContain("interval '5 minutes'");
  });

  it('serves the grace minutes to the guest payload', () => {
    expect(migration).toContain("'gracia_min'");
  });
});
