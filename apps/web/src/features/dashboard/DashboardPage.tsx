import { useEffect, useMemo, useState } from 'react';

import { Button, PageHeader } from '@/components/common';
import { computeAlerts } from '@/data/compute';
import { fetchShopSettings, fetchYesterdayCompare, saveShopSettings } from '@/data/live';
import type { StatsCompare } from './components/StatCards';
import { useQueue } from '@/state/QueueContext';
import { useShop } from '@/state/ShopContext';
import { AlertsCard } from './components/AlertsCard';
import { DashboardOverview } from './components/DashboardOverview';
import { LiveQueueCard } from './components/LiveQueueCard';
import { OperatingVerdict } from './components/OperatingVerdict';
import { RevenueCard } from './components/RevenueCard';
import { StatCards } from './components/StatCards';

const todayLabel = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
const REPORT_REFRESH_MS = 60_000;

/**
 * Inicio: el centro de control del administrador. La operación en vivo tiene
 * prioridad, mientras el análisis administrativo permanece en la misma vista.
 */
export function DashboardPage() {
  const { tickets, team, stats, loading, error, refresh, next } = useQueue();
  const { open, error: shopError, refreshShop } = useShop();
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [compare, setCompare] = useState<StatsCompare | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const refreshCompare = () => {
      fetchYesterdayCompare()
        .then((nextCompare) => {
          if (!active) return;
          setCompare(nextCompare);
          setMetricsError(null);
        })
        .catch((fetchError: unknown) => {
          if (!active) return;
          setMetricsError(fetchError instanceof Error ? fetchError.message : 'No pudimos actualizar las métricas.');
        });
    };

    refreshCompare();
    const intervalId = window.setInterval(refreshCompare, REPORT_REFRESH_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

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
    <div className="dashboard-page">
      <PageHeader
        title="Inicio"
        subtitle={`Panel operativo · ${todayLabel}`}
        actions={
          <Button variant={open ? 'secondary' : 'primary'} onClick={() => void toggleOpen()} disabled={togglingOpen || open == null}>
            {togglingOpen ? 'Cambiando…' : open ? 'Cerrar local' : 'Abrir local'}
          </Button>
        }
      />
      {toggleError ? <p className="dashboard-page__notice dashboard-page__notice--error" role="alert">{toggleError}</p> : null}
      {shopError ? (
        <div className="dashboard-page__notice dashboard-page__notice--error">
          <p className="auth__error" role="alert">{shopError}</p>
          <div className="dashboard-page__notice-actions">
            <Button variant="secondary" size="sm" onClick={refreshShop}>Reintentar</Button>
          </div>
        </div>
      ) : null}

      {loading ? <p className="dashboard-page__notice dashboard-page__notice--loading muted" role="status">Actualizando la operación…</p> : null}
      {error || metricsError ? (
        <div className="dashboard-page__notice dashboard-page__notice--error">
          <p className="auth__error" role="alert">{error ?? metricsError}</p>
          <div className="dashboard-page__notice-actions">
            <Button variant="secondary" size="sm" onClick={refresh}>Reintentar</Button>
          </div>
        </div>
      ) : null}

      <section aria-label="Estado de hoy" className="dashboard">
        <OperatingVerdict waiting={stats.waiting} alerts={alerts} nextCode={next?.code ?? null} />

        <div className="dashboard__attention">
          <AlertsCard alerts={alerts} />
          <StatCards stats={stats} compare={compare} />
        </div>

        <div className="dashboard__split">
          <LiveQueueCard />

          <div className="dashboard__rail">
            <RevenueCard />
          </div>
        </div>
      </section>
      <DashboardOverview />
    </div>
  );
}
