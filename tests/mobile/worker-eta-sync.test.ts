import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0025_mi_cola_con_espera.sql'),
  'utf8',
);

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('synchronized worker ETA', () => {
  it('serves per-ticket queue position and wait minutes from the worker queue', () => {
    expect(migration).toContain('create or replace function public.mi_cola_barbero');
    expect(migration).toContain('personas_delante');
    expect(migration).toContain('espera_min');
    expect(migration).toContain('duracion_promedio_seg');
  });

  it('renders the server ETA instead of invented times in the worker panel', () => {
    const jornada = source('../../apps/mobile/src/app/(app)/worker.tsx');
    const queue = source('../../apps/mobile/src/app/(app)/worker-queue.tsx');
    const api = source('../../apps/mobile/src/features/queue/worker-barber-api.ts');

    expect(jornada).not.toContain('~5 min de espera');
    expect(jornada).not.toContain('index * 5 + 5');
    expect(jornada).toContain('waitMinutes');
    expect(queue).toContain('waitMinutes');
    expect(api).toContain('personas_delante');
    expect(api).toContain('espera_min');
  });
});
