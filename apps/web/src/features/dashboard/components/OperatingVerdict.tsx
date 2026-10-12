import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import type { PanelAlert } from '@/data/compute';

export type OperatingState = 'normal' | 'atencion' | 'critica';

const stateColor: Record<OperatingState, string> = {
  normal: 'var(--success, #22c55e)',
  atencion: 'var(--gold, #f59e0b)',
  critica: 'var(--danger, #ef4444)',
};

const stateCopy: Record<OperatingState, string> = {
  normal: 'operación normal',
  atencion: 'requiere atención',
  critica: 'acción inmediata',
};

/** Pure Tier 1 verdict: today's operating state from already-live numbers. */
export function resolveOperatingState(alertCount: number, hasDanger: boolean): OperatingState {
  if (hasDanger) return 'critica';
  if (alertCount > 0) return 'atencion';
  return 'normal';
}

export function OperatingVerdict({
  waiting,
  completed,
  absent,
  alerts,
  nextCode,
}: {
  waiting: number;
  completed: number;
  absent: number;
  alerts: PanelAlert[];
  nextCode: string | null;
}) {
  const navigate = useNavigate();
  const state = resolveOperatingState(alerts.length, alerts.some((alert) => alert.tone === 'danger'));

  return (
    <div role="status" style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 12, margin: '4px 0 16px' }}>
      <span
        aria-hidden
        style={{ background: stateColor[state], borderRadius: '50%', flex: 'none', height: 14, width: 14 }}
      />
      <p style={{ font: 'var(--text-h2)', margin: 0 }}>
        Estado de hoy: {stateCopy[state]}
        {state === 'normal' ? null : ` (${alerts.length})`}
      </p>
      <p className="muted" style={{ font: 'var(--text-body)', margin: 0 }}>
        {waiting} en cola · {completed} atendidos · {absent} ausentes
        {nextCode ? ` · siguiente: ${nextCode}` : ''}
      </p>
      <span style={{ display: 'inline-flex', gap: 8, marginLeft: 'auto' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/equipo')}>
          Ver equipo
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate('/historial')}>
          Ver historial
        </Button>
      </span>
    </div>
  );
}
