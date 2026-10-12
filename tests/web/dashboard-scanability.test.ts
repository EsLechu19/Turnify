import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

const dashboardPath = ['apps', 'web', 'src', 'features', 'dashboard', 'DashboardPage.tsx'];
const verdictPath = ['apps', 'web', 'src', 'features', 'dashboard', 'components', 'OperatingVerdict.tsx'];

describe('dashboard administrator scanability', () => {
  it('leads with a Tier 1 operating verdict before any live block', () => {
    const dashboard = read(...dashboardPath);

    expect(dashboard).toContain('OperatingVerdict');

    const verdictAt = dashboard.indexOf('<OperatingVerdict');
    expect(verdictAt).toBeGreaterThan(-1);

    for (const later of ['<StatCards', '<AlertsCard', '<LiveQueueCard', '<RevenueCard']) {
      const at = dashboard.indexOf(later);
      expect(at).toBeGreaterThan(verdictAt);
    }
  });

  it('keeps Inicio to the live day: no trends, no sitemap, no dead queue route', () => {
    const dashboard = read(...dashboardPath);

    expect(dashboard).toContain('aria-label="Estado de hoy"');
    expect(dashboard).not.toContain('aria-label="Tendencias"');
    expect(dashboard).not.toContain('aria-label="Secciones del panel"');
    expect(dashboard).not.toContain('aria-label="Detalle operativo"');
    expect(dashboard).not.toContain('<SectionOverview');
    expect(dashboard).not.toContain('<HourlyDemandCard');
    expect(dashboard).not.toContain('<DailySummaryCard');
    expect(dashboard).not.toContain('<RatingsCard');
    expect(dashboard).not.toContain('/cola');
  });

  it('has no expandable Tier 3 detail and duplicates no queue or team detail', () => {
    const dashboard = read(...dashboardPath);

    expect(dashboard).not.toContain('<details');
    expect(dashboard).not.toContain('<summary');
    expect(dashboard).not.toContain('<ActiveQueueCard');
    expect(dashboard).not.toContain('<BarberStationsCard');
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
