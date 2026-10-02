import type { CommercialBarber, CommercialCatalog, CommercialService } from './commercial-queue-api';

export type BarberChoice = { kind: 'any' } | { kind: 'named'; barberId: string };

export function compatibleBarbers(catalog: CommercialCatalog, serviceId: string | null): CommercialBarber[] {
  if (!serviceId) return [];
  return catalog.barbers.filter((barber) => barber.serviceIds.includes(serviceId));
}

export function selectedBarber(
  barbers: CommercialBarber[],
  choice: BarberChoice | null,
): CommercialBarber | null {
  if (choice?.kind !== 'named') return null;
  return barbers.find((barber) => barber.barberId === choice.barberId) ?? null;
}

export function formatReferencePrice(referencePriceCents: number | null): string | null {
  if (referencePriceCents === null) return null;
  return `S/ ${(referencePriceCents / 100).toFixed(2)}`;
}

export function bookingExpectation(
  service: CommercialService,
  barber: CommercialBarber | null,
): string {
  if (!barber) {
    return `Buscaremos un barbero en turno compatible con ${service.name} cuando se llame tu turno.`;
  }
  return barber.operationalState === 'ocupado'
    ? `${barber.name} está atendiendo. Tu turno quedará en espera hasta que pueda atenderte.`
    : `Solicitaste a ${barber.name}. Tu turno quedará en espera hasta que se te llame.`;
}
