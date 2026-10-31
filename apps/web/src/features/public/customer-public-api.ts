import { getSupabase } from '@/data/supabase';

export type CommercialService = {
  serviceId: string;
  name: string;
  description: string | null;
  estimatedDurationSeconds: number;
  referencePriceCents: number | null;
};

export type CommercialBarber = {
  barberId: string;
  name: string;
  operationalState: 'disponible' | 'ocupado';
  serviceIds: string[];
};

export type CommercialCatalog = {
  name: string;
  open: boolean;
  services: CommercialService[];
  barbers: CommercialBarber[];
};

export type GuestDetails = {
  name: string;
  phone?: string;
  whatsappConsent?: boolean;
};

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
};

export const GUEST_PHONE_CONSENT_ERROR = 'Para aceptar WhatsApp, ingresá un teléfono válido con código internacional.';

export function validateBusinessCode(value: string): string {
  const code = value.trim();
  if (!/^[a-zA-Z0-9_-]{2,64}$/.test(code)) throw new Error('El código del negocio no es válido.');
  return code;
}

function normalizeInternationalPhone(value: string): string | null {
  const compact = value.replace(/[\s().-]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : null;
}

export function normalizeGuestDetails(input: GuestDetails): GuestDetails {
  const name = input.name.trim();
  if (name.length === 0 || name.length > 80) throw new Error('Ingresá un nombre de entre 1 y 80 caracteres.');

  const consent = input.whatsappConsent === true;
  const phone = consent ? normalizeInternationalPhone(input.phone?.trim() ?? '') : undefined;
  if (consent && !phone) throw new Error(GUEST_PHONE_CONSENT_ERROR);
  return { name, phone: phone ?? undefined, whatsappConsent: consent };
}

export async function getCommercialCatalog(businessCode: string): Promise<CommercialCatalog> {
  const { data, error } = await getSupabase().rpc('catalogo_comercial', { p_codigo: businessCode });
  if (error) throw new Error(error.message);
  const payload = data as {
    nombre: string;
    abierta: boolean;
    servicios: Array<{ servicio_id: string; nombre: string; descripcion: string | null; duracion_estimada_seg: number; precio_referencia_centavos: number | null }>;
    barberos: Array<{ barbero_id: string; nombre: string; estado: 'disponible' | 'ocupado'; servicio_ids: string[] }>;
  } | null;
  if (!payload) throw new Error('NEGOCIO_NO_ENCONTRADO');
  return {
    name: payload.nombre,
    open: payload.abierta,
    services: payload.servicios.map((service) => ({
      serviceId: service.servicio_id,
      name: service.nombre,
      description: service.descripcion,
      estimatedDurationSeconds: service.duracion_estimada_seg,
      referencePriceCents: service.precio_referencia_centavos,
    })),
    barbers: payload.barberos.map((barber) => ({
      barberId: barber.barbero_id,
      name: barber.nombre,
      operationalState: barber.estado,
      serviceIds: barber.servicio_ids,
    })),
  };
}

export async function createGuestTicket(input: {
  businessCode: string;
  serviceId: string;
  requestedBarberId?: string | null;
  details: GuestDetails;
}): Promise<GuestTicketAccess> {
  const details = normalizeGuestDetails(input.details);
  const { data, error } = await getSupabase().rpc('crear_ticket_invitado', {
    p_codigo: input.businessCode,
    p_servicio_id: input.serviceId,
    p_nombre: details.name,
    p_rango_edad: null,
    p_genero: null,
    p_barbero_solicitado_id: input.requestedBarberId ?? null,
    p_telefono: details.whatsappConsent ? details.phone : null,
    p_consentimiento_whatsapp: details.whatsappConsent === true,
  });
  if (error) throw new Error(error.message);
  const ticket = data as { ticket_id: string; codigo_visible: string; capacidad: string } | null;
  if (!ticket?.ticket_id || !ticket.capacidad) throw new Error('La respuesta no incluyó la identidad del turno.');
  return { ticketId: ticket.ticket_id, visibleCode: ticket.codigo_visible, capability: ticket.capacidad };
}

export async function getGuestTicketState(access: Pick<GuestTicketAccess, 'ticketId' | 'capability'>): Promise<GuestTicketState> {
  const { data, error } = await getSupabase().rpc('estado_ticket_invitado', {
    p_ticket_id: access.ticketId,
    p_capacidad: access.capability,
  });
  if (error) throw new Error(error.message);
  const ticket = data as { codigo_visible: string; estado: GuestTicketState['status']; personas_delante: number; espera_min: number; servicio_nombre: string | null; barbero_solicitado_nombre: string | null; barbero_asignado_nombre: string | null } | null;
  if (!ticket) throw new Error('No se pudo consultar el turno.');
  return {
    visibleCode: ticket.codigo_visible,
    status: ticket.estado,
    peopleAhead: ticket.personas_delante,
    waitMinutes: ticket.espera_min,
    serviceName: ticket.servicio_nombre,
    requestedBarberName: ticket.barbero_solicitado_nombre,
    assignedBarberName: ticket.barbero_asignado_nombre,
  };
}

export async function cancelGuestTicket(access: Pick<GuestTicketAccess, 'ticketId' | 'capability'>): Promise<void> {
  const { error } = await getSupabase().rpc('cancelar_ticket_invitado', {
    p_ticket_id: access.ticketId,
    p_capacidad: access.capability,
  });
  if (error) throw new Error(error.message);
}
