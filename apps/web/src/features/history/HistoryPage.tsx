import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge, Button, Card, CardHead, EmptyState, PageHeader, StatsRow } from '@/components/common';
import { averageOf, historyStatusLabels, historyStatusTone } from '@/data/labels';
import { historyRepository } from '@/data/repositories';
import type { HistoryRecord, HistoryStatus } from '@/data/types';
import { limaToday } from '@/utils/format';

const CHART_COLORS = ['#1264e8', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444'];

const selectStyle = {
  background: 'var(--surface)',
  border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--ink)',
  font: 'var(--text-body)',
  minHeight: 40,
  padding: '0 12px',
} as const;

type StatusFilter = 'todos' | HistoryStatus;
type RangeFilter = 'hoy' | '7d' | '30d' | 'todo';

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Completado', value: 'completado' },
  { label: 'Ausencia', value: 'ausencia' },
  { label: 'Cancelado', value: 'cancelado' },
];

const RANGE_OPTIONS: { label: string; value: RangeFilter }[] = [
  { label: 'Hoy', value: 'hoy' },
  { label: '7 días', value: '7d' },
  { label: '30 días', value: '30d' },
  { label: 'Todo', value: 'todo' },
];

const RANGE_LABELS: Record<RangeFilter, string> = {
  hoy: 'hoy',
  '7d': 'últimos 7 días',
  '30d': 'últimos 30 días',
  todo: 'todo el historial',
};

function rangeCutoff(range: RangeFilter): string | null {
  if (range === 'todo') return null;
  if (range === 'hoy') return limaToday();
  const days = range === '7d' ? 6 : 29;
  return limaToday(new Date(Date.now() - days * 86400_000));
}

const PAGE_SIZE = 10;

const PRINT_CHART_WIDTH = 290;

const PRINT_CHART_COLUMNS = 'repeat(2, minmax(0, 1fr))';

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function ratingCell(rating: number | null | undefined): string {
  return typeof rating === 'number' ? `★ ${rating}` : 'Sin voto';
}

function downloadCsv(rows: HistoryRecord[]) {
  const header = ['Fecha', 'Código', 'Ingreso', 'Cliente', 'Servicio', 'Barbero', 'Espera (min)', 'Duración (min)', 'Satisfacción', 'Estado'];
  const lines = [
    header.map(csvCell).join(';'),
    ...rows.map((row) =>
      [
        row.date,
        row.code,
        row.arrival,
        row.customer,
        row.service,
        row.barber ?? 'Sin asignar',
        row.waitMinutes,
        row.durationMinutes,
        ratingCell(row.rating),
        historyStatusLabels[row.status],
      ]
        .map(csvCell)
        .join(';'),
    ),
  ];

  const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'reporte-historial.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function HistoryPage() {
  const [barberFilter, setBarberFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('todo');
  const [page, setPage] = useState(1);
  const [printAll, setPrintAll] = useState(false);
  const [rows, setRows] = useState<HistoryRecord[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [barberFilter, serviceFilter, statusFilter, rangeFilter]);

  useEffect(() => {
    let active = true;

    historyRepository
      .list()
      .then((records) => {
        if (active) {
          setRows(records);
          setLoadingRows(false);
        }
      })
      .catch(() => {
        if (active) setLoadingRows(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function enterPrint() {
      flushSync(() => setPrintAll(true));
    }

    function leavePrint() {
      setPrintAll(false);
    }

    window.addEventListener('beforeprint', enterPrint);
    window.addEventListener('afterprint', leavePrint);

    return () => {
      window.removeEventListener('beforeprint', enterPrint);
      window.removeEventListener('afterprint', leavePrint);
    };
  }, []);

  const barbers = useMemo(
    () => [...new Set(rows.map((row) => row.barber).filter((name): name is string => Boolean(name)))].sort(),
    [rows],
  );

  const serviceNames = useMemo(() => [...new Set(rows.map((row) => row.service))].sort(), [rows]);

  const cutoff = useMemo(() => rangeCutoff(rangeFilter), [rangeFilter]);
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const matchesBarber =
          barberFilter === 'all' || (barberFilter === 'none' ? row.barber === null : row.barber === barberFilter);
        const matchesService = serviceFilter === 'all' || row.service === serviceFilter;
        const matchesStatus = statusFilter === 'todos' || row.status === statusFilter;
        const matchesRange = cutoff === null || row.date >= cutoff;

        return matchesBarber && matchesService && matchesStatus && matchesRange;
      }),
    [barberFilter, serviceFilter, statusFilter, cutoff],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  function handlePrint() {
    window.print();
  }

  const stats = useMemo(() => {
    const completed = filtered.filter((row) => row.status === 'completado');
    const absences = filtered.filter((row) => row.status === 'ausencia').length;
    const cancellations = filtered.filter((row) => row.status === 'cancelado').length;
    const waits = filtered.map((row) => row.waitMinutes);

    return {
      absences,
      averageDuration: averageOf(completed.map((row) => row.durationMinutes)),
      averageWait: averageOf(waits),
      cancellations,
      completed: completed.length,
      longestWait: waits.length === 0 ? 0 : Math.max(...waits),
      total: filtered.length,
    };
  }, [filtered]);

  const hourlyDemand = useMemo(() => {
    const buckets = new Map<string, number>();

    for (const row of filtered) {
      const hour = `${row.arrival.slice(0, 2)}:00`;
      buckets.set(hour, (buckets.get(hour) ?? 0) + 1);
    }

    return [...buckets.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([hour, count]) => ({ hour, count }));
  }, [filtered]);

  const serviceMix = useMemo(() => {
    const buckets = new Map<string, number>();

    for (const row of filtered) {
      buckets.set(row.service, (buckets.get(row.service) ?? 0) + 1);
    }

    return [...buckets.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const completionRate = stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100);

  const perBarber = useMemo(() => {
    const byBarber = new Map<string, HistoryRecord[]>();

    for (const row of filtered) {
      const key = row.barber ?? 'Sin asignar';
      const list = byBarber.get(key) ?? [];
      list.push(row);
      byBarber.set(key, list);
    }

    return [...byBarber.entries()]
      .map(([name, list]) => {
        const done = list.filter((row) => row.status === 'completado');
        const ratings = list.map((row) => row.rating).filter((value): value is number => typeof value === 'number');

        return {
          name,
          turnos: list.length,
          duracion: averageOf(done.map((row) => row.durationMinutes)),
          satisfaccion:
            ratings.length === 0 ? null : Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10,
        };
      })
      .sort((left, right) => right.turnos - left.turnos);
  }, [filtered]);

  return (
    <>
      <PageHeader
        title="Historial y reportes"
        subtitle={`${stats.total} turnos · ${RANGE_LABELS[rangeFilter]} · asistencia, tiempos y servicios atendidos.`}
        actions={
          <>
            <Button icon="download" onClick={() => downloadCsv(filtered)} variant="secondary">
              Descargar CSV
            </Button>
            <Button icon="download" onClick={handlePrint}>
              Descargar PDF
            </Button>
          </>
        }
      />

      <div className="filters">
        <select
          aria-label="Filtrar por barbero"
          onChange={(event) => setBarberFilter(event.target.value)}
          style={selectStyle}
          value={barberFilter}
        >
          <option value="all">Todos los barberos</option>
          <option value="none">Sin asignar</option>
          {barbers.map((barber) => (
            <option key={barber} value={barber}>
              {barber}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por servicio"
          onChange={(event) => setServiceFilter(event.target.value)}
          style={selectStyle}
          value={serviceFilter}
        >
          <option value="all">Todos los servicios</option>
          {serviceNames.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </select>

        <div className="segment">
          {STATUS_OPTIONS.map((option) => (
            <button
              aria-pressed={statusFilter === option.value}
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="segment">
          {RANGE_OPTIONS.map((option) => (
            <button
              aria-pressed={rangeFilter === option.value}
              key={option.value}
              onClick={() => setRangeFilter(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <span className="muted" style={{ font: 'var(--text-caption)' }}>
          {filtered.length} de {rows.length} turnos
        </span>
      </div>

      <StatsRow
        stats={[
          { label: 'Atención promedio', value: `${stats.averageDuration} min`, icon: 'clock', foot: `${stats.completed} servicios finalizados` },
          { label: 'Espera en sala', value: `${stats.averageWait} min`, icon: 'pause', foot: `${stats.longestWait} min la espera más larga` },
          { label: 'Turnos completados', value: String(stats.completed), icon: 'ticket', foot: `${completionRate}% del total filtrado` },
          { label: 'Ausencias y cancelaciones', value: String(stats.absences + stats.cancellations), icon: 'close', foot: `${stats.absences} ausencias · ${stats.cancellations} cancelados` },
        ]}
      />

      <div
        className="charts-row"
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: printAll ? PRINT_CHART_COLUMNS : 'repeat(auto-fit, minmax(340px, 1fr))',
        }}
      >
        <Card>
          <CardHead
            action={<Badge tone="brand">Por hora</Badge>}
            title="Demanda y afluencia por hora"
          />
          <div style={{ height: 260 }}>
            <ResponsiveContainer height={260} width={printAll ? PRINT_CHART_WIDTH : '100%'}>
              <BarChart data={hourlyDemand} margin={{ left: -24, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" fontSize={12} stroke="var(--ink-faint)" tickLine={false} />
                <YAxis allowDecimals={false} fontSize={12} stroke="var(--ink-faint)" tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(18, 100, 232, 0.06)' }} />
                <Bar
                  dataKey="count"
                  fill="#1264e8"
                  isAnimationActive={false}
                  maxBarSize={34}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHead
            action={<Badge tone="brand">{serviceMix.length} servicios</Badge>}
            title="Distribución de servicios"
          />
          <div style={{ height: 260 }}>
            <ResponsiveContainer height={260} width={printAll ? PRINT_CHART_WIDTH : '100%'}>
              <PieChart>
                <Pie
                  data={serviceMix}
                  dataKey="value"
                  innerRadius={58}
                  isAnimationActive={false}
                  nameKey="name"
                  outerRadius={92}
                  paddingAngle={2}
                >
                  {serviceMix.map((entry, index) => (
                    <Cell
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      key={`${entry.name}-${index}`}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            {serviceMix.map((entry, index) => (
              <div
                key={entry.name}
                style={{ alignItems: 'center', display: 'flex', fontSize: 13, gap: 8 }}
              >
                <span
                  style={{
                    background: CHART_COLORS[index % CHART_COLORS.length],
                    borderRadius: 4,
                    height: 10,
                    width: 10,
                  }}
                />
                <span style={{ color: 'var(--ink-muted)', flex: 1 }}>{entry.name}</span>
                <strong>{entry.value}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHead action={<Badge tone="brand">{perBarber.length} barberos</Badge>} title="Rendimiento por barbero" />
        {perBarber.length === 0 ? (
          <EmptyState detail="Ajusta los filtros para ver el rendimiento." title="Sin datos" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Barbero</th>
                  <th>Turnos</th>
                  <th>Duración prom.</th>
                  <th>Satisfacción</th>
                </tr>
              </thead>
              <tbody>
                {perBarber.map((entry) => (
                  <tr key={entry.name}>
                    <td>
                      <strong>{entry.name}</strong>
                    </td>
                    <td>{entry.turnos}</td>
                    <td>{entry.duracion === 0 ? '—' : `${entry.duracion} min`}</td>
                    <td>{entry.satisfaccion == null ? '—' : `★ ${entry.satisfaccion}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHead
          action={<Badge tone="brand">{filtered.length} registros</Badge>}
          title="Detalle de turnos"
        />

        {loadingRows ? (
          <EmptyState detail="Trayendo el historial del local…" title="Cargando historial" />
        ) : filtered.length === 0 ? (
          <EmptyState
            detail="Prueba con otro barbero, servicio o estado."
            title="No hay turnos con estos filtros"
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Ingreso</th>
                    <th>Cliente</th>
                    <th>Servicio</th>
                    <th>Barbero</th>
                    <th>Espera</th>
                    <th>Duración</th>
                    <th>Satisfacción</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(printAll ? filtered : visibleRows).map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.code}</strong>
                      </td>
                      <td>{row.arrival}</td>
                      <td>{row.customer}</td>
                      <td>{row.service}</td>
                      <td>{row.barber ?? 'Sin asignar'}</td>
                      <td>{row.waitMinutes} min</td>
                      <td>{row.status === 'completado' ? `${row.durationMinutes} min` : '—'}</td>
                      <td>{typeof row.rating === 'number' ? `★ ${row.rating}` : '—'}</td>
                      <td>
                        <Badge tone={historyStatusTone[row.status]}>
                          {historyStatusLabels[row.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="filters" style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <span className="muted" style={{ font: 'var(--text-caption)' }}>
                Mostrando {rangeStart}–{rangeEnd} de {filtered.length}
              </span>

              <div className="filters" style={{ gap: 8 }}>
                <Button
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                  size="sm"
                  variant="secondary"
                >
                  Anterior
                </Button>

                <Badge tone="brand">
                  Página {safePage} de {pageCount}
                </Badge>

                <Button
                  disabled={safePage >= pageCount}
                  onClick={() => setPage(safePage + 1)}
                  size="sm"
                  variant="secondary"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
