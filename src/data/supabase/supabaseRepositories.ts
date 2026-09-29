// Supabase adapter for the repository ports in src/data/repositories.ts.
// This is the ONLY file in the repo allowed to import @supabase/supabase-js.
// Every query goes through the RPC functions defined in migration 0002;
// no direct table writes are performed, matching the RLS design in 0001
// where ticket writes happen through RPC only.
// The client is created with the anon key only. URL and key are injected
// as parameters (or read from env by the factory below) and never hardcoded.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { IllegalTransitionError, TurnNotFoundError } from '../../domain/errors';
import type {
  BusinessRecord,
  BusinessRepository,
  BusinessSummary,
  CreateBusinessInput,
  DailySummary,
  InvitationRecord,
  MetricsRepository,
  MyTicketState,
  NotificationPort,
  PeakHour,
  StaffRole,
  TicketPriority,
  TicketRecord,
  TicketRepository,
} from '../repositories';
import type { Database } from '../../../packages/types/database';

// Row type of the live tickets table (regenerated from turnify-dev).
type TicketRow = Database['public']['Tables']['tickets']['Row'];

// Minimal env typing without pulling in @types/node, so tsc stays green.
declare const process: { env: Record<string, string | undefined> };

// Resolve a connection value from the environment with an Expo fallback.

// RPC error text comes back in Spanish from Postgres exceptions.
// Map the known cases to typed domain errors; anything else stays a plain
// Error with the original message attached.
function mapRpcError(message: string, fallbackId: string): Error {
  const lower = message.toLowerCase();
  if (
    lower.includes('no encontrada') ||
    lower.includes('no encontrado') ||
    lower.includes('no existe') ||
    lower.includes('invitaci\u00f3n inv\u00e1lida')
  ) {
    return new TurnNotFoundError(fallbackId);
  }
  if (
    lower.includes('solo puedes') ||
    lower.includes('no est\u00e1 llamado') ||
    lower.includes('no est\u00e1 en atenci\u00f3n') ||
    lower.includes('ya tienes un turno activo')
  ) {
    const parts = fallbackId.split(':');
    return new IllegalTransitionError(parts[0] ?? 'unknown', parts[1] ?? message);
  }
  return new Error(message);
}

// Throw the mapped error when a Supabase RPC call fails.
function throwRpcError(error: { message: string }, fallbackId: string): never {
  throw mapRpcError(error.message, fallbackId);
}

// Convert a raw ticket row (snake_case, Spanish enums) into the port DTO.
function toTicketRecord(row: TicketRow): TicketRecord {
  return {
    id: row.id,
    businessId: row.empresa_id,
    queueId: row.fila_id,
    customerId: row.cliente_id,
    servedBy: row.atendido_por,
    origin: row.origen,
    priority: row.prioridad,
    status: row.estado,
    operatingDate: row.fecha_operativa,
    number: row.numero,
    visibleCode: row.codigo_visible,
    guestName: row.nombre_ref,
  };
}

// Normalize the jsonb payload returned by resumen_empresa.
function toBusinessSummary(payload: {
  nombre: string;
  abierta: boolean;
  filas: Array<{
    fila_id: string;
    nombre: string;
    en_espera: number;
    espera_min: number;
  }>;
}): BusinessSummary {
  return {
    name: payload.nombre,
    open: payload.abierta,
    queues: payload.filas.map((fila) => ({
      queueId: fila.fila_id,
      name: fila.nombre,
      waiting: fila.en_espera,
      waitMinutes: fila.espera_min,
    })),
  };
}

export class SupabaseTicketRepository implements TicketRepository {
  // Client uses the anon key; RLS and SECURITY DEFINER RPCs enforce access.
  constructor(private readonly client: SupabaseClient<Database>) {}

  async takeTurn(
    companyCode: string,
    queueId?: string | null,
  ): Promise<TicketRecord> {
    const { data, error } = await this.client.rpc('tomar_turno', {
      p_codigo: companyCode,
      p_fila_id: queueId ?? undefined,
    });
    if (error) throwRpcError(error, companyCode);
    return toTicketRecord(data as unknown as TicketRow);
  }

  async getMyTicket(ticketId: string): Promise<MyTicketState> {
    const { data, error } = await this.client.rpc('mi_ticket_estado', {
      p_ticket_id: ticketId,
    });
    if (error) throwRpcError(error, ticketId);
    const row = data as unknown as {
      codigo_visible: string;
      estado: MyTicketState['status'];
      personas_delante: number;
      espera_min: number;
    };
    return {
      visibleCode: row.codigo_visible,
      status: row.estado,
      peopleAhead: row.personas_delante,
      waitMinutes: row.espera_min,
    };
  }

  async cancel(ticketId: string): Promise<TicketRecord> {
    const { data, error } = await this.client.rpc('cancelar_ticket', {
      p_ticket_id: ticketId,
    });
    if (error) throwRpcError(error, `cancel:${ticketId}`);
    return toTicketRecord(data as unknown as TicketRow);
  }

  async createWalkIn(
    queueId: string,
    priority: TicketPriority = 'normal',
    guestName?: string | null,
  ): Promise<TicketRecord> {
    const { data, error } = await this.client.rpc('crear_ticket_presencial', {
      p_fila_id: queueId,
      p_prioridad: priority,
      p_nombre_ref: guestName ?? undefined,
    });
    if (error) throwRpcError(error, queueId);
    return toTicketRecord(data as unknown as TicketRow);
  }

  async callNext(queueId: string): Promise<TicketRecord | null> {
    const { data, error } = await this.client.rpc('llamar_siguiente', {
      p_fila_id: queueId,
    });
    if (error) throwRpcError(error, queueId);
    if (data === null) return null;
    return toTicketRecord(data as unknown as TicketRow);
  }

  async startService(ticketId: string): Promise<TicketRecord> {
    const { data, error } = await this.client.rpc('iniciar_atencion', {
      p_ticket_id: ticketId,
    });
    if (error) throwRpcError(error, `llamado:en_atencion:${ticketId}`);
    return toTicketRecord(data as unknown as TicketRow);
  }

  async finishService(ticketId: string): Promise<TicketRecord> {
    const { data, error } = await this.client.rpc('finalizar_atencion', {
      p_ticket_id: ticketId,
    });
    if (error) throwRpcError(error, `en_atencion:finalizado:${ticketId}`);
    return toTicketRecord(data as unknown as TicketRow);
  }

  async markAbsent(ticketId: string): Promise<TicketRecord> {
    const { data, error } = await this.client.rpc('marcar_ausente', {
      p_ticket_id: ticketId,
    });
    if (error) throwRpcError(error, `llamado:ausente:${ticketId}`);
    return toTicketRecord(data as unknown as TicketRow);
  }
}

export class SupabaseBusinessRepository implements BusinessRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async createBusiness(input: CreateBusinessInput): Promise<BusinessRecord> {
    const { data, error } = await this.client.rpc('crear_empresa', {
      p_nombre: input.name,
      p_id_fiscal: input.fiscalId ?? undefined,
      p_correo: input.email ?? undefined,
      p_telefono: input.phone ?? undefined,
      p_direccion: input.address ?? undefined,
    });
    if (error) throwRpcError(error, input.name);
    const row = data as unknown as {
      id: string;
      nombre: string;
      codigo: string;
      abierta: boolean;
    };
    return { id: row.id, name: row.nombre, code: row.codigo, open: row.abierta };
  }

  async getSummary(companyCode: string): Promise<BusinessSummary> {
    const { data, error } = await this.client.rpc('resumen_empresa', {
      p_codigo: companyCode,
    });
    if (error) throwRpcError(error, companyCode);
    return toBusinessSummary(
      data as unknown as Parameters<typeof toBusinessSummary>[0],
    );
  }

  async inviteStaff(
    email: string,
    role: StaffRole = 'personal',
  ): Promise<InvitationRecord> {
    const { data, error } = await this.client.rpc('crear_invitacion', {
      p_email: email,
      p_rol: role,
    });
    if (error) throwRpcError(error, email);
    const row = data as unknown as {
      id: string;
      empresa_id: string;
      email: string;
      rol: StaffRole;
      token: string;
      aceptada: boolean;
    };
    return {
      id: row.id,
      businessId: row.empresa_id,
      email: row.email,
      role: row.rol,
      token: row.token,
      accepted: row.aceptada,
    };
  }

  async acceptInvite(token: string): Promise<string> {
    const { data, error } = await this.client.rpc('aceptar_invitacion', {
      p_token: token,
    });
    if (error) throwRpcError(error, token);
    return data as unknown as string;
  }
}

export class SupabaseMetricsRepository implements MetricsRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async dailySummary(businessId: string): Promise<DailySummary> {
    const { data, error } = await this.client.rpc('metricas_resumen', {
      p_empresa_id: businessId,
    });
    if (error) throwRpcError(error, businessId);
    const payload = data as unknown as {
      por_estado: DailySummary['byStatus'];
      total_hoy: number;
    };
    return { byStatus: payload.por_estado ?? {}, totalToday: payload.total_hoy };
  }

  async peakHours(businessId: string): Promise<PeakHour[]> {
    const { data, error } = await this.client.rpc('metricas_horas_pico', {
      p_empresa_id: businessId,
    });
    if (error) throwRpcError(error, businessId);
    const rows = (data ?? []) as unknown as Array<{
      hora: number;
      total: number;
    }>;
    return rows.map((row) => ({ hour: row.hora, total: Number(row.total) }));
  }
}

// Push delivery is out of scope for the MVP, so this port is declared here
// next to the Supabase adapters but intentionally left unimplemented.
export class NotImplementedNotificationPort implements NotificationPort {
  async notifyTicketCalled(_ticketId: string): Promise<void> {
    throw new Error('Not implemented: push notifications are out of scope');
  }
}

export interface SupabaseRepositories {
  tickets: SupabaseTicketRepository;
  businesses: SupabaseBusinessRepository;
  metrics: SupabaseMetricsRepository;
  notifications: NotImplementedNotificationPort;
}

// Build every repository from one injected client (tests inject a fake).
export function createSupabaseRepositories(
  client: SupabaseClient<Database>,
): SupabaseRepositories {
  return {
    tickets: new SupabaseTicketRepository(client),
    businesses: new SupabaseBusinessRepository(client),
    metrics: new SupabaseMetricsRepository(client),
    notifications: new NotImplementedNotificationPort(),
  };
}

// Production factory: anon key only, values read from env, never hardcoded.
// Reads SUPABASE_URL / SUPABASE_ANON_KEY (server) with EXPO_PUBLIC_ fallbacks.
export function createSupabaseClientFromEnv(): SupabaseClient<Database> {
  const url =
    process.env['SUPABASE_URL'] ?? process.env['EXPO_PUBLIC_SUPABASE_URL'] ?? '';
  const anonKey =
    process.env['SUPABASE_ANON_KEY'] ??
    process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ??
    '';
  if (url.trim() === '') throw new Error('Missing required environment variable "SUPABASE_URL"');
  if (anonKey.trim() === '') {
    throw new Error('Missing required environment variable "SUPABASE_ANON_KEY"');
  }
  return createClient<Database>(url, anonKey);
}
