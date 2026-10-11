import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

const dashboardPath = ['apps', 'web', 'src', 'features', 'dashboard', 'DashboardPage.tsx'];
const verdictPath = ['apps', 'web', 'src', 'features', 'dashboard', 'components', 'OperatingVerdict.tsx'];

describe('dashboard administrator scanability', () => {
  it('leads with a Tier 1 operating verdict before any KPI, trend, or detail block', () => {
    const dashboard = read(...dashboardPath);

    expect(dashboard).toContain('OperatingVerdict');

    const verdictAt = dashboard.indexOf('<OperatingVerdict');
    expect(verdictAt).toBeGreaterThan(-1);

    for (const later of ['<StatCards', '<AlertsCard', '<HourlyDemandCard', '<ActiveQueueCard', '<RatingsCard']) {
      const at = dashboard.indexOf(later);
      expect(at).toBeGreaterThan(verdictAt);
    }
  });

  it('orders tiers as verdict first, trends center, operational detail last', () => {
    const dashboard = read(...dashboardPath);

    const verdictAt = dashboard.indexOf('<OperatingVerdict');
    const trendsAt = dashboard.indexOf('aria-label="Tendencias"');
    const detailAt = dashboard.indexOf('aria-label="Detalle operativo"');

    expect(trendsAt).toBeGreaterThan(verdictAt);
    expect(detailAt).toBeGreaterThan(trendsAt);

    const queueAt = dashboard.indexOf('<ActiveQueueCard');
    const stationsAt = dashboard.indexOf('<BarberStationsCard');
    expect(queueAt).toBeGreaterThan(detailAt);
    expect(stationsAt).toBeGreaterThan(detailAt);
  });

  it('keeps Tier 3 operational detail behind progressive disclosure', () => {
    const dashboard = read(...dashboardPath);

    expect(dashboard).toContain('<details');
    expect(dashboard).toContain('<summary');

    const detailsAt = dashboard.indexOf('<details');
    expect(dashboard.indexOf('<ActiveQueueCard')).toBeGreaterThan(detailsAt);
    expect(dashboard.indexOf('<BarberStationsCard')).toBeGreaterThan(detailsAt);
  });

  it('derives the Tier 1 verdict from already-live numbers and reserves color for state', () => {
    const verdict = read(...verdictPath);

    expect(verdict).toContain('Estado de hoy');
    expect(verdict).toContain('role="status"');
    expect(verdict).not.toContain('#6366f1');
    expect(verdict).not.toContain('#4f46e5');
  });

  it('preserves the live refresh contract and truthful Spanish states', () => {
    const dashboard = read(...dashboardPath);

    expect(dashboard).toContain('refreshVersion');
    expect(dashboard).toContain('}, [refreshVersion]);');
    expect(dashboard).toContain('Actualizando la operación…');
    expect(dashboard).toContain('role="alert"');
    expect(dashboard).not.toContain('fixture');
    expect(dashboard).not.toContain('mock');
  });
});
