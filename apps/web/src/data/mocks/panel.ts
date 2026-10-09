/**
 * Fixtures backing the live panel (dashboard, queue board and services).
 *
 * These records are static on purpose: wiring a real Supabase client is a
 * separate work unit and no RPC from `supabase/migrations` should be assumed
 * here. `data/repositories.ts` is the only place that should read them.
 */

import type { ActivityEvent, QueueSummary, QueueTicket, ServiceMixItem, TeamMember } from '../types';
import { slugify } from '@/utils/format';

/**
 * Location of the branch this panel runs for. Everything that shows the place —
 * title, sidebar, QR payload — is derived from these fields, so moving the salon
 * is a one-line change here.
 */
export const branchLocation = {
  name: 'Centro',
  city: 'Lima',
  /** Suffix that keeps the public ticket link unique per branch. */
  code: '01',
};

/** `centro` + `01` -> `centro-01`. Follows the branch name automatically. */
export const branchSlug = `${slugify(branchLocation.name)}-${branchLocation.code}`;

/** `Centro` / `Lima` -> `CENTRO-DE-LIMA`. Shown next to the counter QR. */
export const branchAccessCode = [
  slugify(branchLocation.name).toUpperCase(),
  'DE',
  branchLocation.city.toUpperCase(),
].join('-');

export const business = {
  name: `Barbería Turnify · ${branchLocation.name}`,
  subtitle: 'Panel de barbería',
  branch: `Sucursal: ${branchLocation.name} de ${branchLocation.city}`,
  /** Public ticket link for this branch's QR code. */
  ticketUrl: `turnify.app/t/${branchSlug}`,
  /** Short code a customer reads out at the counter. */
  accessCode: branchAccessCode,
  owner: 'Esau Ramírez',
  ownerEmail: 'esau01s@turnify.app',
  today: 'Lunes 5 de octubre',
};

export const queues: QueueSummary[] = [
  { id: 'q-corte', name: 'Corte', prefix: 'COR', activeStations: 2 },
  { id: 'q-barba', name: 'Barba', prefix: 'BAR', activeStations: 1 },
  { id: 'q-combo', name: 'Corte + Barba', prefix: 'CMB', activeStations: 1 },
];

export const initialTickets: QueueTicket[] = [
  {
    id: 't-101',
    code: 'C-104',
    queueId: 'q-corte',
    customer: 'Carlos Méndez',
    service: 'Corte caballero',
    barber: 'Diego Ramírez',
    status: 'atencion',
    priority: false,
    waitedMinutes: 0,
    arrivesAt: '18:20',
  },
  {
    id: 't-102',
    code: 'C-105',
    queueId: 'q-corte',
    customer: 'Lucía Fernández',
    service: 'Corte caballero',
    barber: null,
    status: 'llamado',
    priority: false,
    waitedMinutes: 2,
    arrivesAt: '18:30',
  },
  {
    id: 't-103',
    code: 'C-106',
    queueId: 'q-corte',
    customer: 'Andrés Soto',
    service: 'Corte + barba',
    barber: 'Diego Ramírez',
    status: 'espera',
    priority: true,
    waitedMinutes: 11,
    arrivesAt: '18:45',
  },
  {
    id: 't-104',
    code: 'B-031',
    queueId: 'q-barba',
    customer: 'Jorge Parra',
    service: 'Barba clásica',
    barber: 'Mateo Cruz',
    status: 'espera',
    priority: false,
    waitedMinutes: 18,
    arrivesAt: '18:55',
  },
  {
    id: 't-105',
    code: 'B-032',
    queueId: 'q-barba',
    customer: 'Rodrigo Salas',
    service: 'Barba + perfilado',
    barber: null,
    status: 'llamado',
    priority: false,
    waitedMinutes: 4,
    arrivesAt: '19:05',
  },
  {
    id: 't-106',
    code: 'M-014',
    queueId: 'q-combo',
    customer: 'Pedro Navarro',
    service: 'Corte + barba',
    barber: 'Mateo Cruz',
    status: 'atencion',
    priority: false,
    waitedMinutes: 0,
    arrivesAt: '19:10',
  },
  {
    id: 't-107',
    code: 'C-103',
    queueId: 'q-corte',
    customer: 'Álvaro Ruiz',
    service: 'Corte caballero',
    barber: 'Diego Ramírez',
    status: 'finalizado',
    priority: false,
    waitedMinutes: 34,
    arrivesAt: '18:05',
  },
  {
    id: 't-108',
    code: 'B-030',
    queueId: 'q-barba',
    customer: 'Sergio Díaz',
    service: 'Barba clásica',
    barber: 'Mateo Cruz',
    status: 'ausente',
    priority: false,
    waitedMinutes: 41,
    arrivesAt: '17:55',
  },
  {
    id: 't-109',
    code: 'C-107',
    queueId: 'q-corte',
    customer: 'Roberto Vargas',
    service: 'Corte caballero',
    barber: null,
    status: 'espera',
    priority: false,
    waitedMinutes: 6,
    arrivesAt: '19:15',
  },
];

/**
 * The four barbers on shift. `data/mocks/staff.ts` enriches these into full
 * `StaffRecord` profiles, so this stays the single source of barber identity.
 */
export const initialTeam: TeamMember[] = [
  { id: 'w-1', name: 'Diego Ramírez', availability: 'atencion', currentTicket: 'C-104', completedToday: 11 },
  { id: 'w-2', name: 'Mateo Cruz', availability: 'atencion', currentTicket: 'M-014', completedToday: 8 },
  { id: 'w-3', name: 'Iván Salazar', availability: 'disponible', currentTicket: null, completedToday: 6 },
  { id: 'w-4', name: 'Rosa Medina', availability: 'fuera', currentTicket: null, completedToday: 0 },
];

export const initialActivity: ActivityEvent[] = [
  { id: 'a-1', time: '18:52', message: 'Iván Salazar quedó disponible.', tone: 'brand' },
  { id: 'a-2', time: '18:48', message: 'B-032 fue llamado por Mateo Cruz.', tone: 'gold' },
  { id: 'a-3', time: '18:41', message: 'B-030 se marcó ausente tras 5 minutos de tolerancia.', tone: 'danger' },
  { id: 'a-4', time: '18:36', message: 'C-105 tomó turno desde el código QR.', tone: 'brand' },
];

export const serviceMix: ServiceMixItem[] = [
  { service: 'Corte caballero', count: 21 },
  { service: 'Corte + barba', count: 14 },
  { service: 'Barba clásica', count: 9 },
  { service: 'Barba + perfilado', count: 4 },
];

export const statusLabels: Record<QueueTicket['status'], string> = {
  espera: 'En espera',
  llamado: 'Llamado',
  atencion: 'En atención',
  finalizado: 'Finalizado',
  ausente: 'Ausente',
};

/** Labels moved to `@/data/labels`; re-exported here so fixtures keep compiling. */
export { availabilityLabels, statusTone } from '../labels';