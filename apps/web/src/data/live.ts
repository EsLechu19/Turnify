import { getSupabase } from './supabase';
import { suggestDuration } from './compute';
import type { BranchLocation, BusinessProfile } from './repositories';
import type {
  ActivityEvent,
  DemandEstimate,
  HistoryRecord,
  HistoryStatus,
  QueueSummary,
  QueueTicket,
  ServiceMixItem,
  ServiceRecord,
  StaffRecord,
  TeamMember,
} from './types';

/**
 * Live readers for the panel (Supabase). Every function is company-scoped to
 * the admin's empresa and returns the same shapes the fixtures describe, so
 * `repositories.ts` can swap bodies without touching a single feature.
 */

async function companyId(): Promise<string> {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) throw new Error('Sin sesión.');

  const { data, error } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error || !data) throw new Error('Sin barbería seleccionada.');

  return (data as { empresa_id: string | null }).empresa_id ?? '';
}

function limaISODate(when: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(when);
}

function hhmm(iso: string | null): string {
  if (!iso) return '—';
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value);
}

function minutesBetween(from: string | null, to: string | null): number {
  if (!from || !to) return 0;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.round(ms / 60000);
}

export async function fetchBusiness(): Promise<BusinessProfile> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const { data: auth } = await supabase.auth.getUser();

  const [{ data: company }, { data: profile }] = await Promise.all([
    supabase.from('empresas').select('nombre,codigo').eq('id', empresaId).maybeSingle(),
    auth.user
      ? supabase.from('perfiles').select('nombre').eq('id', auth.user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const row = (company ?? {}) as { nombre?: string; codigo?: string };
  const name = row.nombre ?? 'Mi barbería';
  const code = row.codigo ?? '';
  const ownerRow = (profile ?? {}) as { nombre?: string | null };
  const today = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const capitalizedToday = today.charAt(0).toUpperCase() + today.slice(1);

  return {
    name,
    subtitle: 'Panel de barbería',
    branch: `Sucursal: ${name}`,
    ticketUrl: `turnify.app/t/${code}`,
    accessCode: code,
    owner: ownerRow.nombre?.trim() || auth.user?.email?.split('@')[0] || 'Administrador',
    ownerEmail: auth.user?.email ?? '',
    today: capitalizedToday,
  };
}

export async function fetchBranch(): Promise<BranchLocation> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const { data } = await supabase.from('empresas').select('nombre,codigo').eq('id', empresaId).maybeSingle();
  const row = (data ?? {}) as { nombre?: string; codigo?: string };

  return {
    name: row.nombre ?? 'Sucursal',
    city: '',
    code: row.codigo ?? '',
    slug: (row.codigo ?? '').toLowerCase(),
    accessCode: row.codigo ?? '',
  };
}

/**
 * Creates the caller's first shop and promotes them to its admin
 * (`crear_empresa` also seeds the default queue). Fails when the account
 * already belongs to a shop.
 */
export async function createBusiness(name: string): Promise<{ id: string; name: string; code: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('crear_empresa', { p_nombre: name.trim() });

  if (error) throw new Error(error.message);
  const row = (data ?? {}) as { id?: string; nombre?: string; codigo?: string };
  if (!row.id || !row.codigo) throw new Error('La barbería no devolvió identidad.');
  return { id: row.id, name: row.nombre ?? name.trim(), code: row.codigo };
}

export async function fetchQueues(): Promise<QueueSummary[]> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const { data, error } = await supabase
    .from('filas')
    .select('id,nombre,prefijo,puestos_activos')
    .eq('empresa_id', empresaId)
    .order('nombre');

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{ id: string; nombre: string; prefijo: string; puestos_activos: number }>).map(
    (queue) => ({
      id: queue.id,
      name: queue.nombre,
      prefix: queue.prefijo,
      activeStations: queue.puestos_activos,
    }),
  );
}

type TicketRow = {
  id: string;
  fila_id: string;
  codigo_visible: string;
  servicio_nombre: string | null;
  barbero_asignado_nombre: string | null;
  nombre_invitado: string | null;
  nombre_ref: string | null;
  prioridad: string | null;
  estado: string;
  creado_en: string;
  llamado_en: string | null;
  inicio_en: string | null;
  fin_en: string | null;
  cerrado_en: string | null;
};

function toBoardStatus(estado: string): QueueTicket['status'] | null {
  if (estado === 'en_espera' || estado === 'notificado') return 'espera';
  if (estado === 'llamado' || estado === 'en_atencion' || estado === 'finalizado' || estado === 'ausente') {
    return estado === 'en_atencion' ? 'atencion' : (estado as QueueTicket['status']);
  }
  return null;
}

export async function fetchTickets(): Promise<QueueTicket[]> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const { data, error } = await supabase
    .from('tickets')
    .select(
      'id,fila_id,codigo_visible,servicio_nombre,barbero_asignado_nombre,nombre_invitado,nombre_ref,prioridad,estado,creado_en',
    )
    .eq('empresa_id', empresaId)
    .eq('fecha_operativa', limaISODate())
    .order('creado_en', { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);

  const now = Date.now();

  return ((data ?? []) as TicketRow[])
    .map((ticket) => ({ ticket, status: toBoardStatus(ticket.estado) }))
    .filter((entry): entry is { ticket: TicketRow; status: QueueTicket['status'] } => entry.status !== null)
    .map(({ ticket, status }) => ({
      id: ticket.id,
      code: ticket.codigo_visible,
      queueId: ticket.fila_id,
      customer: ticket.nombre_invitado ?? ticket.nombre_ref ?? 'Cliente',
      service: ticket.servicio_nombre ?? 'Servicio',
      barber: ticket.barbero_asignado_nombre,
      status,
      priority: ticket.prioridad === 'preferencial',
      waitedMinutes: Math.max(0, Math.round((now - new Date(ticket.creado_en).getTime()) / 60000)),
      arrivesAt: hhmm(ticket.creado_en),
    }));
}

type BarberRow = { id: string; nombre: string; activo: boolean; perfil_id: string | null };

export async function fetchTeam(): Promise<TeamMember[]> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const today = limaISODate();

  const [{ data: barbers, error: barbersError }, { data: operations, error: operationsError }, { data: tickets }] =
    await Promise.all([
      supabase.from('barberos').select('id,nombre,activo').eq('empresa_id', empresaId).order('nombre'),
      supabase.from('barbero_operaciones').select('barbero_id,estado').eq('empresa_id', empresaId),
      supabase
        .from('tickets')
        .select('barbero_asignado_id,estado,codigo_visible,cerrado_en')
        .eq('empresa_id', empresaId)
        .eq('fecha_operativa', today),
    ]);

  if (barbersError) throw new Error(barbersError.message);
  if (operationsError) throw new Error(operationsError.message);

  const stateByBarber = new Map(
    ((operations ?? []) as Array<{ barbero_id: string; estado: string }>).map((row) => [row.barbero_id, row.estado]),
  );
  const activeByBarber = new Map<string, string>();
  const completedByBarber = new Map<string, number>();

  for (const row of (tickets ?? []) as Array<{
    barbero_asignado_id: string | null;
    estado: string;
    codigo_visible: string;
  }>) {
    if (!row.barbero_asignado_id) continue;
    if (row.estado === 'llamado' || row.estado === 'en_atencion') {
      activeByBarber.set(row.barbero_asignado_id, row.codigo_visible);
    }
    if (row.estado === 'finalizado') {
      completedByBarber.set(row.barbero_asignado_id, (completedByBarber.get(row.barbero_asignado_id) ?? 0) + 1);
    }
  }

  return ((barbers ?? []) as BarberRow[]).map((barber) => {
    const estado = stateByBarber.get(barber.id);

    return {
      id: barber.id,
      name: barber.nombre,
      availability: estado === 'ocupado' ? 'atencion' : estado === 'fuera_de_turno' ? 'fuera' : 'disponible',
      currentTicket: activeByBarber.get(barber.id) ?? null,
      completedToday: completedByBarber.get(barber.id) ?? 0,
    } as TeamMember;
  });
}

export async function fetchStaff(): Promise<StaffRecord[]> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const team = await fetchTeam();

  const [{ data: barbers }, { data: profiles }, { data: finished }] = await Promise.all([
    supabase.from('barberos').select('id,activo,perfil_id,foto_url').eq('empresa_id', empresaId),
    supabase.from('perfiles').select('id,rol,foto_url').eq('empresa_id', empresaId),
    supabase
      .from('tickets')
      .select('barbero_asignado_id,inicio_en,fin_en')
      .eq('empresa_id', empresaId)
      .eq('estado', 'finalizado')
      .order('fin_en', { ascending: false })
      .limit(1000),
  ]);

  const activeById = new Map(((barbers ?? []) as Array<{ id: string; activo: boolean }>).map((row) => [row.id, row.activo]));
  const fotoById = new Map(
    ((barbers ?? []) as Array<{ id: string; foto_url: string | null }>).map((row) => [row.id, row.foto_url]),
  );
  const roleByPerfil = new Map(((profiles ?? []) as Array<{ id: string; rol: string }>).map((row) => [row.id, row.rol]));
  const globalFotoByPerfil = new Map(
    ((profiles ?? []) as Array<{ id: string; foto_url: string | null }>).map((row) => [row.id, row.foto_url]),
  );
  const perfilByBarber = new Map(
    ((barbers ?? []) as Array<{ id: string; perfil_id: string | null }>).map((row) => [row.id, row.perfil_id]),
  );
  const minutesByBarber = new Map<string, number[]>();

  for (const row of (finished ?? []) as Array<{
    barbero_asignado_id: string | null;
    inicio_en: string | null;
    fin_en: string | null;
  }>) {
    if (!row.barbero_asignado_id || !row.inicio_en || !row.fin_en) continue;
    const minutes = Math.round((new Date(row.fin_en).getTime() - new Date(row.inicio_en).getTime()) / 60000);
    if (!Number.isFinite(minutes) || minutes < 0) continue;
    const list = minutesByBarber.get(row.barbero_asignado_id) ?? [];
    list.push(minutes);
    minutesByBarber.set(row.barbero_asignado_id, list);
  }

  return team.map((member) => {
    const perfilId = perfilByBarber.get(member.id) ?? null;
    const rol = perfilId ? roleByPerfil.get(perfilId) : undefined;

    return {
      id: member.id,
      companyId: empresaId,
      name: member.name,
      email: '',
      role: rol === 'admin' ? 'admin' : 'barbero',
      station: 0,
      active: activeById.get(member.id) ?? true,
      availability: member.availability,
      currentTicket: member.currentTicket,
      completedToday: member.completedToday,
      shift: '',
      restStart: '',
      restEnd: '',
      createdAt: '',
      fotoUrl: (perfilId ? globalFotoByPerfil.get(perfilId) : null) ?? fotoById.get(member.id) ?? null,
      paceMinutes: suggestDuration(minutesByBarber.get(member.id) ?? []).suggested,
    } as StaffRecord;
  });
}

export async function fetchActivity(): Promise<ActivityEvent[]> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const { data, error } = await supabase
    .from('tickets')
    .select('id,codigo_visible,estado,barbero_asignado_nombre,actualizado_en')
    .eq('empresa_id', empresaId)
    .order('actualizado_en', { ascending: false })
    .limit(8);

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{
    id: string;
    codigo_visible: string;
    estado: string;
    barbero_asignado_nombre: string | null;
    actualizado_en: string;
  }>).map((ticket) => {
    if (ticket.estado === 'llamado') {
      return {
        id: ticket.id,
        time: hhmm(ticket.actualizado_en),
        message: `${ticket.codigo_visible} fue llamado${ticket.barbero_asignado_nombre ? ` por ${ticket.barbero_asignado_nombre}` : ''}.`,
        tone: 'gold',
      } as ActivityEvent;
    }

    if (ticket.estado === 'en_atencion') {
      return {
        id: ticket.id,
        time: hhmm(ticket.actualizado_en),
        message: `${ticket.codigo_visible} entró en atención.`,
        tone: 'brand',
      } as ActivityEvent;
    }

    if (ticket.estado === 'ausente') {
      return {
        id: ticket.id,
        time: hhmm(ticket.actualizado_en),
        message: `${ticket.codigo_visible} se marcó ausente.`,
        tone: 'danger',
      } as ActivityEvent;
    }

    if (ticket.estado === 'finalizado') {
      return {
        id: ticket.id,
        time: hhmm(ticket.actualizado_en),
        message: `${ticket.codigo_visible} finalizó su atención.`,
        tone: 'brand',
      } as ActivityEvent;
    }

    return {
      id: ticket.id,
      time: hhmm(ticket.actualizado_en),
      message: `${ticket.codigo_visible} tomó turno.`,
      tone: 'brand',
    } as ActivityEvent;
  });
}

export async function fetchServiceMix(): Promise<ServiceMixItem[]> {
  const tickets = await fetchTickets();
  const counts = new Map<string, number>();

  for (const ticket of tickets) {
    counts.set(ticket.service, (counts.get(ticket.service) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count);
}

export async function fetchServices(): Promise<ServiceRecord[]> {
  const supabase = getSupabase();
  const empresaId = await companyId();

  const [{ data: services, error: servicesError }, { data: pivot, error: pivotError }] = await Promise.all([
    supabase
      .from('servicios')
      .select('id,nombre,descripcion,duracion_estimada_seg,precio_referencia_centavos,activo')
      .eq('empresa_id', empresaId)
      .order('nombre'),
    supabase.from('barbero_servicios').select('barbero_id,servicio_id'),
  ]);

  if (servicesError) throw new Error(servicesError.message);
  if (pivotError) throw new Error(pivotError.message);

  const barbersByService = new Map<string, string[]>();

  for (const row of (pivot ?? []) as Array<{ barbero_id: string; servicio_id: string }>) {
    const list = barbersByService.get(row.servicio_id) ?? [];
    list.push(row.barbero_id);
    barbersByService.set(row.servicio_id, list);
  }

  return (
    (services ?? []) as Array<{
      id: string;
      nombre: string;
      descripcion: string | null;
      duracion_estimada_seg: number;
      precio_referencia_centavos: number | null;
      activo: boolean;
    }>
  ).map((service) => ({
    id: service.id,
    companyId: empresaId,
    name: service.nombre,
    description: service.descripcion ?? '',
    durationSeconds: service.duracion_estimada_seg,
    priceCents: service.precio_referencia_centavos ?? 0,
    active: service.activo,
    barberIds: barbersByService.get(service.id) ?? [],
    createdAt: '',
  }));
}

export async function fetchHistory(): Promise<HistoryRecord[]> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const { data, error } = await supabase
    .from('tickets')
    .select(
      'id,codigo_visible,servicio_nombre,barbero_asignado_nombre,nombre_invitado,nombre_ref,estado,creado_en,llamado_en,inicio_en,fin_en,cerrado_en,puntuacion',
    )
    .eq('empresa_id', empresaId)
    .order('creado_en', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  const toStatus = (estado: string): HistoryStatus => {
    switch (estado) {
      case 'finalizado':
        return 'completado';
      case 'ausente':
        return 'ausencia';
      case 'cancelado':
        return 'cancelado';
      case 'notificado':
        return 'notificado';
      case 'llamado':
        return 'llamado';
      case 'en_atencion':
        return 'en_atencion';
      default:
        return 'en_espera';
    }
  };

  return ((data ?? []) as Array<{
    id: string;
    codigo_visible: string;
    servicio_nombre: string | null;
    barbero_asignado_nombre: string | null;
    nombre_invitado: string | null;
    nombre_ref: string | null;
    estado: string;
    creado_en: string;
    llamado_en: string | null;
    inicio_en: string | null;
    fin_en: string | null;
    cerrado_en: string | null;
    puntuacion: number | null;
  }>).map((ticket) => ({
    id: ticket.id,
    code: ticket.codigo_visible,
    date: (ticket.cerrado_en ?? ticket.creado_en).slice(0, 10),
    arrival: hhmm(ticket.creado_en),
    customer: ticket.nombre_invitado ?? ticket.nombre_ref ?? 'Cliente',
    service: ticket.servicio_nombre ?? 'Servicio',
    barber: ticket.barbero_asignado_nombre,
    waitMinutes: minutesBetween(ticket.creado_en, ticket.llamado_en ?? ticket.inicio_en ?? ticket.cerrado_en),
    durationMinutes:
      ticket.fin_en && ticket.inicio_en ? Math.max(0, Math.round((new Date(ticket.fin_en).getTime() - new Date(ticket.inicio_en).getTime()) / 60000)) : 0,
    status: toStatus(ticket.estado),
    rating: ticket.puntuacion,
  }));
}

export type RatingByBarber = {
  barberId: string;
  name: string;
  votes: number;
  average: number | null;
};

export type ServiceInput = {
  name: string;
  description: string;
  durationSeconds: number;
  priceCents: number;
  active: boolean;
  barberIds: string[];
};

function toServiceRecord(
  row: {
    id: string;
    nombre: string;
    descripcion: string | null;
    duracion_estimada_seg: number;
    precio_referencia_centavos: number | null;
    activo: boolean;
    creado_en: string;
  },
  empresaId: string,
  barberIds: string[],
): ServiceRecord {
  return {
    id: row.id,
    companyId: empresaId,
    name: row.nombre,
    description: row.descripcion ?? '',
    durationSeconds: row.duracion_estimada_seg,
    priceCents: row.precio_referencia_centavos ?? 0,
    active: row.activo,
    barberIds,
    createdAt: row.creado_en.slice(0, 10),
  };
}

/** Creates a catalog service with its authorized barbers. */
export async function createServiceRecord(input: ServiceInput): Promise<ServiceRecord> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const { data, error } = await supabase
    .from('servicios')
    .insert({
      id: crypto.randomUUID(),
      empresa_id: empresaId,
      nombre: input.name,
      descripcion: input.description || null,
      duracion_estimada_seg: input.durationSeconds,
      precio_referencia_centavos: input.priceCents,
      activo: input.active,
    })
    .select('id,nombre,descripcion,duracion_estimada_seg,precio_referencia_centavos,activo,creado_en')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'No pudimos crear el servicio.');

  if (input.barberIds.length > 0) {
    const { error: pivotError } = await supabase
      .from('barbero_servicios')
      .insert(input.barberIds.map((barbero_id) => ({ barbero_id, servicio_id: (data as { id: string }).id })));

    if (pivotError) throw new Error(pivotError.message);
  }

  return toServiceRecord(
    data as {
      id: string;
      nombre: string;
      descripcion: string | null;
      duracion_estimada_seg: number;
      precio_referencia_centavos: number | null;
      activo: boolean;
      creado_en: string;
    },
    empresaId,
    input.barberIds,
  );
}

/** Updates a catalog service and replaces its authorized barbers. */
export async function updateServiceRecord(id: string, input: ServiceInput): Promise<ServiceRecord> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const { data, error } = await supabase
    .from('servicios')
    .update({
      nombre: input.name,
      descripcion: input.description || null,
      duracion_estimada_seg: input.durationSeconds,
      precio_referencia_centavos: input.priceCents,
      activo: input.active,
    })
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select('id,nombre,descripcion,duracion_estimada_seg,precio_referencia_centavos,activo,creado_en')
    .maybeSingle();

  if (error || !data) throw new Error(error?.message ?? 'No pudimos guardar el servicio.');

  const { error: deleteError } = await supabase.from('barbero_servicios').delete().eq('servicio_id', id);

  if (deleteError) throw new Error(deleteError.message);

  if (input.barberIds.length > 0) {
    const { error: pivotError } = await supabase
      .from('barbero_servicios')
      .insert(input.barberIds.map((barbero_id) => ({ barbero_id, servicio_id: id })));

    if (pivotError) throw new Error(pivotError.message);
  }

  return toServiceRecord(
    data as {
      id: string;
      nombre: string;
      descripcion: string | null;
      duracion_estimada_seg: number;
      precio_referencia_centavos: number | null;
      activo: boolean;
      creado_en: string;
    },
    empresaId,
    input.barberIds,
  );
}

export async function removeServiceRecord(id: string): Promise<void> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const { error } = await supabase.from('servicios').delete().eq('id', id).eq('empresa_id', empresaId);

  if (error) throw new Error(error.message);
}

export type ShopWorkerRequest = {
  requestId: string;
  name: string | null;
  requestedAt: string;
};

/** Solicitudes pendientes de ingreso (solo las ve el admin de su empresa). */
export async function fetchShopWorkerRequests(): Promise<ShopWorkerRequest[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('solicitudes_personal_de_mi_empresa');

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{ solicitud_id: string; nombre: string | null; solicitada_en: string }>).map(
    (row) => ({ requestId: row.solicitud_id, name: row.nombre, requestedAt: row.solicitada_en }),
  );
}

/** Genera el código nominativo para un email (un solo uso práctico, 7 días). */
export async function generateWorkerInvitation(email: string): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('generar_codigo_invitacion_personal', { p_correo: email.trim() });

  if (error) throw new Error(error.message);

  return data as string;
}

export async function resolveWorkerRequest(requestId: string, approve: boolean): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('resolver_solicitud_invitacion_personal', {
    p_solicitud_id: requestId,
    p_aprobar: approve,
  });

  if (error) throw new Error(error.message);
}

export type StaffRosterUpdate = {
  barberId: string;
  name: string;
  availability: 'disponible' | 'fuera_de_turno';
  active: boolean;
  serviceIds: string[];
};

/** Persists roster edits through the admin RPC (names, availability, roster state, services). */
export async function updateStaff(input: StaffRosterUpdate): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('actualizar_barbero_personal', {
    p_barbero_id: input.barberId,
    p_nombre: input.name,
    p_disponibilidad: input.availability,
    p_activo: input.active,
    p_servicios: input.serviceIds,
  });

  if (error) throw new Error(error.message);
}

export type ShopSettings = {
  name: string;
  code: string;
  timezone: string;
  open: boolean;
  graceMinutes: number;
  noticeAhead: number;
  preferentialEvery: number;
  /** Nullable shop point for the guest "how to get there" card. */
  shopLatitude: number | null;
  shopLongitude: number | null;
  /** Canonical address selected by the admin from Nominatim. */
  shopAddress: string | null;
};

/** Estado abierto/cerrado del local para el marco y el Inicio (columna real `abierta`). */
export async function fetchShopOpen(): Promise<boolean> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const { data, error } = await supabase.from('empresas').select('abierta').eq('id', empresaId).maybeSingle();

  if (error) throw new Error(error.message);
  return (data as { abierta?: boolean | null })?.abierta ?? false;
}

/** Reglas vivas del local (columnas reales de `empresas`). */
export async function fetchShopSettings(): Promise<ShopSettings> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const { data, error } = await supabase
    .from('empresas')
    .select('nombre,codigo,zona_horaria,abierta,minutos_gracia,aviso_posiciones,preferencial_cada,latitud,longitud,direccion')
    .eq('id', empresaId)
    .maybeSingle();

  if (error || !data) throw new Error('No pudimos leer la configuración del local.');

  const row = data as {
    nombre: string;
    codigo: string;
    zona_horaria: string;
    abierta: boolean;
    minutos_gracia: number;
    aviso_posiciones: number;
    preferencial_cada: number;
    latitud: number | null;
    longitud: number | null;
    direccion: string | null;
  };

  return {
    name: row.nombre,
    code: row.codigo,
    timezone: row.zona_horaria,
    open: row.abierta,
    graceMinutes: row.minutos_gracia,
    noticeAhead: row.aviso_posiciones,
    preferentialEvery: row.preferencial_cada,
    shopLatitude: typeof row.latitud === 'number' ? row.latitud : null,
    shopLongitude: typeof row.longitud === 'number' ? row.longitud : null,
    shopAddress: row.direccion,
  };
}

export async function saveShopSettings(input: {
  open: boolean;
  graceMinutes: number;
  noticeAhead: number;
  preferentialEvery: number;
  shopLatitude?: number | null;
  shopLongitude?: number | null;
  shopAddress?: string | null;
}): Promise<void> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const update: {
    abierta: boolean;
    minutos_gracia: number;
    aviso_posiciones: number;
    preferencial_cada: number;
    latitud?: number | null;
    longitud?: number | null;
    direccion?: string | null;
  } = {
    abierta: input.open,
    minutos_gracia: Math.max(1, Math.round(input.graceMinutes)),
    aviso_posiciones: Math.max(1, Math.round(input.noticeAhead)),
    preferencial_cada: Math.max(1, Math.round(input.preferentialEvery)),
  };

  // Coordinates are optional so callers that do not manage the map point
  // never wipe it: undefined leaves the stored point untouched.
  if (input.shopLatitude !== undefined) update.latitud = input.shopLatitude;
  if (input.shopLongitude !== undefined) update.longitud = input.shopLongitude;
  // Address is optional so coordinate-only edits preserve the canonical address.
  if (input.shopAddress !== undefined) update.direccion = input.shopAddress;

  const { error } = await supabase.from('empresas').update(update).eq('id', empresaId);

  if (error) throw new Error(error.message);
}

export type ServicePerformance = {
  suggestedMinutes: number | null;
  measuredCount: number;
  todayCount: number;
  avgRating: number | null;
  votes: number;
};

/** Desempeño medido por servicio (sin migración nueva: sale de los tickets). */
export async function fetchServicePerformance(): Promise<Record<string, ServicePerformance>> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const today = limaISODate();
  const { data, error } = await supabase
    .from('tickets')
    .select('servicio_nombre,inicio_en,fin_en,puntuacion,fecha_operativa')
    .eq('empresa_id', empresaId)
    .eq('estado', 'finalizado')
    .order('cerrado_en', { ascending: false })
    .limit(1000);

  if (error) throw new Error(error.message);

  const byService = new Map<string, { minutes: number[]; today: number; ratings: number[] }>();

  for (const row of (data ?? []) as Array<{
    servicio_nombre: string | null;
    inicio_en: string | null;
    fin_en: string | null;
    puntuacion: number | null;
    fecha_operativa: string;
  }>) {
    const name = row.servicio_nombre ?? 'Servicio';
    const entry = byService.get(name) ?? { minutes: [], today: 0, ratings: [] };

    if (row.inicio_en && row.fin_en) {
      const minutes = Math.round((new Date(row.fin_en).getTime() - new Date(row.inicio_en).getTime()) / 60000);
      if (Number.isFinite(minutes) && minutes >= 0) entry.minutes.push(minutes);
    }

    if (row.fecha_operativa === today) entry.today += 1;
    if (typeof row.puntuacion === 'number') entry.ratings.push(row.puntuacion);

    byService.set(name, entry);
  }

  const mean = (values: number[]): number | null =>
    values.length === 0 ? null : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;

  return Object.fromEntries(
    [...byService.entries()].map(([name, entry]) => {
      const suggestion = suggestDuration(entry.minutes);

      return [
        name,
        {
          suggestedMinutes: suggestion.suggested,
          measuredCount: suggestion.measured,
          todayCount: entry.today,
          avgRating: mean(entry.ratings),
          votes: entry.ratings.length,
        },
      ];
    }),
  );
}

/** Hourly demand baseline for the dashboard card (same weekday, recent weeks). */
export async function fetchDemandEstimate(): Promise<DemandEstimate[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('demanda_estimada');

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{ hora: number; promedio: number }>).map((row) => ({
    hour: `${row.hora}:00`,
    estimated: row.promedio,
  }));
}

export async function fetchRatings(): Promise<RatingByBarber[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('metricas_puntuacion');

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{ barbero_id: string; nombre: string; votos: number; promedio: number | null }>).map(
    (row) => ({
      barberId: row.barbero_id,
      name: row.nombre,
      votes: row.votos,
      average: row.promedio,
    }),
  );
}

export type DailySummary = {
  attended: number;
  /** Presentismo: finalizados sobre finalizados + ausentes, en porcentaje. */
  punctuality: number | null;
  /** Ausentes del día (incidentes de asistencia). */
  incidents: number;
  lastClose: string | null;
  avgServiceMinutes: number | null;
  satisfaction: number | null;
};

export type YesterdayCompare = {
  avgWaitMinutes: number | null;
  absent: number;
};

/** Ayer en Lima: espera promedio real y ausentes, para las tendencias del panel. */
export async function fetchYesterdayCompare(): Promise<YesterdayCompare> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const now = new Date();
  const yesterday = limaISODate(new Date(now.getTime() - 24 * 3600_000));
  const { data, error } = await supabase
    .from('tickets')
    .select('estado,creado_en,llamado_en,inicio_en,cerrado_en')
    .eq('empresa_id', empresaId)
    .eq('fecha_operativa', yesterday)
    .limit(500);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    estado: string;
    creado_en: string;
    llamado_en: string | null;
    inicio_en: string | null;
    cerrado_en: string | null;
  }>;
  const waits = rows
    .map((ticket) => {
      const mark = ticket.llamado_en ?? ticket.inicio_en ?? ticket.cerrado_en;
      if (!mark) return null;
      const minutes = Math.round((new Date(mark).getTime() - new Date(ticket.creado_en).getTime()) / 60000);
      return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
    })
    .filter((value): value is number => typeof value === 'number');

  return {
    avgWaitMinutes: waits.length === 0 ? null : Math.round(waits.reduce((sum, value) => sum + value, 0) / waits.length),
    absent: rows.filter((ticket) => ticket.estado === 'ausente').length,
  };
}

/** Métricas del turno actual desde los tickets de hoy (hora Lima). */
export async function fetchDailySummary(): Promise<DailySummary> {
  const supabase = getSupabase();
  const empresaId = await companyId();
  const { data, error } = await supabase
    .from('tickets')
    .select('estado,cerrado_en,inicio_en,fin_en,puntuacion')
    .eq('empresa_id', empresaId)
    .eq('fecha_operativa', limaISODate())
    .limit(500);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    estado: string;
    cerrado_en: string | null;
    inicio_en: string | null;
    fin_en: string | null;
    puntuacion: number | null;
  }>;
  const finished = rows.filter((ticket) => ticket.estado === 'finalizado');
  const absent = rows.filter((ticket) => ticket.estado === 'ausente').length;
  const serviceMinutes = finished
    .map((ticket) =>
      ticket.inicio_en && ticket.fin_en
        ? Math.round((new Date(ticket.fin_en).getTime() - new Date(ticket.inicio_en).getTime()) / 60000)
        : null,
    )
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0);
  const votes = finished
    .map((ticket) => ticket.puntuacion)
    .filter((value): value is number => typeof value === 'number');
  const closedAt = rows.map((ticket) => ticket.cerrado_en).filter((value): value is string => Boolean(value)).sort();

  return {
    attended: finished.length,
    punctuality: finished.length + absent === 0 ? null : Math.round((finished.length / (finished.length + absent)) * 100),
    incidents: absent,
    lastClose: closedAt.length > 0 ? hhmm(closedAt[closedAt.length - 1]) : null,
    avgServiceMinutes:
      serviceMinutes.length === 0
        ? null
        : Math.round(serviceMinutes.reduce((sum, value) => sum + value, 0) / serviceMinutes.length),
    satisfaction:
      votes.length === 0
        ? null
        : Math.round((votes.reduce((sum, value) => sum + value, 0) / votes.length) * 10) / 10,
  };
}
