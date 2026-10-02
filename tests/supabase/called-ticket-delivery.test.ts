import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(join(root, 'supabase', 'migrations', '0009_called_ticket_delivery.sql'), 'utf8');
const schedule = readFileSync(join(root, 'supabase', 'migrations', '0010_dispatch_ticket_calls_schedule.sql'), 'utf8');
const cronTokenRepair = readFileSync(join(root, 'supabase', 'migrations', '0011_dispatch_ticket_calls_cron_token.sql'), 'utf8');
const functionSource = readFileSync(join(root, 'supabase', 'functions', 'dispatch-ticket-calls', 'index.ts'), 'utf8');

describe('called-ticket delivery outbox', () => {
  it('enqueues only a real customer transition into llamado', () => {
    expect(migration).toContain("new.estado <> 'llamado'");
    expect(migration).toContain("old.estado not in ('en_espera', 'notificado')");
    expect(migration).toContain('or new.cliente_id is null');
    expect(migration).toContain('after update of estado on public.tickets');
  });

  it('deduplicates the event and each recipient before server processing', () => {
    expect(migration).toContain('unique (ticket_id, tipo)');
    expect(migration).toContain('unique (notificacion_id, dispositivo_id)');
    expect(functionSource).toContain('estado=eq.pendiente');
    expect(functionSource).toContain("estado: 'enviando'");
    expect(functionSource).toContain("estado: 'indeterminada'");
  });

  it('requires an explicit successful Expo receipt before recording delivery', () => {
    expect(functionSource).toContain('function successfulProviderReceiptId(payload: unknown): string | null');
    expect(functionSource).toContain('!Array.isArray(response.data) || !receipt || receipt.status !== \'ok\'');
    expect(functionSource).toContain('successfulProviderReceiptId(await provider.json())');
    expect(functionSource).toContain('proveedor_mensaje_id: providerMessageId');
  });

  it('keeps outbox access and provider credentials server-only without token logs', () => {
    expect(migration).toContain('revoke all on table public.notificaciones_salientes, public.notificacion_entregas from anon, authenticated;');
    expect(migration).toContain('to service_role;');
    expect(functionSource).toContain("'SUPABASE_SERVICE_ROLE_KEY'");
    expect(functionSource).toContain("'EXPO_ACCESS_TOKEN'");
    expect(functionSource).toContain("'DISPATCH_TICKET_CALLS_CRON_TOKEN'");
    expect(functionSource).toContain("request.headers.get('authorization')");
    expect(functionSource).toContain('`Bearer ${env.DISPATCH_TICKET_CALLS_CRON_TOKEN}`');
    expect(functionSource).not.toContain('`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`');
    expect(functionSource).not.toMatch(/console\.log\([^\n]*(push_token|EXPO_ACCESS_TOKEN|authorization)/);
  });

  it('replaces service-role scheduler authorization with a dedicated Vault token', () => {
    expect(schedule).toContain('create extension if not exists pg_net;');
    expect(cronTokenRepair).toContain("'turnify-dispatch-ticket-calls'");
    expect(cronTokenRepair).toContain("'turnify_project_url'");
    expect(cronTokenRepair).toContain("'turnify_dispatch_ticket_calls_cron_token'");
    expect(cronTokenRepair).toContain("'/functions/v1/dispatch-ticket-calls'");
    expect(cronTokenRepair).toContain("'Authorization', 'Bearer ' ||");
    expect(cronTokenRepair).not.toContain('turnify_service_role_key');
    expect(cronTokenRepair).not.toMatch(/(eyJ[a-zA-Z0-9_-]+\.|service_role\s*=|https:\/\/[^']+\.supabase\.co)/);
  });

  it('emits exactly the strict mobile routing contract without recipient data', () => {
    expect(functionSource).toContain('notificacion:notificaciones_salientes(ticket_id,ticket:tickets(fila_id))');
    expect(functionSource).toContain("type: 'turnify.ticket-called'");
    expect(functionSource).toContain('ticketId: delivery.notificacion.ticket_id');
    expect(functionSource).toContain('queueId: delivery.notificacion.ticket.fila_id');
    expect(functionSource).not.toContain('notificationId: delivery.notificacion_id');
  });
});
