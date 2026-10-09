import { Card, CardHead } from '@/components/common';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DemandEstimate, QueueTicket } from '@/data/types';

export function HourlyDemandCard({
  tickets,
  estimate,
}: {
  tickets: QueueTicket[];
  estimate?: DemandEstimate[] | null;
}) {
  const actualByHour: Record<string, number> = {};

  tickets.forEach(t => {
    if (t.arrivesAt) {
      // Handle both ISO date strings and time-only strings
      let hour: string | null = null;
      if (t.arrivesAt.includes('T')) {
        // ISO format: "2026-10-05T18:20:00"
        hour = t.arrivesAt.split('T')[1]?.substring(0, 2);
      } else {
        // Time only: "18:20"
        hour = t.arrivesAt.substring(0, 2);
      }
      if (hour) {
        const h = `${parseInt(hour)}:00`;
        actualByHour[h] = (actualByHour[h] || 0) + 1;
      }
    }
  });

  const baseline = estimate && estimate.length > 0 ? estimate : null;
  const rows = baseline
    ? baseline.map((entry) => ({ hour: entry.hour, estimated: entry.estimated, actual: actualByHour[entry.hour] ?? 0 }))
    : Object.keys(actualByHour)
      .sort()
      .map((hour) => ({ hour, estimated: 0, actual: actualByHour[hour] }));

  return (
    <Card>
      <CardHead
        detail={baseline ? 'Comparativa estimado vs real del día' : 'Real del día (sin base histórica aún)'}
        title="Demanda por hora: Estimado vs Real"
      />
      <div className="hdc__container">
        <div className="hdc__chart-wrapper">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={rows} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="estColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="actColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                type="category"
                dataKey="hour"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                orientation="left"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 'dataMax + 5']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                // @ts-expect-error
                formatter={(value: any, name?: string) => [Number(value) || 0, name === 'Estimado' ? 'Estimado' : 'Real']}
                labelFormatter={(label: any) => String(label)}
              />
              {baseline ? (
                <Area
                  type="monotone"
                  dataKey="estimated"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#estColor)"
                  strokeDasharray="6 4"
                  name="Estimado"
                />
              ) : null}
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#16a34a"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#actColor)"
                name="Real"
              >
                <linearGradient id="actColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}