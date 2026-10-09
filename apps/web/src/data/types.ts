/**
 * Shapes of the read model the panel renders.
 *
 * Every type the features consume lives here so there is a single source of
 * truth. Fixtures live in `data/mocks/`, derivations in `data/compute.ts` and
 * the access boundary in `data/repositories.ts`.
 */

export type TicketStatus = 'espera' | 'llamado' | 'atencion' | 'finalizado' | 'ausente';

export interface QueueTicket {
  id: string;
  code: string;
  queueId: string;
  customer: string;
  service: string;
  barber: string | null;
  status: TicketStatus;
  priority: boolean;
  waitedMinutes: number;
  arrivesAt: string;
}

export interface QueueSummary {
  id: string;
  name: string;
  prefix: string;
  activeStations: number;
}

export interface ServiceMixItem {
  service: string;
  count: number;
}

/** One hour of the demand baseline: average tickets created that hour. */
export interface DemandEstimate {
  hour: string;
  estimated: number;
}

export interface ActivityEvent {
  id: string;
  time: string;
  message: string;
  tone: 'brand' | 'gold' | 'danger';
}

export type StaffAvailability = 'atencion' | 'disponible' | 'descanso' | 'fuera';

export type StaffRole = 'admin' | 'barbero';

/** Full staff profile shown by the "Barberos y empleados" section. */
export interface StaffRecord {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: StaffRole;
  station: number;
  active: boolean;
  availability: StaffAvailability;
  currentTicket: string | null;
  completedToday: number;
  shift: string;
  restStart: string;
  restEnd: string;
  createdAt: string;
}

/** Narrow projection of `StaffRecord` used by the dashboard and the queue board. */
export type TeamMember = Pick<
  StaffRecord,
  'id' | 'name' | 'availability' | 'currentTicket' | 'completedToday'
>;

/**
 * Fields mirror the `public.servicios` table (nombre, descripcion,
 * duracion_estimada_seg, precio_referencia_centavos, activo) plus the
 * `barbero_servicios` pivot used for the assigned barbers.
 */
export interface ServiceRecord {
  id: string;
  companyId: string;
  name: string;
  description: string;
  durationSeconds: number;
  priceCents: number;
  active: boolean;
  barberIds: string[];
  createdAt: string;
}

export type HistoryStatus = 'completado' | 'ausencia' | 'cancelado';

export interface HistoryRecord {
  id: string;
  code: string;
  date: string;
  arrival: string;
  customer: string;
  service: string;
  barber: string | null;
  waitMinutes: number;
  durationMinutes: number;
  status: HistoryStatus;
}

export interface PanelStats {
  waiting: number;
  inService: number;
  called: number;
  completed: number;
  absent: number;
  averageWaitMinutes: number;
}

export type AuthRole = 'admin' | 'barbero';

export interface AuthUser {
  email: string;
  name: string;
  role: AuthRole;
}

export interface AuthSession {
  user: AuthUser;
  /** ISO timestamp, used to show when the panel was opened. */
  issuedAt: string;
}