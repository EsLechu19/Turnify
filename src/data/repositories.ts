// Repository ports for the Turnify data layer.
// Pure TypeScript: this module never touches the network and never imports
// any Supabase client. The Supabase adapter lives in
// src/data/supabase/supabaseRepositories.ts, which is the only file allowed
// to import the Supabase client library.
// Status literals stay in Spanish to match the database enum estado_ticket;
// every other identifier and comment in this module is in English.
import type { TicketStatus } from '../domain/turn';
import type {
  IllegalTransitionError,
  TurnNotFoundError,
} from '../domain/errors';

// How a ticket entered the queue. Mirrors origen_ticket in migration 0001.
export type TicketOrigin = 'app' | 'presencial';

// Queue priority lane. Mirrors prioridad_ticket in migration 0001.
export type TicketPriority = 'normal' | 'preferencial';

// Staff roles accepted by staff-only flows. Mirrors rol_usuario in 0001.
export type StaffRole = 'personal' | 'admin';

// One queue ticket as returned by the data layer.
export interface TicketRecord {
  id: string;
  businessId: string;
  queueId: string;
  customerId: string | null;
  servedBy: string | null;
  origin: TicketOrigin;
  priority: TicketPriority;
  status: TicketStatus;
  operatingDate: string;
  number: number;
  visibleCode: string;
  guestName: string | null;
}

// Customer-facing view of one own ticket (mi_ticket_estado shape).
export interface MyTicketState {
  visibleCode: string;
  status: TicketStatus;
  peopleAhead: number;
  waitMinutes: number;
}

// Public company summary (resumen_empresa shape). Aggregate data only,
// no personal data, so it can be shown before login.
export interface QueueSummary {
  queueId: string;
  name: string;
  waiting: number;
  waitMinutes: number;
}

export interface BusinessSummary {
  name: string;
  open: boolean;
  queues: QueueSummary[];
}

// Input accepted by crear_empresa. Extra columns were added in 0002
// without touching migration 0001.
export interface CreateBusinessInput {
  name: string;
  fiscalId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface BusinessRecord {
  id: string;
  name: string;
  code: string;
  open: boolean;
}

export interface InvitationRecord {
  id: string;
  businessId: string;
  email: string;
  role: StaffRole;
  token: string;
  accepted: boolean;
}

// Per-state counts for the current operating date (metricas_resumen shape).
export interface DailySummary {
  byStatus: Partial<Record<TicketStatus, number>>;
  totalToday: number;
}

// Tickets created per hour for the current operating date
// (metricas_horas_pico shape).
export interface PeakHour {
  hour: number;
  total: number;
}

// Errors thrown by every port method are plain Errors, with two typed
// cases imported from src/domain/errors.ts:
// - TurnNotFoundError when the row or company is missing.
// - IllegalTransitionError when the ticket state forbids the move.
export type RepositoryError =
  | IllegalTransitionError
  | TurnNotFoundError
  | Error;

// Customer + staff ticket flows. RPC mapping (migration 0002):
// takeTurn -> tomar_turno, getMyTicket -> mi_ticket_estado (+ row read),
// cancel -> cancelar_ticket, createWalkIn -> crear_ticket_presencial,
// callNext -> llamar_siguiente, startService -> iniciar_atencion,
// finishService -> finalizar_atencion, markAbsent -> marcar_ausente.
export interface TicketRepository {
  takeTurn(companyCode: string, queueId?: string | null): Promise<TicketRecord>;
  getMyTicket(ticketId: string): Promise<MyTicketState>;
  cancel(ticketId: string): Promise<TicketRecord>;
  createWalkIn(
    queueId: string,
    priority?: TicketPriority,
    guestName?: string | null,
  ): Promise<TicketRecord>;
  callNext(queueId: string): Promise<TicketRecord | null>;
  startService(ticketId: string): Promise<TicketRecord>;
  finishService(ticketId: string): Promise<TicketRecord>;
  markAbsent(ticketId: string): Promise<TicketRecord>;
}

// Company + staff membership flows. RPC mapping (migration 0002):
// createBusiness -> crear_empresa, getSummary -> resumen_empresa,
// inviteStaff -> crear_invitacion, acceptInvite -> aceptar_invitacion.
export interface BusinessRepository {
  createBusiness(input: CreateBusinessInput): Promise<BusinessRecord>;
  getSummary(companyCode: string): Promise<BusinessSummary>;
  inviteStaff(email: string, role?: StaffRole): Promise<InvitationRecord>;
  acceptInvite(token: string): Promise<string>;
}

// Read-only aggregates with caller rights (SECURITY INVOKER in 0002,
// so RLS still applies). RPC mapping: dailySummary -> metricas_resumen,
// peakHours -> metricas_horas_pico.
export interface MetricsRepository {
  dailySummary(businessId: string): Promise<DailySummary>;
  peakHours(businessId: string): Promise<PeakHour[]>;
}

// Out-of-scope channel: push delivery is not part of the MVP backend,
// so the port exists only to mark the seam for a future adapter.
export interface NotificationPort {
  notifyTicketCalled(ticketId: string): Promise<void>;
}
