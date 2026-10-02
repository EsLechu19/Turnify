import { getSupabase } from '@/lib/supabase';

export type WorkerAvailability = 'fuera_de_turno' | 'disponible' | 'ocupado';
export type WorkerTicketState = 'en_espera' | 'notificado' | 'llamado' | 'en_atencion';

export type WorkerTicket = {
  ticketId: string;
  queueId: string;
  queueName: string;
  visibleCode: string;
  state: WorkerTicketState;
  serviceName: string | null;
  requestedBarberName: string | null;
  assignedBarberName: string | null;
};

type WorkerQueuePayload = {
  estado: WorkerAvailability;
  tickets: Array<{
    ticket_id: string;
    fila_id: string;
    fila_nombre: string;
    codigo_visible: string;
    estado: WorkerTicketState;
    servicio_nombre: string | null;
    barbero_solicitado_nombre: string | null;
    barbero_asignado_nombre: string | null;
  }>;
};

export async function getWorkerBarberQueue(): Promise<{ availability: WorkerAvailability; tickets: WorkerTicket[] }> {
  const { data, error } = await getSupabase().rpc('mi_cola_barbero');
  if (error) throw new Error(error.message);
  const payload = data as WorkerQueuePayload | null;
  if (!payload) throw new Error('Worker queue returned no data');
  return {
    availability: payload.estado,
    tickets: payload.tickets.map((ticket) => ({
      ticketId: ticket.ticket_id,
      queueId: ticket.fila_id,
      queueName: ticket.fila_nombre,
      visibleCode: ticket.codigo_visible,
      state: ticket.estado,
      serviceName: ticket.servicio_nombre,
      requestedBarberName: ticket.barbero_solicitado_nombre,
      assignedBarberName: ticket.barbero_asignado_nombre,
    })),
  };
}

async function runWorkerAction(rpc: string, args: Record<string, string | boolean>): Promise<void> {
  const { error } = await getSupabase().rpc(rpc, args);
  if (error) throw new Error(error.message);
}

export function setWorkerAvailability(availability: Exclude<WorkerAvailability, 'ocupado'>): Promise<void> {
  return runWorkerAction('cambiar_mi_estado_barbero', { p_estado: availability });
}

export function callMyNextTicket(queueId: string): Promise<void> {
  return runWorkerAction('llamar_mi_siguiente', { p_fila_id: queueId });
}

export function startMyService(ticketId: string): Promise<void> {
  return runWorkerAction('iniciar_mi_atencion', { p_ticket_id: ticketId });
}

export function finishMyService(ticketId: string): Promise<void> {
  return runWorkerAction('finalizar_mi_atencion', { p_ticket_id: ticketId, p_ausente: false });
}

export function markMyTicketAbsent(ticketId: string): Promise<void> {
  return runWorkerAction('finalizar_mi_atencion', { p_ticket_id: ticketId, p_ausente: true });
}

export function translateWorkerBarberError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('perfil de barbero')) return 'Tu cuenta no tiene un perfil de barbero activo.';
  if (normalized.includes('no estás disponible')) return 'Marca tu disponibilidad antes de llamar un turno.';
  if (normalized.includes('ya tienes un turno activo')) return 'Primero resuelve tu turno activo.';
  if (normalized.includes('no te fue asignado')) return 'Este turno ya no está asignado a ti.';
  if (normalized.includes('no hay') || normalized.includes('fila no encontrada')) return 'No hay un turno compatible disponible en esta fila.';
  if (normalized.includes('network') || normalized.includes('fetch')) return 'No pudimos conectar con el servidor. Revisa tu conexión.';
  return 'No pudimos completar la operación. Actualiza la cola e intenta de nuevo.';
}
