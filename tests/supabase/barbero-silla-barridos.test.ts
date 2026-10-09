import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0027_liberar_silla_en_barridos.sql'),
  'utf8',
);

describe('barber chair release in batch sweeps', () => {
  it('redefines both sweeps without changing their contract', () => {
    expect(migration).toContain('create or replace function public.marcar_ausentes()');
    expect(migration).toContain('create or replace function public.cerrar_tickets_vencidos()');
    expect(migration).toContain('returns integer');
    expect(migration).toContain('security definer');
  });

  it('releases only stranded ocupado chairs back to disponible', () => {
    expect(migration).toContain("update public.barbero_operaciones");
    expect(migration).toContain("bo.estado = 'ocupado'");
    expect(migration).toContain("set estado = 'disponible'");
    expect(migration).toContain("t.estado in ('llamado', 'en_atencion')");
    expect(migration).not.toContain("set estado = 'fuera_de_turno'");
  });

  it('repairs chairs stranded before this migration', () => {
    expect(migration).toContain('-- One-time repair');
  });
});
