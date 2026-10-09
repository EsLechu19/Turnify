import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0026_vencimiento_efectivo.sql'),
  'utf8',
);

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('extended tolerance deadline', () => {
  it('computes the effective deadline with a single two-minute extension', () => {
    expect(migration).toContain('create or replace function public.vencimiento_efectivo_llamado');
    expect(migration).toContain("interval '2 minutes'");
    expect(migration).toContain('llega_en_2_min');
  });

  it('sweeps absences and serves states against the effective deadline', () => {
    expect(migration).toContain('create or replace function public.marcar_ausentes');
    expect(migration).toContain('create or replace function public.estado_ticket_invitado');
    expect(migration).toContain('vencimiento_efectivo_llamado');
  });

  it('restores the worker queue snapshots dropped by the previous rewrite', () => {
    expect(migration).toContain('create or replace function public.mi_cola_barbero');
    expect(migration).toContain('llamado_vencimiento_en');
    expect(migration).toContain('respuesta_cliente');
    expect(migration).toContain('personas_delante');
    expect(migration).toContain('espera_min');
  });

  it('offers a new ticket after no-show with honest tolerance copy', () => {
    const completed = source('../../apps/mobile/src/components/customer/completed-guest-ticket.tsx');
    const called = source('../../apps/mobile/src/components/customer/called-guest-ticket.tsx');

    expect(completed).toContain('Sacar otro turno');
    expect(called).toContain('una sola vez');
  });
});
