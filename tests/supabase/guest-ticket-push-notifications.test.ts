import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0023_guest_ticket_push_notifications.sql'),
  'utf8',
);

describe('guest ticket push notifications migration', () => {
  it('modifies dispositivos table to support ticket_id ownership without breaking usuario_id', () => {
    expect(migration).toContain('alter table public.dispositivos alter column usuario_id drop not null');
    expect(migration).toContain('add column ticket_id uuid references public.tickets(id) on delete cascade');
    expect(migration).toContain('dispositivos_owner_ck');
  });

  it('modifies outbox payload tracking to allow missing cliente_id for anonymous guests', () => {
    expect(migration).toContain('alter table public.notificaciones_salientes alter column cliente_id drop not null');
  });

  it('updates the called-ticket delivery trigger to map guest recipients by ticket_id', () => {
    expect(migration).toContain('create or replace function public.encolar_entrega_ticket_llamado()');
    expect(migration).toContain('(new.cliente_id is null and d.ticket_id = new.id)');
  });

  it('exposes narrow RPCs to register and revoke guest devices via unguessable capability hash', () => {
    expect(migration).toContain('create or replace function public.registrar_dispositivo_invitado');
    expect(migration).toContain('acceso_publico_hash = extensions.digest(p_capacidad, \'sha256\')');
    expect(migration).toContain('create or replace function public.revocar_dispositivo_invitado');
    expect(migration).toContain('delete from public.dispositivos');
    expect(migration).toContain('ticket_id = p_ticket_id');
  });

  it('automatically revokes guest devices when the ticket reaches a terminal state', () => {
    expect(migration).toContain('create or replace function public.limpiar_dispositivos_invitado_terminal()');
    expect(migration).toContain('delete from public.dispositivos where ticket_id = new.id');
    expect(migration).toContain('create trigger trg_tickets_limpiar_dispositivos_invitado');
    expect(migration).toContain('when (new.cliente_id is null)');
  });
});
