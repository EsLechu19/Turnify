import { useEffect, useMemo, useState } from 'react';

import { Button, PageHeader, TwoColumnGrid } from '@/components/common';
import { computeAlerts } from '@/data/compute';
import { fetchDailySummary, fetchDemandEstimate, fetchRatings, fetchShopSettings, fetchYesterdayCompare, saveShopSettings, type DailySummary, type RatingByBarber } from '@/data/live';
import type { DemandEstimate } from '@/data/types';
import type { StatsCompare } from './components/StatCards';
import { useQueue } from '@/state/QueueContext';
import { useShop } from '@/state/ShopContext';
import { AlertsCard } from './components/AlertsCard';
import { DailySummaryCard } from './components/DailySummaryCard';
import { LiveQueueCard } from './components/LiveQueueCard';
import { OperatingVerdict } from './components/OperatingVerdict';
import { RatingsCard } from './components/RatingsCard';
import { RevenueCard } from './components/RevenueCard';
import { SectionOverview } from './components/SectionOverview';
import { StatCards } from './components/StatCards';
import { HourlyDemandCard } from '../history/components/HourlyDemandCard';

const todayLabel = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

export function DashboardPage() {
  const { tickets, team, stats, loading, error, refresh, refreshVersion, next } = useQueue();
  const { business, open, refreshShop } = useShop();
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
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

  async function toggleOpen() {
    if (togglingOpen) return;
    setTogglingOpen(true);
    setToggleError(null);
    try {
      const settings = await fetchShopSettings();
      await saveShopSettings({ ...settings, open: !settings.open });
      refreshShop();
      refresh();
    } catch {
      setToggleError('No pudimos cambiar el estado del local.');
    } finally {
      setTogglingOpen(false);
    }
  }

  return (
    <>
      <PageHeader
        title={business?.name ?? 'Turnify'}
        subtitle={`Panel operativo · ${todayLabel}`}
        statusBadge={open == null ? null : open ? 'Local abierto' : 'Local cerrado'}
        actions={
          <Button variant={open ? 'secondary' : 'primary'} onClick={() => void toggleOpen()} disabled={togglingOpen || open == null}>
            {togglingOpen ? 'Cambiando…' : open ? 'Cerrar local' : 'Abrir local'}
          </Button>
        }
      />
      {toggleError ? <p className="auth__error" role="alert">{toggleError}</p> : null}

      {loading ? <p className="muted" role="status">Actualizando la operación…</p> : null}
      {error || metricsError ? (
        <div style={{ alignItems: 'center', display: 'flex', gap: 12 }}>
          <p className="auth__error" role="alert" style={{ margin: 0 }}>{error ?? metricsError}</p>
          <Button variant="secondary" size="sm" onClick={refresh}>
            Reintentar
          </Button>
        </div>
      ) : null}

      <section aria-label="Estado de hoy">
        <OperatingVerdict
          waiting={stats.waiting}
          completed={stats.completed}
          absent={stats.absent}
          alerts={alerts}
          nextCode={next?.code ?? null}
        />

        <StatCards stats={stats} compare={compare} />

        <AlertsCard alerts={alerts} />

        <LiveQueueCard />

        <RevenueCard />
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
