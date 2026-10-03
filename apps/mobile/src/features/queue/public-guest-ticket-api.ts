import { getSupabase } from '@/lib/supabase';

import { normalizeGuestDetails, type GuestDetails } from './guest-ticket-details';

export type GuestTicketAccess = {
  ticketId: string;
  visibleCode: string;
  capability: string;
};

export type GuestTicketState = {
  visibleCode: string;
  status: 'en_espera' | 'notificado' | 'llamado' | 'en_atencion' | 'finalizado' | 'cancelado' | 'ausente';
  peopleAhead: number;
  waitMinutes: number;
  serviceName: string | null;
  requestedBarberName: string | null;
  assignedBarberName: string | null;
  calledDeadlineAt: string | null;
  customerResponse: 'presente' | 'llega_en_2_min' | null;
  customerResponseAt: string | null;
};

type GuestTicketAccessPayload = { ticket_id: string; codigo_visible: string; capacidad: string };
type GuestTicketStatePayload = {
  codigo_visible: string;
  estado: GuestTicketState['status'];
  personas_delante: number;
  espera_min: number;
  servicio_nombre: string | null;
  barbero_solicitado_nombre: string | null;
  barbero_asignado_nombre: string | null;
  llamado_vencimiento_en: string | null;
  respuesta_cliente: GuestTicketState['customerResponse'];
  respuesta_cliente_en: string | null;
};

/** The capability is an in-memory handoff only; callers must not persist it. */
export async function createGuestTicket(input: {
  companyCode: string;
  serviceId: string;
  requestedBarberId?: string | null;
  details: GuestDetails;
}): Promise<GuestTicketAccess> {
  const details = normalizeGuestDetails(input.details);
  const { data, error } = await getSupabase().rpc('crear_ticket_invitado', {
    p_codigo: input.companyCode,
    p_servicio_id: input.serviceId,
    p_nombre: details.name,
    p_rango_edad: details.ageRange ?? null,
    p_genero: details.gender ?? null,
    p_barbero_solicitado_id: input.requestedBarberId ?? null,
  });
  if (error) throw new Error(error.message);
  const ticket = data as GuestTicketAccessPayload | null;
  if (!ticket?.ticket_id || !ticket.capacidad) throw new Error('Guest ticket creation returned no access identity');
  return { ticketId: ticket.ticket_id, visibleCode: ticket.codigo_visible, capability: ticket.capacidad };
}

export async function getGuestTicketState(access: Pick<GuestTicketAccess, 'ticketId' | 'capability'>): Promise<GuestTicketState> {
  const { data, error } = await getSupabase().rpc('estado_ticket_invitado', {
    p_ticket_id: access.ticketId,
    p_capacidad: access.capability,
  });
  if (error) throw new Error(error.message);
  const ticket = data as GuestTicketStatePayload | null;
  if (!ticket) throw new Error('Guest ticket state returned no ticket');
  return {
    visibleCode: ticket.codigo_visible, status: ticket.estado,
    peopleAhead: ticket.personas_delante, waitMinutes: ticket.espera_min,
    serviceName: ticket.servicio_nombre, requestedBarberName: ticket.barbero_solicitado_nombre,
    assignedBarberName: ticket.barbero_asignado_nombre,
    calledDeadlineAt: ticket.llamado_vencimiento_en,
    customerResponse: ticket.respuesta_cliente,
    customerResponseAt: ticket.respuesta_cliente_en,
  };
}

export async function respondToCalledGuestTicket(access: Pick<GuestTicketAccess, 'ticketId' | 'capability'>, response: NonNullable<GuestTicketState['customerResponse']>): Promise<void> {
  const { error } = await getSupabase().rpc('responder_llamado_invitado', {
    p_ticket_id: access.ticketId,
    p_capacidad: access.capability,
    p_respuesta: response,
  });
  if (error) throw new Error(error.message);
}

export async function cancelGuestTicket(access: Pick<GuestTicketAccess, 'ticketId' | 'capability'>): Promise<void> {
  const { error } = await getSupabase().rpc('cancelar_ticket_invitado', {
    p_ticket_id: access.ticketId,
    p_capacidad: access.capability,
  });
  if (error) throw new Error(error.message);
}
