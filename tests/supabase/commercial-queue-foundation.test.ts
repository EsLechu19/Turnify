import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0012_commercial_queue_foundation.sql'),
  'utf8',
);

describe('commercial queue foundation migration', () => {
  it('adds additive service, barber capability, operational state, and ticket snapshots', () => {
    expect(migration).toContain('create table public.servicios');
    expect(migration).toContain('create table public.barberos');
    expect(migration).toContain('create table public.barbero_servicios');
    expect(migration).toContain('create table public.barbero_operaciones');
    expect(migration).toContain("'fuera_de_turno', 'disponible', 'ocupado'");
    expect(migration).toContain('add column if not exists servicio_nombre text');
    expect(migration).toContain('add column if not exists barbero_solicitado_id uuid');
    expect(migration).toContain('add column if not exists barbero_asignado_id uuid');
  });

  it('keeps busy named barbers valid and routes any-available tickets deterministically', () => {
    expect(migration).toContain("bo.estado <> 'fuera_de_turno'");
    expect(migration).toContain("case bo.estado when 'disponible' then 0 else 1 end");
    expect(migration).toContain('count(t.id), b.nombre, b.id');
    expect(migration).toContain('tomar_turno_comercial');
  });

  it('keeps catalog access narrow and validates tenant-compatible assignments', () => {
    expect(migration).toContain('create or replace function public.catalogo_comercial');
    expect(migration).toContain('grant execute on function public.catalogo_comercial(text) to anon, authenticated;');
    expect(migration).toContain('El barbero asignado no es compatible con el servicio');
    expect(migration).toContain('Los snapshots de servicio y barbero solicitado son inmutables');
    expect(migration).toContain('trg_tickets_validar_ruta_comercial');
  });
});
