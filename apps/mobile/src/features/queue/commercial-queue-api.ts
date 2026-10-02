import { getSupabase } from '@/lib/supabase';

export type BarberOperationalState = 'disponible' | 'ocupado';

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
  operationalState: BarberOperationalState;
  serviceIds: string[];
};

export type CommercialCatalog = {
  name: string;
  open: boolean;
  services: CommercialService[];
  barbers: CommercialBarber[];
};

type CatalogPayload = {
  nombre: string;
  abierta: boolean;
  servicios: Array<{
    servicio_id: string;
    nombre: string;
    descripcion: string | null;
    duracion_estimada_seg: number;
    precio_referencia_centavos: number | null;
  }>;
  barberos: Array<{
    barbero_id: string;
    nombre: string;
    estado: BarberOperationalState;
    servicio_ids: string[];
  }>;
};

export async function getCommercialCatalog(companyCode: string): Promise<CommercialCatalog> {
  const { data, error } = await getSupabase().rpc('catalogo_comercial', {
    p_codigo: companyCode,
  });
  if (error) throw new Error(error.message);

  const payload = data as CatalogPayload | null;
  if (!payload) throw new Error('Business not found');
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

export async function takeCommercialTurn(input: {
  companyCode: string;
  serviceId: string;
  requestedBarberId?: string | null;
}): Promise<{ ticketId: string }> {
  const { data, error } = await getSupabase().rpc('tomar_turno_comercial', {
    p_codigo: input.companyCode,
    p_servicio_id: input.serviceId,
    p_barbero_solicitado_id: input.requestedBarberId ?? null,
  });
  if (error) throw new Error(error.message);
  const ticket = data as { id: string } | null;
  if (!ticket) throw new Error('Ticket creation returned no ticket');
  return { ticketId: ticket.id };
}
