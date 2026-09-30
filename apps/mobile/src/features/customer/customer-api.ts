import { getSupabase } from '@/lib/supabase';

export type TicketStatus =
  | 'en_espera'
  | 'notificado'
  | 'llamado'
  | 'en_atencion'
  | 'finalizado'
  | 'cancelado'
  | 'ausente';

export type TicketOrigin = 'app' | 'presencial';

export type TicketHistoryItem = {
  id: string;
  visibleCode: string;
  status: TicketStatus;
  operatingDate: string;
  origin: TicketOrigin;
  createdAt: string;
};

export type CustomerProfile = {
  id: string;
  name: string | null;
  phone: string | null;
};

type TicketHistoryRow = {
  id: string;
  codigo_visible: string;
  estado: TicketStatus;
  fecha_operativa: string;
  origen: TicketOrigin;
  creado_en: string;
};

type ProfileRow = {
  id: string;
  nombre: string | null;
  telefono: string | null;
};

function toCustomerProfile(row: ProfileRow): CustomerProfile {
  return { id: row.id, name: row.nombre, phone: row.telefono };
}

export async function getCustomerTicketHistory(customerId: string): Promise<TicketHistoryItem[]> {
  const { data, error } = await getSupabase()
    .from('tickets')
    .select('id, codigo_visible, estado, fecha_operativa, origen, creado_en')
    .eq('cliente_id', customerId)
    .order('creado_en', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as TicketHistoryRow[]).map((ticket) => ({
    id: ticket.id,
    visibleCode: ticket.codigo_visible,
    status: ticket.estado,
    operatingDate: ticket.fecha_operativa,
    origin: ticket.origen,
    createdAt: ticket.creado_en,
  }));
}

export async function getCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
  const { data, error } = await getSupabase()
    .from('perfiles')
    .select('id, nombre, telefono')
    .eq('id', customerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toCustomerProfile(data as unknown as ProfileRow) : null;
}

export async function updateCustomerProfile(
  customerId: string,
  name: string,
  phone: string,
): Promise<CustomerProfile | null> {
  const { data, error } = await getSupabase()
    .from('perfiles')
    .update({ nombre: name.trim() || null, telefono: phone.trim() || null })
    .eq('id', customerId)
    .select('id, nombre, telefono')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toCustomerProfile(data as unknown as ProfileRow) : null;
}
