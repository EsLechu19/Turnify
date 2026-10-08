import type { CommercialBarber, CommercialCatalog, CommercialService } from '@/features/queue/commercial-queue-api';

/**
 * Static barbería directory used by the customer home so the discovery
 * experience can be explored without changing any backend endpoint. Every
 * barbería carries a `CommercialCatalog` shaped payload, so selecting one can
 * seed the existing guest booking flow (service -> barber -> details).
 */

export type BarberDirectoryEntry = {
  businessId: string;
  code: string;
  name: string;
  district: string;
  distanceKm: number;
  etaMinutes: number;
  isOpen: boolean;
  catalog: CommercialCatalog;
};

const catalog = (name: string, isOpen: boolean, services: CommercialService[], barbers: CommercialBarber[]): CommercialCatalog => ({
  name,
  open: isOpen,
  services,
  barbers,
});

const service = (id: string, name: string, description: string, minutes: number, price: number): CommercialService => ({
  serviceId: id,
  name,
  description,
  estimatedDurationSeconds: minutes * 60,
  referencePriceCents: price,
});

const barber = (id: string, name: string, state: CommercialBarber['operationalState'], serviceIds: string[]): CommercialBarber => ({
  barberId: id,
  name,
  operationalState: state,
  serviceIds,
});

export const BARBER_DISTRICTS = ['Todos', 'Miraflores', 'San Isidro', 'Barranco', 'Surco'] as const;
export type BarberDistrict = (typeof BARBER_DISTRICTS)[number];

export const BARBER_DIRECTORY: BarberDirectoryEntry[] = [
  {
    businessId: 'dir-001',
    code: 'TURNIFY-MIRAFLORES',
    name: 'Turnify Miraflores',
    district: 'Miraflores',
    distanceKm: 0.4,
    etaMinutes: 3,
    isOpen: true,
    catalog: catalog('Turnify Miraflores', true, [
      service('svc-cut', 'Corte clásico', 'Corte y peinado con lavado.', 30, 2000),
      service('svc-cut-beard', 'Corte + barba', 'Corte con perfilado de barba.', 45, 3500),
      service('svc-beard', 'Perfilado de barba', 'Perfilado y recorte de barba.', 20, 1800),
    ], [
      barber('barb-001', 'Carlos Méndez', 'disponible', ['svc-cut', 'svc-cut-beard']),
      barber('barb-002', 'Luis Ramírez', 'ocupado', ['svc-cut', 'svc-beard']),
      barber('barb-003', 'Diego Salas', 'disponible', ['svc-cut-beard', 'svc-beard']),
    ]),
  },
  {
    businessId: 'dir-002',
    code: 'TURNIFY-SANISIDRO',
    name: 'Turnify San Isidro',
    district: 'San Isidro',
    distanceKm: 1.2,
    etaMinutes: 6,
    isOpen: true,
    catalog: catalog('Turnify San Isidro', true, [
      service('svc-cut', 'Corte clásico', 'Corte y peinado con lavado.', 30, 2200),
      service('svc-fade', 'Corte degradado', 'Degradado con lineas definidas.', 40, 2800),
    ], [
      barber('barb-101', 'Andrés Rojas', 'disponible', ['svc-cut', 'svc-fade']),
      barber('barb-102', 'Pedro Alvarado', 'disponible', ['svc-cut']),
    ]),
  },
  {
    businessId: 'dir-003',
    code: 'TURNIFY-BARRANCO',
    name: 'Turnify Barranco',
    district: 'Barranco',
    distanceKm: 2.0,
    etaMinutes: 9,
    isOpen: true,
    catalog: catalog('Turnify Barranco', true, [
      service('svc-cut-beard', 'Corte + barba', 'Corte con perfilado de barba.', 45, 3200),
      service('svc-shave', 'Afeitado clásico', 'Afeitado clásico con toalla caliente.', 25, 1500),
    ], [
      barber('barb-201', 'Mateo Vargas', 'disponible', ['svc-cut-beard', 'svc-shave']),
    ]),
  },
  {
    businessId: 'dir-004',
    code: 'TURNIFY-SURCO',
    name: 'Turnify Surco',
    district: 'Surco',
    distanceKm: 3.4,
    etaMinutes: 12,
    isOpen: false,
    catalog: catalog('Turnify Surco', false, [
      service('svc-cut', 'Corte clásico', 'Corte y peinado con lavado.', 30, 2500),
      service('svc-kids', 'Corte infantil', 'Corte para niños hasta 10 años.', 25, 1800),
    ], [
      barber('barb-301', 'Jorge Palma', 'disponible', ['svc-cut', 'svc-kids']),
    ]),
  },
  {
    businessId: 'dir-005',
    code: 'TURNIFY-MIRAFLORES-2',
    name: 'Turnify Miraflores Centro',
    district: 'Miraflores',
    distanceKm: 1.7,
    etaMinutes: 7,
    isOpen: true,
    catalog: catalog('Turnify Miraflores Centro', true, [
      service('svc-cut', 'Corte clásico', 'Corte y peinado con lavado.', 30, 1900),
      service('svc-beard', 'Perfilado de barba', 'Perfilado y recorte de barba.', 20, 1600),
      service('svc-color', 'Color de cabello', 'Coloración y tratamiento.', 60, 5500),
    ], [
      barber('barb-401', 'Iván Castro', 'disponible', ['svc-cut', 'svc-color']),
      barber('barb-402', 'Rosa Gutiérrez', 'ocupado', ['svc-beard', 'svc-color']),
    ]),
  },
  {
    businessId: 'dir-006',
    code: 'TURNIFY-SANISIDRO-2',
    name: 'Turnify San Isidro Norte',
    district: 'San Isidro',
    distanceKm: 2.6,
    etaMinutes: 10,
    isOpen: true,
    catalog: catalog('Turnify San Isidro Norte', true, [
      service('svc-cut', 'Corte clásico', 'Corte y peinado con lavado.', 30, 2100),
      service('svc-cut-beard', 'Corte + barba', 'Corte con perfilado de barba.', 45, 3400),
    ], [
      barber('barb-501', 'Sergio Niles', 'disponible', ['svc-cut', 'svc-cut-beard']),
    ]),
  },
];

export function nearbyBarberias(limit = 5): BarberDirectoryEntry[] {
  return [...BARBER_DIRECTORY].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit);
}

export function barberiasByDistrict(district: BarberDistrict): BarberDirectoryEntry[] {
  if (district === 'Todos') return BARBER_DIRECTORY;
  return BARBER_DIRECTORY.filter((entry) => entry.district === district);
}

export function barberAvailableCount(entry: BarberDirectoryEntry): number {
  return entry.catalog.barbers.filter((item) => item.operationalState === 'disponible').length;
}

export function barberServiceMinPrice(entry: BarberDirectoryEntry): number | null {
  const prices = entry.catalog.services
    .map((item) => item.referencePriceCents)
    .filter((value): value is number => value !== null);
  if (prices.length === 0) return null;
  return Math.min(...prices);
}
