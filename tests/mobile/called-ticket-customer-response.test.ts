import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');
const guestApi = read('apps', 'mobile', 'src', 'features', 'queue', 'public-guest-ticket-api.ts');
const workerApi = read('apps', 'mobile', 'src', 'features', 'queue', 'worker-barber-api.ts');
const calledScreen = read('apps', 'mobile', 'src', 'components', 'customer', 'called-guest-ticket.tsx');
const ticketRoute = read('apps', 'mobile', 'src', 'app', '(public)', 'ticket.tsx');
const workerRoute = read('apps', 'mobile', 'src', 'app', '(app)', 'worker.tsx');

describe('called-ticket customer response mobile contract', () => {
  it('maps only the capability-bound guest response RPC and deadline state', () => {
    expect(guestApi).toContain("rpc('responder_llamado_invitado'");
    expect(guestApi).toContain('p_capacidad: access.capability');
    expect(guestApi).toContain('calledDeadlineAt: ticket.llamado_vencimiento_en');
    expect(guestApi).toContain('customerResponse: ticket.respuesta_cliente');
  });

  it('renders real response actions and a countdown derived from the server deadline without promising extra time', () => {
    expect(calledScreen).toContain('remainingSeconds(ticket.calledDeadlineAt)');
    expect(calledScreen).toContain('Ya estoy aquí');
    expect(calledScreen).toContain('Llego en 2 minutos');
    expect(calledScreen).toContain('Ninguna respuesta cambia ni agrega tiempo a tu tolerancia.');
    expect(calledScreen).toContain("onRespond('presente')");
    expect(calledScreen).toContain("onRespond('llega_en_2_min')");
  });

  it('submits then refreshes the called state while preserving the existing realtime ticket refresh', () => {
    expect(ticketRoute).toContain('await respondToCalledGuestTicket(ticketAccess, response);');
    expect(ticketRoute).toContain('await refresh();');
    expect(ticketRoute).toContain("table: 'tickets'");
    expect(ticketRoute).toContain('status?.isCompletedTurn');
  });

  it('maps and displays selected-shop Worker response visibility with remaining real time', () => {
    expect(workerApi).toContain('calledDeadlineAt: ticket.llamado_vencimiento_en');
    expect(workerApi).toContain('customerResponse: ticket.respuesta_cliente');
    expect(workerRoute).toContain('useRemainingTolerance(ticket.calledDeadlineAt)');
    expect(workerRoute).toContain("'Cliente: ya está aquí'");
    expect(workerRoute).toContain("'Cliente: llega en 2 minutos'");
    expect(workerRoute).toContain('La respuesta no inicia ni extiende la atención.');
  });
});
