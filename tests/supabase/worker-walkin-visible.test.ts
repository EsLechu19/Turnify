import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

const migration = read('supabase', 'migrations', '0049_ticket_manual_visible.sql');
const walkinApi = read('apps', 'mobile', 'src', 'features', 'queue', 'worker-barber-api.ts');

describe('manual ticket visibility', () => {
  it('shows walk-in tickets in the worker queue scoped to their creator', () => {
    expect(migration).toContain('create or replace function public.mi_cola_barbero()');
    expect(migration).toContain('t.servicio_id is null and t.barbero_solicitado_id=v_barbero.id');
    expect(migration).toContain("'inicio_en', t.inicio_en");
    expect(migration).toContain("'personas_delante'");
  });

  it('lets llamar_mi_siguiente fall back to walk-ins after compatible tickets', () => {
    expect(migration).toContain('create or replace function public.llamar_mi_siguiente(p_fila_id uuid)');
    expect(migration).toContain('t.servicio_id is null and t.barbero_solicitado_id=v_id');
    expect(migration).toContain('minutos_gracia');
  });

  it('labels manual options with the real service name instead of the queue name', () => {
    expect(walkinApi).toContain('name: service?.nombre ?? queue.name');
  });
});
