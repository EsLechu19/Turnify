import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0023_worker_linked_catalog.sql'),
  'utf8',
);

describe('worker-linked catalog migration', () => {
  it('only lists catalog barbers backed by a real worker account', () => {
    expect(migration).toContain('create or replace function public.catalogo_comercial');
    expect(migration).toContain('b.perfil_id is not null');
    expect(migration).toContain('membresias_personal_empresa');
  });

  it('rejects named requests and auto-routes away from unlinked roster barbers', () => {
    expect(migration).toContain('create or replace function public.tomar_turno_comercial');
    expect(migration).toContain('El barbero solicitado no tiene una cuenta de trabajador activa');
  });

  it('keeps the public catalog grant and the on-shift ordering untouched', () => {
    expect(migration).toContain('grant execute on function public.catalogo_comercial(text) to anon, authenticated;');
    expect(migration).toContain("bo.estado <> 'fuera_de_turno'");
  });
});
