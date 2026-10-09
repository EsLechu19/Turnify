import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0029_presente_auto_atencion.sql'),
  'utf8',
);

describe('presente auto-attention and absence from in-service', () => {
  it('brings the effective deadline machinery that production lacks', () => {
    expect(migration).toContain('create or replace function public.vencimiento_efectivo_llamado');
    expect(migration).toContain("then v_ticket.llamado_vencimiento_en + interval '2 minutes'");
  });

  it('starts the service at once when the client says presente', () => {
    expect(migration).toContain('create or replace function public.responder_llamado_invitado');
    expect(migration).toContain("set estado = 'en_atencion', inicio_en = now()");
    expect(migration).toContain('El turno ya está en atención');
  });

  it('lets the worker mark absent from llamado or in-service and frees the chair', () => {
    expect(migration).toContain('create or replace function public.finalizar_mi_atencion');
    expect(migration).toContain("estado in ('llamado', 'en_atencion')");
    expect(migration).toContain("set estado = 'disponible'");
  });

  it('keeps the sweep effective and serving the effective deadline on both sides', () => {
    expect(migration).toContain('vencimiento_efectivo_llamado(tickets)');
    expect(migration).toContain("'llamado_vencimiento_en', public.vencimiento_efectivo_llamado(t)");
  });
});
