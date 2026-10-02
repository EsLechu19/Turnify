import { describe, expect, it } from 'vitest';

import {
  bookingExpectation,
  compatibleBarbers,
  formatReferencePrice,
  selectedBarber,
} from '../../apps/mobile/src/features/queue/commercial-booking';
import type { CommercialCatalog, CommercialService } from '../../apps/mobile/src/features/queue/commercial-queue-api';

const service: CommercialService = {
  serviceId: 'service-cut',
  name: 'Corte',
  description: null,
  estimatedDurationSeconds: 1800,
  referencePriceCents: 4500,
};

const catalog: CommercialCatalog = {
  name: 'Barbería Central',
  open: true,
  services: [service],
  barbers: [
    { barberId: 'busy', name: 'Luis', operationalState: 'ocupado', serviceIds: ['service-cut'] },
    { barberId: 'free', name: 'Marco', operationalState: 'disponible', serviceIds: ['service-cut'] },
    { barberId: 'other', name: 'Ana', operationalState: 'disponible', serviceIds: ['other-service'] },
  ],
};

describe('commercial customer booking choices', () => {
  it('keeps named busy barbers selectable when they are compatible and on shift', () => {
    const barbers = compatibleBarbers(catalog, service.serviceId);

    expect(barbers.map((barber) => barber.barberId)).toEqual(['busy', 'free']);
    expect(selectedBarber(barbers, { kind: 'named', barberId: 'busy' })).toMatchObject({ name: 'Luis' });
    expect(bookingExpectation(service, barbers[0]!)).toContain('está atendiendo');
  });

  it('uses the any-compatible option without implying an immediate assignment', () => {
    expect(selectedBarber(compatibleBarbers(catalog, service.serviceId), { kind: 'any' })).toBeNull();
    expect(bookingExpectation(service, null)).toContain('cuando se llame tu turno');
  });

  it('formats optional reference prices only when the catalog supplies one', () => {
    expect(formatReferencePrice(4500)).toBe('S/ 45.00');
    expect(formatReferencePrice(null)).toBeNull();
  });
});
