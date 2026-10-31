import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { computeServiceMix } from '@/data/compute';
import { fetchDailySummary, fetchDemandEstimate, fetchRatings, type DailySummary, type RatingByBarber } from '@/data/live';
import type { DemandEstimate } from '@/data/types';
import { useQueue } from '@/state/QueueContext';
import { Card, CardHead } from '@/components/common/layout/Card';

type AsyncState<T> = { data: T | null; error: string | null; loading: boolean };

const emptyState = <T,>(): AsyncState<T> => ({ data: null, error: null, loading: true });
const chartColors = ['var(--brand)', 'var(--gold)', 'var(--success)', 'var(--danger)', 'var(--brand-deep)'];
const REPORT_REFRESH_MS = 60_000;

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'No pudimos cargar este bloque.';
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="dashboard-overview__metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function BlockState({ loading, error, hasData, children }: { loading: boolean; error: string | null; hasData: boolean; children: React.ReactNode }) {
  if (loading && !hasData) return <p className="dashboard-overview__state" role="status">Cargando…</p>;
  return (
    <>
      {error ? <p className="dashboard-overview__state dashboard-overview__state--error" role="alert">{error}</p> : null}
      {children}
    </>
  );
}

function hourNumber(value: string): number | null {
  const hour = Number.parseInt(value.slice(0, 2), 10);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

function updatedLabel(value: Date | null): string {
  if (!value) return 'Actualizando datos…';

  return `Actualizado ${new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)}`;
}

export function DashboardOverview() {
  const { tickets, team } = useQueue();
  const [summary, setSummary] = useState<AsyncState<DailySummary>>(emptyState);
  const [demand, setDemand] = useState<AsyncState<DemandEstimate[]>>(emptyState);
  const [ratings, setRatings] = useState<AsyncState<RatingByBarber[]>>(emptyState);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;

    const refreshReports = () => {
      setSummary((current) => ({ ...current, loading: current.data === null, error: null }));
      setDemand((current) => ({ ...current, loading: current.data === null, error: null }));
      setRatings((current) => ({ ...current, loading: current.data === null, error: null }));

      void Promise.allSettled([fetchDailySummary(), fetchDemandEstimate(), fetchRatings()]).then(
        ([summaryResult, demandResult, ratingsResult]) => {
          if (!active) return;
          setSummary((current) => summaryResult.status === 'fulfilled'
            ? { data: summaryResult.value, error: null, loading: false }
            : { ...current, error: errorMessage(summaryResult.reason), loading: false });
          setDemand((current) => demandResult.status === 'fulfilled'
            ? { data: demandResult.value, error: null, loading: false }
            : { ...current, error: errorMessage(demandResult.reason), loading: false });
          setRatings((current) => ratingsResult.status === 'fulfilled'
            ? { data: ratingsResult.value, error: null, loading: false }
            : { ...current, error: errorMessage(ratingsResult.reason), loading: false });
          setUpdatedAt(new Date());
        },
      );
    };

    refreshReports();
    const intervalId = window.setInterval(refreshReports, REPORT_REFRESH_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const serviceMix = useMemo(() => computeServiceMix(tickets), [tickets]);
  const demandData = useMemo(() => {
    const actualByHour = new Map<number, number>();
    tickets.forEach((ticket) => {
      const hour = hourNumber(ticket.arrivesAt);
      if (hour !== null) actualByHour.set(hour, (actualByHour.get(hour) ?? 0) + 1);
    });

    const expectedByHour = new Map<number, number>();
    (demand.data ?? []).forEach((item) => {
      const hour = hourNumber(item.hour);
      if (hour !== null) expectedByHour.set(hour, item.estimated);
    });

    return [...new Set([...actualByHour.keys(), ...expectedByHour.keys()])]
      .sort((a, b) => a - b)
      .map((hour) => ({ hour: `${String(hour).padStart(2, '0')}:00`, actual: actualByHour.get(hour) ?? 0, expected: expectedByHour.get(hour) ?? 0 }));
  }, [demand.data, tickets]);

  const capacity = useMemo(
    () => ({
      attending: team.filter((member) => member.availability === 'atencion').length,
      available: team.filter((member) => member.availability === 'disponible').length,
      away: team.filter((member) => member.availability === 'descanso' || member.availability === 'fuera').length,
      total: team.length,
    }),
    [team],
  );

  const ratingSummary = useMemo(() => {
    const voted = (ratings.data ?? []).filter((rating) => rating.votes > 0 && rating.average !== null);
    const votes = voted.reduce((sum, rating) => sum + rating.votes, 0);
    const average = votes === 0 ? summary.data?.satisfaction ?? null : voted.reduce((sum, rating) => sum + (rating.average ?? 0) * rating.votes, 0) / votes;
    return { average, votes, leaders: voted.sort((a, b) => (b.average ?? 0) - (a.average ?? 0)).slice(0, 3) };
  }, [ratings.data, summary.data?.satisfaction]);

  return (
    <section aria-label="Resumen administrativo" className="dashboard-overview">
      <div className="dashboard-overview__heading">
        <div>
          <span className="eyebrow">Lectura administrativa</span>
          <h2>Resumen del día</h2>
        </div>
        <div className="dashboard-overview__heading-meta">
          <span>{updatedLabel(updatedAt)}</span>
          <span>Datos visibles del turno actual</span>
        </div>
      </div>

      <div className="dashboard-overview__metrics">
        <Card className="dashboard-overview__card">
          <CardHead title="Resumen diario" detail="Atención y cumplimiento" />
          <BlockState {...summary} hasData={summary.data !== null}>
            <div className="dashboard-overview__metric-grid">
              <Metric label="Atendidos" value={String(summary.data?.attended ?? 0)} />
              <Metric label="Puntualidad" value={summary.data?.punctuality == null ? 'Sin datos' : `${summary.data.punctuality}%`} />
              <Metric label="Duración promedio" value={summary.data?.avgServiceMinutes == null ? 'Sin datos' : `${summary.data.avgServiceMinutes} min`} />
              <Metric label="Último cierre" value={summary.data?.lastClose ?? 'Sin cierres'} />
            </div>
          </BlockState>
        </Card>

        <Card className="dashboard-overview__card">
          <CardHead title="Capacidad del equipo" detail="Miembros visibles ahora" />
          <div className="dashboard-overview__metric-grid">
            <Metric label="Atendiendo" value={String(capacity.attending)} />
            <Metric label="Disponibles" value={String(capacity.available)} />
            <Metric label="Descanso / fuera" value={String(capacity.away)} />
            <Metric label="Total visible" value={String(capacity.total)} />
          </div>
        </Card>

        <Card className="dashboard-overview__card">
          <CardHead title="Satisfacción" detail="Promedio y muestra de votos" />
          <BlockState {...ratings} hasData={ratings.data !== null}>
            {ratingSummary.votes === 0 ? (
              <p className="dashboard-overview__empty">Sin votos suficientes para mostrar un promedio confiable.</p>
            ) : (
              <>
                <div className="dashboard-overview__rating-summary">
                  <strong>{ratingSummary.average?.toFixed(1)}<span>/5</span></strong>
                  <span>{ratingSummary.votes} votos</span>
                </div>
                <ul className="dashboard-overview__list">
                  {ratingSummary.leaders.map((rating) => <li key={rating.barberId}><span>{rating.name}</span><strong>{rating.average?.toFixed(1)} · {rating.votes} votos</strong></li>)}
                </ul>
              </>
            )}
          </BlockState>
        </Card>
      </div>

      <div className="dashboard-overview__charts">
        <Card className="dashboard-overview__card dashboard-overview__chart-card">
          <CardHead title="Demanda horaria" detail="Real vs baseline estimado" />
          <BlockState {...demand} hasData={demand.data !== null}>
            {demandData.length === 0 ? <p className="dashboard-overview__empty">Todavía no hay horas observables para comparar.</p> : (
              <div className="dashboard-overview__chart">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={demandData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="actual" name="Actual" fill="var(--brand)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expected" name="Estimado" fill="var(--gold)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </BlockState>
        </Card>

        <Card className="dashboard-overview__card dashboard-overview__chart-card">
          <CardHead title="Mezcla de servicios" detail="Conjunto de tickets visible" />
          {serviceMix.length === 0 ? <p className="dashboard-overview__empty">No hay tickets visibles para mezclar.</p> : (
            <div className="dashboard-overview__service-chart">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={serviceMix} dataKey="count" nameKey="service" cx="50%" cy="50%" innerRadius={54} outerRadius={88} paddingAngle={2}>
                    {serviceMix.map((item, index) => <Cell key={item.service} fill={chartColors[index % chartColors.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
