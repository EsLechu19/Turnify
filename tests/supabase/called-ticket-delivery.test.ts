import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(join(root, 'supabase', 'migrations', '0009_called_ticket_delivery.sql'), 'utf8');
const schedule = readFileSync(join(root, 'supabase', 'migrations', '0010_dispatch_ticket_calls_schedule.sql'), 'utf8');
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

  it('keeps outbox access and provider credentials server-only without token logs', () => {
    expect(migration).toContain('revoke all on table public.notificaciones_salientes, public.notificacion_entregas from anon, authenticated;');
    expect(migration).toContain('to service_role;');
    expect(functionSource).toContain("'SUPABASE_SERVICE_ROLE_KEY'");
    expect(functionSource).toContain("'EXPO_ACCESS_TOKEN'");
    expect(functionSource).toContain("request.headers.get('authorization')");
    expect(functionSource).not.toMatch(/console\.log\([^\n]*(push_token|EXPO_ACCESS_TOKEN|authorization)/);
  });

  it('schedules only a Vault-authenticated server invocation', () => {
    expect(schedule).toContain('create extension if not exists pg_net;');
    expect(schedule).toContain("'turnify_project_url'");
    expect(schedule).toContain("'turnify_service_role_key'");
    expect(schedule).toContain("'/functions/v1/dispatch-ticket-calls'");
    expect(schedule).toContain("'Authorization', 'Bearer ' ||");
    expect(schedule).not.toMatch(/(eyJ[a-zA-Z0-9_-]+\.|service_role\s*=|https:\/\/[^']+\.supabase\.co)/);
  });

  it('emits exactly the strict mobile routing contract without recipient data', () => {
    expect(functionSource).toContain('notificacion:notificaciones_salientes(ticket_id,ticket:tickets(fila_id))');
    expect(functionSource).toContain("type: 'turnify.ticket-called'");
    expect(functionSource).toContain('ticketId: delivery.notificacion.ticket_id');
    expect(functionSource).toContain('queueId: delivery.notificacion.ticket.fila_id');
    expect(functionSource).not.toContain('notificationId: delivery.notificacion_id');
  });
});
