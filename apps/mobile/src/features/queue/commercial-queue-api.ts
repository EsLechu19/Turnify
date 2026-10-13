import { getSupabase } from '@/lib/supabase';

import { parseShopCoordinates, type ShopCoordinates } from '@/features/location/shop-coordinates';

export type BarberOperationalState = 'disponible' | 'ocupado';

export type CommercialService = {
  serviceId: string;
  name: string;
  description: string | null;
  estimatedDurationSeconds: number;
  measuredDurationSeconds: number | null;
  referencePriceCents: number | null;
};

export type CommercialBarber = {
  barberId: string;
  name: string;
  operationalState: BarberOperationalState;
  fotoUrl: string | null;
  serviceIds: string[];
};

export type CommercialCatalog = {
  name: string;
  open: boolean;
  /** Nullable shop point for the guest "how to get there" card. */
  shopLocation?: ShopCoordinates | null;
  services: CommercialService[];
  barbers: CommercialBarber[];
};

type CatalogPayload = {
  nombre: string;
  abierta: boolean;
  latitud: number | null;
  longitud: number | null;
  servicios: Array<{
    servicio_id: string;
    nombre: string;
    descripcion: string | null;
    duracion_estimada_seg: number;
    duracion_medida_seg: number | null;
    precio_referencia_centavos: number | null;
  }>;
  barberos: Array<{
    barbero_id: string;
    nombre: string;
    estado: BarberOperationalState;
    foto_url: string | null;
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
    shopLocation: parseShopCoordinates({ latitud: payload.latitud, longitud: payload.longitud }),
    services: payload.servicios.map((service) => ({
      serviceId: service.servicio_id,
      name: service.nombre,
      description: service.descripcion,
      estimatedDurationSeconds: service.duracion_estimada_seg,
      measuredDurationSeconds: service.duracion_medida_seg,
      referencePriceCents: service.precio_referencia_centavos,
    })),
    barbers: payload.barberos.map((barber) => ({
      barberId: barber.barbero_id,
      name: barber.nombre,
      operationalState: barber.estado,
      fotoUrl: barber.foto_url,
      serviceIds: barber.servicio_ids,
    })),
  };
}

export async function takeCommercialTurn(input: {
  companyCode: string;
  serviceId: string;
  requestedBarberId?: string | null;
}): Promise<{ ticketId: string; queueId: string }> {
  const { data, error } = await getSupabase().rpc('tomar_turno_comercial', {
    p_codigo: input.companyCode,
    p_servicio_id: input.serviceId,
    p_barbero_solicitado_id: input.requestedBarberId ?? null,
  });
  if (error) throw new Error(error.message);
  const ticket = data as { id: string; fila_id: string } | null;
  if (!ticket) throw new Error('Ticket creation returned no ticket');
  return { ticketId: ticket.id, queueId: ticket.fila_id };
}
