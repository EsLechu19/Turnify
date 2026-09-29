import { getSupabase } from '@/lib/supabase';

export type QueueSummary = {
  id: string;
  name: string;
  waiting: number;
  waitMinutes: number;
};

export type BusinessSummary = {
  name: string;
  isOpen: boolean;
  queues: QueueSummary[];
};

export type CreatedTicket = {
  id: string;
  queueId: string;
};

export type TicketState = {
  visibleCode: string;
  status: 'en_espera' | 'notificado' | 'llamado' | 'en_atencion' | 'finalizado' | 'cancelado' | 'ausente';
  peopleAhead: number;
  waitMinutes: number;
};

type BusinessSummaryPayload = {
  nombre: string;
  abierta: boolean;
  filas: Array<{
    fila_id: string;
    nombre: string;
    en_espera: number;
    espera_min: number;
  }>;
};

type CreatedTicketPayload = {
  id: string;
  fila_id: string;
};

type TicketStatePayload = {
  codigo_visible: string;
  estado: TicketState['status'];
  personas_delante: number;
  espera_min: number;
};

export function normalizeBusinessCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9-]{3,32}$/.test(code) ? code : null;
}

export function parseTurnifyQr(value: string): string | null {
  const payload = value.trim();
  const code = payload.toLowerCase().startsWith('turnify:') ? payload.slice(8) : payload;
  return normalizeBusinessCode(code);
}

export async function getBusinessSummary(code: string): Promise<BusinessSummary> {
  const { data, error } = await getSupabase().rpc('resumen_empresa', { p_codigo: code });
  if (error) {
    throw new Error(error.message);
  }

  const payload = data as BusinessSummaryPayload;
  return {
    name: payload.nombre,
    isOpen: payload.abierta,
    queues: payload.filas.map((queue) => ({
      id: queue.fila_id,
      name: queue.nombre,
      waiting: queue.en_espera,
      waitMinutes: queue.espera_min,
    })),
  };
}

export async function takeTurn(code: string, queueId: string): Promise<CreatedTicket> {
  const { data, error } = await getSupabase().rpc('tomar_turno', {
    p_codigo: code,
    p_fila_id: queueId,
  });
  if (error) {
    throw new Error(error.message);
  }

  const ticket = data as CreatedTicketPayload;
  return { id: ticket.id, queueId: ticket.fila_id };
}

export async function getMyTicketState(ticketId: string): Promise<TicketState> {
  const { data, error } = await getSupabase().rpc('mi_ticket_estado', { p_ticket_id: ticketId });
  if (error) {
    throw new Error(error.message);
  }

  const ticket = data as TicketStatePayload;
  return {
    visibleCode: ticket.codigo_visible,
    status: ticket.estado,
    peopleAhead: ticket.personas_delante,
    waitMinutes: ticket.espera_min,
  };
}

export async function cancelTicket(ticketId: string): Promise<void> {
  const { error } = await getSupabase().rpc('cancelar_ticket', { p_ticket_id: ticketId });
  if (error) {
    throw new Error(error.message);
  }
}

export function translateQueueError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('empresa no encontrada')) return 'No encontramos una empresa con ese código.';
  if (normalized.includes('fila no encontrada')) return 'La fila seleccionada ya no está disponible.';
  if (normalized.includes('empresa está cerrada')) return 'Esta empresa está cerrada en este momento.';
  if (normalized.includes('ya tienes un turno activo')) return 'Ya tienes un turno activo.';
  if (normalized.includes('ticket no encontrado')) return 'No encontramos este turno.';
  if (normalized.includes('solo puedes cancelar')) return 'Este turno ya no puede cancelarse.';
  if (normalized.includes('network') || normalized.includes('fetch')) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión.';
  }
  return 'No pudimos completar la operación. Intenta de nuevo.';
}
