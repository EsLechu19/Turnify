import { getSupabase } from '@/lib/supabase';
import type { ShopStation } from '@/features/queue/worker-barber-api';

export type OwnerOverview = {
  business: { id: string; name: string; code: string; isOpen: boolean };
  waitingCount: number;
  estimatedWaitMinutes: number;
  team: ShopStation[];
  metrics: { completed: number; absent: number; waiting: number; active: number };
  alerts: string[];
};

type QueueRow = { id: string; nombre: string; en_espera: number; puestos_activos: number; duracion_promedio_seg: number };
type TicketRow = { estado: string };
type MembershipRow = { empresa_id: string; empresa_nombre: string; empresa_codigo: string; rol: 'ADMIN' | 'WORKER' };

const activeStates = ['en_espera', 'notificado', 'llamado', 'en_atencion'] as const;

function isMissingMembershipRpc(error: { code?: string; message?: string }): boolean {
  const message = (error.message ?? '').toLowerCase();
  return error.code === '42883' || error.code === 'PGRST202' ||
    (message.includes('mis_membresias_empresa') && (message.includes('not found') || message.includes('does not exist')));
}

function todayInLima(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function mapOwnerOverview(input: {
  business: OwnerOverview['business'];
  queues: QueueRow[];
  todayTickets: TicketRow[];
  team: ShopStation[];
}): OwnerOverview {
  const waitingCount = input.queues.reduce((sum, queue) => sum + queue.en_espera, 0);
  const estimatedWaitMinutes = input.queues.reduce((max, queue) => {
    const stations = Math.max(1, queue.puestos_activos);
    const estimate = Math.ceil((queue.en_espera * queue.duracion_promedio_seg) / stations / 60);
    return Math.max(max, estimate);
  }, 0);
  const metrics = {
    completed: input.todayTickets.filter((ticket) => ticket.estado === 'finalizado').length,
    absent: input.todayTickets.filter((ticket) => ticket.estado === 'ausente').length,
    waiting: input.todayTickets.filter((ticket) => ticket.estado === 'en_espera' || ticket.estado === 'notificado').length,
    active: input.todayTickets.filter((ticket) => ticket.estado === 'llamado' || ticket.estado === 'en_atencion').length,
  };

  return {
    business: input.business,
    waitingCount,
    estimatedWaitMinutes,
    team: input.team,
    metrics,
    alerts: !input.business.isOpen && waitingCount > 0 ? ['Hay clientes esperando mientras el negocio está cerrado.'] : [],
  };
}

async function resolveAdminBusiness(): Promise<OwnerOverview['business']> {
  const supabase = getSupabase();
  const memberships = await supabase.rpc('mis_membresias_empresa');
  let admin: MembershipRow | undefined;
  if (!memberships.error) {
    admin = ((memberships.data ?? []) as MembershipRow[]).find((membership) => membership.rol === 'ADMIN');
  } else if (!isMissingMembershipRpc(memberships.error)) {
    throw new Error(memberships.error.message);
  }

  const legacyProfile = admin ? null : (await supabase.from('perfiles').select('empresa_id').eq('id', (await supabase.auth.getUser()).data.user?.id ?? '').maybeSingle()).data;
  const businessId = admin?.empresa_id ?? legacyProfile?.empresa_id;
  if (!businessId) throw new Error('La cuenta no tiene una empresa administrable.');
  const { data, error } = await supabase.from('empresas').select('id, nombre, codigo, abierta').eq('id', businessId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('No encontramos la empresa administrada por esta cuenta.');
  return { id: data.id, name: data.nombre, code: data.codigo, isOpen: data.abierta };
}

export async function getOwnerOverview(): Promise<OwnerOverview> {
  const supabase = getSupabase();
  const business = await resolveAdminBusiness();
  const date = todayInLima();
  const [queuesResult, activeResult, todayResult, teamResult] = await Promise.all([
    supabase.from('filas').select('id, nombre, en_espera, puestos_activos, duracion_promedio_seg').eq('empresa_id', business.id),
    supabase.from('tickets').select('estado').eq('empresa_id', business.id).in('estado', activeStates),
    supabase.from('tickets').select('estado').eq('empresa_id', business.id).eq('fecha_operativa', date),
    supabase.rpc('estaciones_de_mi_empresa'),
  ]);
  for (const result of [queuesResult, activeResult, todayResult, teamResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const team = ((teamResult.data ?? []) as Array<{ barbero_id: string; nombre: string; estado: ShopStation['operationalState']; ticket_codigo: string | null; ticket_servicio: string | null; ticket_estado: ShopStation['ticketState'] }>).map((station) => ({
    barberId: station.barbero_id,
    name: station.nombre,
    operationalState: station.estado,
    ticketCode: station.ticket_codigo,
    serviceName: station.ticket_servicio,
    ticketState: station.ticket_estado,
  }));
  return mapOwnerOverview({ business, queues: (queuesResult.data ?? []) as QueueRow[], todayTickets: (todayResult.data ?? []) as TicketRow[], team });
}

export async function setOwnerBusinessOpen(open: boolean): Promise<void> {
  const business = await resolveAdminBusiness();
  const { error } = await getSupabase().from('empresas').update({ abierta: open }).eq('id', business.id);
  if (error) throw new Error(error.message);
}
