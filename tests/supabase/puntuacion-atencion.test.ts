import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0030_puntuacion_atencion.sql'),
  'utf8',
);

describe('guest attention rating', () => {
  it('stores the vote on the ticket with a 1 to 5 guard', () => {
    expect(migration).toContain('add column if not exists puntuacion');
    expect(migration).toContain('puntuacion between 1 and 5');
    expect(migration).toContain('puntuacion_en');
  });

  it('accepts the vote only on a finished visit through the guest capability', () => {
    expect(migration).toContain('create or replace function public.puntuar_atencion_invitado');
    expect(migration).toContain('acceso_publico_hash');
    expect(migration).toContain("v_ticket.estado <> 'finalizado'");
    expect(migration).toContain('grant execute on function public.puntuar_atencion_invitado');
  });

  it('exposes the vote to the guest state and aggregates it per barber', () => {
    expect(migration).toContain("'puntuacion',v_ticket.puntuacion");
    expect(migration).toContain('create or replace function public.metricas_puntuacion');
    expect(migration).toContain('promedio');
  });
});
