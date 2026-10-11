import { useEffect, useMemo, useState } from 'react';

import { PageHeader, TwoColumnGrid } from '@/components/common';
import { computeAlerts } from '@/data/compute';
import { fetchDailySummary, fetchDemandEstimate, fetchRatings, fetchYesterdayCompare, type DailySummary, type RatingByBarber } from '@/data/live';
import type { DemandEstimate } from '@/data/types';
import type { StatsCompare } from './components/StatCards';
import { useQueue } from '@/state/QueueContext';
import { useShop } from '@/state/ShopContext';
import { AlertsCard } from './components/AlertsCard';
import { DailySummaryCard } from './components/DailySummaryCard';
import { OperatingVerdict } from './components/OperatingVerdict';
import { RatingsCard } from './components/RatingsCard';
import { SectionOverview } from './components/SectionOverview';
import { StatCards } from './components/StatCards';
import { HourlyDemandCard } from '../history/components/HourlyDemandCard';

export function DashboardPage() {
  const { tickets, team, stats, loading, error, refreshVersion } = useQueue();
  const { business } = useShop();
  const [estimate, setEstimate] = useState<DemandEstimate[] | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [compare, setCompare] = useState<StatsCompare | null>(null);
  const [ratings, setRatings] = useState<RatingByBarber[] | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([fetchDemandEstimate(), fetchDailySummary(), fetchYesterdayCompare(), fetchRatings()])
      .then(([nextEstimate, nextSummary, nextCompare, nextRatings]) => {
        if (!active) return;
        setEstimate(nextEstimate);
        setSummary(nextSummary);
        setCompare(nextCompare);
        setRatings(nextRatings);
        setMetricsError(null);
      })
      .catch((fetchError: unknown) => {
        if (!active) return;
        setMetricsError(fetchError instanceof Error ? fetchError.message : 'No pudimos actualizar las métricas.');
      });

    return () => {
      active = false;
    };
  }, [refreshVersion]);

  const alerts = useMemo(() => computeAlerts(tickets, team), [tickets, team]);

  return (
    <>
      <PageHeader title={business?.name ?? 'Turnify'} subtitle="Panel operativo" />

      {loading ? <p className="muted" role="status">Actualizando la operación…</p> : null}
      {error || metricsError ? <p className="auth__error" role="alert">{error ?? metricsError}</p> : null}

      <section aria-label="Estado de hoy">
        <OperatingVerdict
          waiting={stats.waiting}
          completed={stats.completed}
          absent={stats.absent}
          alerts={alerts}
        />

        <StatCards stats={stats} compare={compare} />

        <AlertsCard alerts={alerts} />
      </section>

      <section aria-label="Tendencias">
        <TwoColumnGrid>
          <HourlyDemandCard tickets={tickets} estimate={estimate} />
          <DailySummaryCard summary={summary} />
        </TwoColumnGrid>

        <TwoColumnGrid>
          <RatingsCard ratings={ratings} />
        </TwoColumnGrid>
      </section>

      <section aria-label="Secciones del panel">
        <SectionOverview
          availableCount={team.filter((m) => m.availability === 'disponible').length}
          teamSize={team.length}
        />
      </section>
    </>
  );
}
