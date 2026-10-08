/**
 * Service catalog fixtures.
 *
 * Assigned barbers are not duplicated per service: they live in
 * `ServiceRecord.barberIds` and the staff section derives its view from them.
 */

import type { ServiceRecord } from '../types';

export const companyId = 'emp-turnify-01';

export const initialServices: ServiceRecord[] = [
  {
    id: 'svc-1',
    companyId,
    name: 'Corte caballero',
    description: 'Corte con tijera y máquina, lavado y peinado final.',
    durationSeconds: 1800,
    priceCents: 2500,
    active: true,
    barberIds: ['w-1', 'w-2', 'w-3', 'w-4'],
    createdAt: '2026-09-12',
  },
  {
    id: 'svc-2',
    companyId,
    name: 'Corte + barba',
    description: 'Combo de corte de cabello con perfilado de barba completa.',
    durationSeconds: 2700,
    priceCents: 4000,
    active: true,
    barberIds: ['w-1', 'w-3'],
    createdAt: '2026-09-12',
  },
  {
    id: 'svc-3',
    companyId,
    name: 'Barba clásica',
    description: 'Afeitado clásico con toalla caliente y bálsamo.',
    durationSeconds: 1200,
    priceCents: 2000,
    active: true,
    barberIds: ['w-2', 'w-3'],
    createdAt: '2026-09-18',
  },
  {
    id: 'svc-4',
    companyId,
    name: 'Barba + perfilado',
    description: 'Diseño de barba y cejas con navaja.',
    durationSeconds: 1500,
    priceCents: 2500,
    active: true,
    barberIds: ['w-4'],
    createdAt: '2026-09-25',
  },
  {
    id: 'svc-5',
    companyId,
    name: 'Corte infantil',
    description: 'Corte para niños hasta 12 años, con paciencia incluida.',
    durationSeconds: 1800,
    priceCents: 2000,
    active: false,
    barberIds: [],
    createdAt: '2026-10-01',
  },
];