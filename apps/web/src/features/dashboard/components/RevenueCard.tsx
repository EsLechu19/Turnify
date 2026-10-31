import { useEffect, useState } from 'react';

import { Card, CardHead } from '@/components/common';
import { serviceRepository } from '@/data/repositories';
import { formatPrice } from '@/utils/format';
import { useQueue } from '@/state/QueueContext';

/**
 * Estimated money of the day: finished tickets joined with the catalog
 * reference prices. Labeled as an estimate because the ticket stores the
 * service name, not a price snapshot.
 */
export function RevenueCard() {
  const { tickets } = useQueue();
  const [prices, setPrices] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    let active = true;

    serviceRepository
      .list()
      .then((services) => {
        if (active) setPrices(new Map(services.map((service) => [service.name, service.priceCents])));
      })
      .catch(() => {
        if (active) setPrices(new Map());
      });

    return () => {
      active = false;
    };
  }, []);

  const finished = tickets.filter((ticket) => ticket.status === 'finalizado');
  const matched = prices == null ? null : finished.filter((ticket) => prices.has(ticket.service));
  const cents = matched == null ? null : matched.reduce((sum, ticket) => sum + (prices?.get(ticket.service) ?? 0), 0);

  return (
    <Card>
      <CardHead detail="Precios de referencia, no cobro verificado" title="Ingresos estimados hoy" />
      <div className="revenue-card__metrics">
        <div className="revenue-card__metric">
          <span className="revenue-card__label">Estimado</span>
          <strong className="revenue-card__value">{cents == null ? '…' : formatPrice(cents)}</strong>
          <span className="revenue-card__foot muted">{finished.length} turnos finalizados</span>
        </div>
        <div className="revenue-card__metric">
          <span className="revenue-card__label">Con precio</span>
          <strong className="revenue-card__value">{matched == null ? '…' : String(matched.length)}</strong>
          <span className="revenue-card__foot muted">{matched == null ? 'Cruzando catálogo…' : `${matched.length} con precio`}</span>
        </div>
      </div>
    </Card>
  );
}
