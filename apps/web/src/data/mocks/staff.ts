/**
 * Staff fixtures.
 *
 * The first four records are `initialTeam` enriched with the profile fields the
 * staff section needs; a fifth record adds the "En descanso" state. Services
 * per barber are derived from `services[].barberIds`, never duplicated here.
 */

import type { StaffRecord, StaffRole, TeamMember } from '../types';
import { companyId } from './services';
import { initialTeam } from './panel';

const roleByEmail: Record<string, StaffRole> = {
  'diego.ramirez@turnify.app': 'admin',
};

const schedule: Record<string, { shift: string; restStart: string; restEnd: string }> = {
  'w-1': { shift: 'Mañana (8:00 - 14:00)', restStart: '11:30', restEnd: '12:00' },
  'w-2': { shift: 'Mañana (8:00 - 14:00)', restStart: '12:00', restEnd: '12:30' },
  'w-3': { shift: 'Tarde (14:00 - 20:00)', restStart: '16:30', restEnd: '17:00' },
  'w-4': { shift: 'Tarde (14:00 - 20:00)', restStart: '17:00', restEnd: '17:30' },
  'w-5': { shift: 'Noche (17:00 - 22:00)', restStart: '19:30', restEnd: '20:00' },
};

/** Local part of the staff email: accents stripped, names joined with a dot. */
function slugEmail(name: string): string {
  return `${name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')}@turnify.app`;
}

function toStaffRecord(member: TeamMember, index: number): StaffRecord {
  const email = slugEmail(member.name);
  const plan = schedule[member.id];

  return {
    id: member.id,
    companyId,
    name: member.name,
    email,
    role: roleByEmail[email] ?? 'barbero',
    station: index + 1,
    active: true,
    availability: member.availability,
    currentTicket: member.currentTicket,
    completedToday: member.completedToday,
    shift: plan.shift,
    restStart: plan.restStart,
    restEnd: plan.restEnd,
    createdAt: '2026-08-04',
  };
}

export const initialStaff: StaffRecord[] = [
  ...initialTeam.map(toStaffRecord),
  {
    id: 'w-5',
    companyId,
    name: 'Tomás Vílchez',
    email: 'tomas.vilchez@turnify.app',
    role: 'barbero',
    station: 5,
    active: true,
    availability: 'descanso',
    currentTicket: null,
    completedToday: 4,
    shift: schedule['w-5'].shift,
    restStart: schedule['w-5'].restStart,
    restEnd: schedule['w-5'].restEnd,
    createdAt: '2026-09-30',
  },
];

/** Labels moved to `@/data/labels`; re-exported here so fixtures keep compiling. */
export { paceOf, staffAvailabilityLabels, staffAvailabilityTone } from '../labels';