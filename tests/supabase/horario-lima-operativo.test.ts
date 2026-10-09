import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0034_horario_lima_operativo.sql'),
  'utf8',
);

describe('operative day in Lima time', () => {
  it('stamps new tickets with the Lima date', () => {
    expect(migration).toContain('alter table public.tickets alter column fecha_operativa');
    expect(migration).toContain("at time zone 'America/Lima'");
  });

  it('closes the day on the Lima boundary and still frees chairs', () => {
    expect(migration).toContain('create or replace function public.cerrar_tickets_vencidos()');
    expect(migration).toContain("fecha_operativa < ((now() at time zone 'America/Lima'))::date");
    expect(migration).toContain("set estado = 'disponible'");
  });
});
