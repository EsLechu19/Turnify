import { getSupabase } from '@/lib/supabase';
import { getWorkerShops } from '@/features/worker/worker-membership-api';

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
  calledDeadlineAt: string | null;
  customerResponse: 'presente' | 'llega_en_2_min' | null;
  customerResponseAt: string | null;
  peopleAhead: number;
  waitMinutes: number;
};

export type ReassignmentCandidate = {
  barberId: string;
  name: string;
};

export type WorkerHistoryEntry = {
  ticketId: string;
  visibleCode: string;
  queueName: string;
  serviceName: string | null;
  state: 'finalizado' | 'ausente';
  completedAt: string | null;
  clientName: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationSeconds: number | null;
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
    llamado_vencimiento_en: string | null;
    respuesta_cliente: WorkerTicket['customerResponse'];
    respuesta_cliente_en: string | null;
    personas_delante: number;
    espera_min: number;
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
      calledDeadlineAt: ticket.llamado_vencimiento_en,
      customerResponse: ticket.respuesta_cliente,
      customerResponseAt: ticket.respuesta_cliente_en,
      peopleAhead: ticket.personas_delante,
      waitMinutes: ticket.espera_min,
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

export async function getReassignmentCandidates(ticketId: string): Promise<ReassignmentCandidate[]> {
  const { data, error } = await getSupabase().rpc('barberos_reasignables', { p_ticket_id: ticketId });
  if (error) throw new Error(error.message);
  return (data as Array<{ barbero_id: string; nombre: string }> | null ?? []).map((barber) => ({
    barberId: barber.barbero_id,
    name: barber.nombre,
  }));
}

export function reassignCalledTicket(ticketId: string, targetBarberId: string): Promise<void> {
  return runWorkerAction('reasignar_turno_llamado', {
    p_ticket_id: ticketId,
    p_barbero_destino_id: targetBarberId,
  });
}

export async function createMyWalkInTicket(queueId: string, referenceName: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('crear_mi_ticket_presencial', { p_fila_id: queueId, p_prioridad: 'normal', p_nombre_ref: referenceName.trim() || null });
  if (error) throw new Error(error.message);
  return (data as { codigo_visible: string }).codigo_visible;
}

export async function getWorkerHistory(): Promise<WorkerHistoryEntry[]> {
  const { data, error } = await getSupabase().rpc('mi_historial_barbero');
  if (error) throw new Error(error.message);
  const entries = ((data ?? []) as Array<{ ticket_id: string; codigo_visible: string; fila_nombre: string; servicio_nombre: string | null; estado: 'finalizado' | 'ausente'; finalizado_en: string | null }>).map((entry) => ({
    ticketId: entry.ticket_id,
    visibleCode: entry.codigo_visible,
    queueName: entry.fila_nombre,
    serviceName: entry.servicio_nombre,
    state: entry.estado,
    completedAt: entry.finalizado_en,
    clientName: null,
    startedAt: null,
    finishedAt: null,
    durationSeconds: null,
  }));

  const ids = entries.map((entry) => entry.ticketId);
  if (ids.length === 0) return entries;

  const { data: ticketRows } = await getSupabase()
    .from('tickets')
    .select('id,nombre_invitado,nombre_ref,inicio_en,fin_en,cerrado_en')
    .in('id', ids);

  const byId = new Map((ticketRows ?? []).map((row: { id: string }) => [row.id, row] as [string, { id: string; nombre_invitado: string | null; nombre_ref: string | null; inicio_en: string | null; fin_en: string | null; cerrado_en: string | null }]));
  return entries.map((entry) => {
    const ticket = byId.get(entry.ticketId);
    const startedAt = ticket?.inicio_en ?? null;
    const finishedAt = ticket?.fin_en ?? null;
    const completedAt = ticket?.cerrado_en ?? entry.completedAt;
    const durationEnd = finishedAt ?? (entry.state === 'finalizado' ? completedAt : null);
    const durationMs = startedAt && durationEnd ? new Date(durationEnd).getTime() - new Date(startedAt).getTime() : null;

    return {
      ...entry,
      completedAt,
      clientName: ticket?.nombre_invitado ?? ticket?.nombre_ref ?? null,
      startedAt,
      finishedAt,
      durationSeconds: durationMs != null && Number.isFinite(durationMs) && durationMs >= 0 ? Math.round(durationMs / 1000) : null,
    };
  });
}

export async function getWorkerQueues(): Promise<Array<{ queueId: string; name: string }>> {
  const { data, error } = await getSupabase().rpc('mis_filas_barbero');
  if (error) throw new Error(error.message);
  return (data ?? []).map((queue: { fila_id: string; nombre: string }) => ({ queueId: queue.fila_id, name: queue.nombre }));
}

export type WorkerWalkInServiceOption = { queueId: string; name: string; durationSeconds: number | null; priceCents: number | null };
export type WorkerWalkInBarberOption = { barberId: string; name: string };

export async function getWorkerWalkInOptions(): Promise<{ services: WorkerWalkInServiceOption[]; barbers: WorkerWalkInBarberOption[] }> {
  const [shops, queues] = await Promise.all([getWorkerShops(), getWorkerQueues()]);
  const current = shops.find((shop) => shop.isCurrent) ?? shops[0] ?? null;

  if (!current) return { services: queues.map((queue) => ({ ...queue, durationSeconds: null, priceCents: null })), barbers: [] };

  const [{ data: serviceRows, error: servicesError }, { data: barberRows, error: barbersError }] = await Promise.all([
    getSupabase()
      .from('servicios')
      .select('id,nombre,duracion_estimada_seg,precio_referencia_centavos')
      .eq('empresa_id', current.businessId)
      .eq('activo', true),
    getSupabase()
      .from('barberos')
      .select('id,nombre')
      .eq('empresa_id', current.businessId)
      .eq('activo', true)
      .order('nombre'),
  ]);

  if (servicesError) throw new Error(servicesError.message);
  if (barbersError) throw new Error(barbersError.message);

  const servicesByName = new Map(
    ((serviceRows ?? []) as Array<{ id: string; nombre: string; duracion_estimada_seg: number; precio_referencia_centavos: number | null }>).map((service) => [
      service.nombre.trim().toLowerCase(),
      service,
    ]),
  );

  return {
    services: queues.map((queue) => {
      const service = servicesByName.get(queue.name.trim().toLowerCase());
      return {
        queueId: queue.queueId,
        name: queue.name,
        durationSeconds: service?.duracion_estimada_seg ?? null,
        priceCents: service?.precio_referencia_centavos ?? null,
      };
    }),
    barbers: ((barberRows ?? []) as Array<{ id: string; nombre: string }>).map((barber) => ({ barberId: barber.id, name: barber.nombre })),
  };
}

export type ShopStationState = 'disponible' | 'ocupado' | 'fuera_de_turno';

export type ShopStation = {
  barberId: string;
  name: string;
  operationalState: ShopStationState;
  ticketCode: string | null;
  serviceName: string | null;
  ticketState: 'llamado' | 'en_atencion' | null;
};

export async function getShopStations(): Promise<ShopStation[]> {
  const { data, error } = await getSupabase().rpc('estaciones_de_mi_empresa');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{
    barbero_id: string;
    nombre: string;
    estado: ShopStationState;
    ticket_codigo: string | null;
    ticket_servicio: string | null;
    ticket_estado: ShopStation['ticketState'];
  }>).map((station) => ({
    barberId: station.barbero_id,
    name: station.nombre,
    operationalState: station.estado,
    ticketCode: station.ticket_codigo,
    serviceName: station.ticket_servicio,
    ticketState: station.ticket_estado,
  }));
}

export function translateWorkerBarberError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('perfil de barbero')) return 'Tu cuenta no tiene un perfil de barbero activo.';
  if (normalized.includes('no estás disponible')) return 'Marca tu disponibilidad antes de llamar un turno.';
  if (normalized.includes('ya tienes un turno activo')) return 'Primero resuelve tu turno activo.';
  if (normalized.includes('no te fue asignado')) return 'Este turno ya no está asignado a ti.';
  if (normalized.includes('no está llamado') || normalized.includes('ya inició')) return 'El turno ya no se puede reasignar porque cambió de estado.';
  if (normalized.includes('barbero destino')) return 'El barbero elegido ya no puede recibir este turno.';
  if (normalized.includes('duplicate key') || normalized.includes('capacidad')) return 'El barbero elegido acaba de recibir otro turno. Actualiza e intenta con otro.';
  if (normalized.includes('no hay') || normalized.includes('fila no encontrada')) return 'No hay un turno compatible disponible en esta fila.';
  if (normalized.includes('network') || normalized.includes('fetch')) return 'No pudimos conectar con el servidor. Revisa tu conexión.';
  return 'No pudimos completar la operación. Actualiza la cola e intenta de nuevo.';
}
