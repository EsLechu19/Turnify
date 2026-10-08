import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0025_ticket_feedback.sql'),
  'utf8',
);

describe('ticket feedback migration', () => {
  it('creates ticket_calificaciones table with moderation state and references', () => {
    expect(migration).toContain('create table public.ticket_calificaciones');
    expect(migration).toContain("estado_moderacion text not null default 'pendiente'");
    expect(migration).toContain("check (puntuacion between 1 and 5)");
    expect(migration).toContain("check (char_length(btrim(comentario)) <= 1000)");
  });

  it('implements row level security to isolate feedback properly', () => {
    expect(migration).toContain('calificaciones_admin_select');
    expect(migration).toContain('calificaciones_personal_select');
    expect(migration).toContain("estado_moderacion = 'aprobado'");
    expect(migration).toContain('calificaciones_cliente_select');
  });

  it('exposes rating and duration timestamps in guest state retrieval', () => {
    const guestState = migration.slice(migration.indexOf('create or replace function public.estado_ticket_invitado'), migration.indexOf('create or replace function public.calificar_ticket_invitado'));
    expect(guestState).toContain("'calificacion',v_calificacion.puntuacion");
    expect(guestState).toContain("'comentario',v_calificacion.comentario");
    expect(guestState).toContain("'inicio_en',v_ticket.inicio_en");
    expect(guestState).toContain("'fin_en',v_ticket.fin_en");
  });

  it('provides idempotent rating functions for guests and authenticated customers', () => {
    const guestRating = migration.slice(migration.indexOf('create or replace function public.calificar_ticket_invitado'));
    expect(guestRating).toContain("on conflict (ticket_id) do update set");
    expect(guestRating).toContain("puntuacion = excluded.puntuacion");
    expect(guestRating).toContain("v_ticket.estado <> 'finalizado'");

    expect(migration).toContain('create or replace function public.calificar_mi_ticket');
  });
});
