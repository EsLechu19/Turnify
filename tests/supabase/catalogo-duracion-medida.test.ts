import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0035_catalogo_duracion_medida.sql'),
  'utf8',
);

describe('catalog measured duration', () => {
  it('serves a trimmed recent mean without changing the contract', () => {
    expect(migration).toContain('create or replace function public.catalogo_comercial');
    expect(migration).toContain("'duracion_medida_seg'");
    expect(migration).toContain('order by t.fin_en desc limit 30');
    expect(migration).toContain('percentile_cont(0.5)');
  });

  it('keeps the configured estimate and the open catalog grants', () => {
    expect(migration).toContain("'duracion_estimada_seg', s.duracion_estimada_seg");
    expect(migration).not.toContain('revoke all on function public.catalogo_comercial');
  });
});
