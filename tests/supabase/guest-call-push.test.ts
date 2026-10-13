import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

const migration = read('supabase', 'migrations', '0046_guest_call_push.sql');
const functionSource = read('supabase', 'functions', 'dispatch-ticket-calls', 'index.ts');
const details = read('apps', 'mobile', 'src', 'app', '(public)', 'details.tsx');
const guestApi = read('apps', 'mobile', 'src', 'features', 'notifications', 'guest-device-api.ts');

describe('guest llamado push devices', () => {
  it('binds tokens to tickets with expiry and keeps them server-only', () => {
    expect(migration).toContain('create table public.dispositivos_invitados');
    expect(migration).toContain("interval '1 day'");
    expect(migration).toContain('unique (push_token, ticket_id)');
    expect(migration).toContain('revoke all on table public.dispositivos_invitados from anon, authenticated;');
    expect(migration).toContain('grant execute on function public.registrar_dispositivo_invitado(text, uuid, text) to anon, authenticated;');
    expect(migration).toContain('grant execute on function public.revocar_dispositivo_invitado(text, uuid, text) to anon, authenticated;');
  });

  it('verifies the capability exactly like the other guest RPCs and never stores it', () => {
    expect(migration).toContain("extensions.digest(coalesce(p_capacidad, ''), 'sha256')");
    expect(migration).toContain("t.estado in ('en_espera', 'notificado')");
    expect(migration).toContain('on conflict (push_token, ticket_id) do update');
    expect(migration).not.toMatch(/capacidad text[^)]*,\s*\n?.*dispositivos_invitados/);
  });

  it('enqueues only real guest transitions into llamado with at-most-once kept', () => {
    expect(migration).toContain("or new.cliente_id is not null");
    expect(migration).toContain("new.estado <> 'llamado'");
    expect(migration).toContain("old.estado not in ('en_espera', 'notificado')");
    expect(migration).toContain('on conflict (ticket_id, tipo) do nothing');
    expect(migration).toContain("d.expira_en > now()");
    expect(migration).toContain("set estado = 'sin_destinatarios'");
    expect(migration).toContain('after update of estado on public.tickets');
  });

  it('delivers to guest devices through the same outbox without duplicating alerts', () => {
    expect(functionSource).toContain('dispositivo_invitado:dispositivos_invitados(push_token)');
    expect(functionSource).toContain('delivery.dispositivo?.push_token ?? delivery.dispositivo_invitado?.push_token');
    expect(functionSource).toContain('notificacion:notificaciones_salientes(ticket_id,ticket:tickets(fila_id))');
    expect(functionSource).toContain("expira_en=lt.");
  });
});

describe('guest push app wiring', () => {
  it('registers best-effort at confirm time without blocking navigation', () => {
    expect(details).toContain('registerGuestDeviceForTicket');
    expect(details).toContain('void registerGuestDeviceForTicket(access.ticketId, access.capability);');
    expect(details).toContain("router.replace('/(public)/ticket');");
  });

  it('never persists the capability and degrades without push runtime', () => {
    expect(guestApi).toContain('isPushRuntimeSupported');
    expect(guestApi).toContain('expo_project_id_missing');
    expect(guestApi).not.toMatch(/AsyncStorage|SecureStore|localStorage/);
  });
});
