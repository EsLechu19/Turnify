import type { PanelAlert } from '@/data/compute';

export type OperatingState = 'normal' | 'atencion' | 'critica';

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
  alerts,
  nextCode,
}: {
  waiting: number;
  alerts: PanelAlert[];
  nextCode: string | null;
}) {
  const state = resolveOperatingState(alerts.length, alerts.some((alert) => alert.tone === 'danger'));

  return (
    <div className="operating-verdict" role="status">
      <span className={`operating-verdict__dot operating-verdict__dot--${state}`} aria-hidden />
      <p className="operating-verdict__state">
        Estado de hoy: {stateCopy[state]}
        {state === 'normal' ? null : ` (${alerts.length})`}
      </p>
      <span className="operating-verdict__meta">{waiting} en cola</span>
      {nextCode ? <span className="operating-verdict__meta">Siguiente: {nextCode}</span> : null}
    </div>
  );
}
