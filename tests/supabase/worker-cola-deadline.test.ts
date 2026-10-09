import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0028_mi_cola_con_deadline.sql'),
  'utf8',
);

describe('worker queue called deadline', () => {
  it('redefines the worker queue without changing its contract', () => {
    expect(migration).toContain('create or replace function public.mi_cola_barbero()');
    expect(migration).toContain('returns jsonb');
    expect(migration).toContain('security definer');
  });

  it('returns the raw called deadline so the worker stays in sync with the client', () => {
    expect(migration).toContain("'llamado_vencimiento_en', t.llamado_vencimiento_en");
    expect(migration).not.toContain('vencimiento_efectivo_llamado');
  });

  it('restores the client response fields and keeps the position estimates', () => {
    expect(migration).toContain("'respuesta_cliente', t.respuesta_cliente");
    expect(migration).toContain("'respuesta_cliente_en', t.respuesta_cliente_en");
    expect(migration).toContain("'personas_delante'");
    expect(migration).toContain("'espera_min'");
  });
});
