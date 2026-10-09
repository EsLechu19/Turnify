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
import type { QueueTicket } from '@/data/types';

export function HourlyDemandCard({ tickets }: { tickets: QueueTicket[] }) {
  const estimated = [
    { hour: '9:00', estimated: 12 },
    { hour: '10:00', estimated: 18 },
    { hour: '11:00', estimated: 25 },
    { hour: '12:00', estimated: 30 },
    { hour: '13:00', estimated: 22 },
    { hour: '14:00', estimated: 15 },
    { hour: '15:00', estimated: 18 },
    { hour: '16:00', estimated: 28 },
    { hour: '17:00', estimated: 35 },
    { hour: '18:00', estimated: 35 },
    { hour: '19:00', estimated: 32 },
    { hour: '20:00', estimated: 20 },
  ];

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

  return (
    <Card>
      <CardHead detail="Comparativa estimado vs real del día" title="Demanda por hora: Estimado vs Real" />
      <div className="hdc__container">
        <div className="hdc__chart-wrapper">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={estimated.map((e) => ({
              hour: e.hour,
              estimated: e.estimated,
              actual: actualByHour[e.hour] || 0,
            }))} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
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
              <Area
                type="monotone"
                dataKey="estimated"
                stroke="#4f46e5"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#estColor)"
                strokeDasharray="6 4"
                name="Estimado"
              >
                <linearGradient id="estColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </Area>
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