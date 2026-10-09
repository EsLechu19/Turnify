import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0031_mi_cola_con_inicio.sql'),
  'utf8',
);

describe('worker queue attention start', () => {
  it('redefines the worker queue without changing its contract', () => {
    expect(migration).toContain('create or replace function public.mi_cola_barbero()');
    expect(migration).toContain('returns jsonb');
    expect(migration).toContain('security definer');
  });

  it('serves the attention start so the worker can count the elapsed time', () => {
    expect(migration).toContain("'inicio_en', t.inicio_en");
    expect(migration).toContain("'llamado_vencimiento_en', public.vencimiento_efectivo_llamado(t)");
  });
});
