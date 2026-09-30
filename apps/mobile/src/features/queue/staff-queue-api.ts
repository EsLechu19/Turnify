import { getSupabase } from '@/lib/supabase';

export type StaffQueue = {
  id: string;
  name: string;
  waiting: number;
  lastCalledCode: string | null;
};

export type StaffTicketState = 'en_espera' | 'notificado' | 'llamado' | 'en_atencion';

export type StaffTicket = {
  id: string;
  queueId: string;
  visibleCode: string;
  state: StaffTicketState;
  origin: 'app' | 'presencial';
  priority: 'normal' | 'preferencial';
};

type StaffQueueRow = {
  id: string;
  nombre: string;
  en_espera: number;
  ultimo_llamado: string | null;
};

type StaffTicketRow = {
  id: string;
  fila_id: string;
  codigo_visible: string;
  estado: StaffTicketState;
  origen: 'app' | 'presencial';
  prioridad: 'normal' | 'preferencial';
};

const activeStates: StaffTicketState[] = ['llamado', 'en_atencion', 'notificado', 'en_espera'];

function toQueue(row: StaffQueueRow): StaffQueue {
  return {
    id: row.id,
    name: row.nombre,
    waiting: row.en_espera,
    lastCalledCode: row.ultimo_llamado,
  };
}

function toTicket(row: StaffTicketRow): StaffTicket {
  return {
    id: row.id,
    queueId: row.fila_id,
    visibleCode: row.codigo_visible,
    state: row.estado,
    origin: row.origen,
    priority: row.prioridad,
  };
}

function ticketRank(ticket: StaffTicket): number {
  const stateRank: Record<StaffTicketState, number> = {
    llamado: 0,
    en_atencion: 1,
    notificado: 2,
    en_espera: 3,
  };
  return stateRank[ticket.state] * 2 + (ticket.priority === 'preferencial' ? 0 : 1);
}

export function sortStaffTickets(tickets: StaffTicket[]): StaffTicket[] {
  return [...tickets].sort((left, right) => {
    const rankDifference = ticketRank(left) - ticketRank(right);
    return rankDifference || left.visibleCode.localeCompare(right.visibleCode);
  });
}

export async function getStaffQueue(businessId: string): Promise<{ queues: StaffQueue[]; tickets: StaffTicket[] }> {
  const supabase = getSupabase();
  const [queuesResult, ticketsResult] = await Promise.all([
    supabase
      .from('filas')
      .select('id, nombre, en_espera, ultimo_llamado')
      .eq('empresa_id', businessId)
      .order('nombre'),
    supabase
      .from('tickets')
      .select('id, fila_id, codigo_visible, estado, origen, prioridad')
      .eq('empresa_id', businessId)
      .in('estado', activeStates),
  ]);

  if (queuesResult.error) {
    throw new Error(queuesResult.error.message);
  }
  if (ticketsResult.error) {
    throw new Error(ticketsResult.error.message);
  }

  return {
    queues: (queuesResult.data as StaffQueueRow[]).map(toQueue),
    tickets: sortStaffTickets((ticketsResult.data as StaffTicketRow[]).map(toTicket)),
  };
}

async function runStaffAction(rpc: string, ticketId: string): Promise<void> {
  const { error } = await getSupabase().rpc(rpc, { p_ticket_id: ticketId });
  if (error) {
    throw new Error(error.message);
  }
}

export async function callNextTicket(queueId: string): Promise<StaffTicket | null> {
  const { data, error } = await getSupabase().rpc('llamar_siguiente', { p_fila_id: queueId });
  if (error) {
    throw new Error(error.message);
  }
  return data ? toTicket(data as StaffTicketRow) : null;
}

export function startService(ticketId: string): Promise<void> {
  return runStaffAction('iniciar_atencion', ticketId);
}

export function finishService(ticketId: string): Promise<void> {
  return runStaffAction('finalizar_atencion', ticketId);
}

export function markAbsent(ticketId: string): Promise<void> {
  return runStaffAction('marcar_ausente', ticketId);
}

export function translateStaffQueueError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('fila no encontrada')) return 'La fila seleccionada ya no está disponible.';
  if (normalized.includes('no está llamado')) return 'Este turno ya no está llamado.';
  if (normalized.includes('no está en atención')) return 'Este turno ya no está en atención.';
  if (normalized.includes('solo el personal')) return 'No tienes permiso para realizar esta acción.';
  if (normalized.includes('debes iniciar sesión')) return 'Tu sesión ya no es válida. Ingresa nuevamente.';
  if (normalized.includes('network') || normalized.includes('fetch')) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión.';
  }
  return 'No pudimos completar la operación. Intenta de nuevo.';
}
