import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

const dashboardPath = ['apps', 'web', 'src', 'features', 'dashboard', 'DashboardPage.tsx'];
const verdictPath = ['apps', 'web', 'src', 'features', 'dashboard', 'components', 'OperatingVerdict.tsx'];
const overviewPath = ['apps', 'web', 'src', 'features', 'dashboard', 'components', 'SectionOverview.tsx'];

describe('dashboard administrator scanability', () => {
  it('leads with a Tier 1 operating verdict before any KPI, trend, or overview block', () => {
    const dashboard = read(...dashboardPath);

    expect(dashboard).toContain('OperatingVerdict');

    const verdictAt = dashboard.indexOf('<OperatingVerdict');
    expect(verdictAt).toBeGreaterThan(-1);

    for (const later of ['<StatCards', '<AlertsCard', '<HourlyDemandCard', '<RatingsCard']) {
      const at = dashboard.indexOf(later);
      expect(at).toBeGreaterThan(verdictAt);
    }
  });

  it('orders tiers as verdict first, trends center, section overview last', () => {
    const dashboard = read(...dashboardPath);

    const verdictAt = dashboard.indexOf('<OperatingVerdict');
    const trendsAt = dashboard.indexOf('aria-label="Tendencias"');
    const overviewAt = dashboard.indexOf('aria-label="Secciones del panel"');

    expect(trendsAt).toBeGreaterThan(verdictAt);
    expect(overviewAt).toBeGreaterThan(trendsAt);
    expect(dashboard).not.toContain('aria-label="Detalle operativo"');
  });

  it('has no expandable Tier 3 detail and duplicates no queue or team detail', () => {
    const dashboard = read(...dashboardPath);

    expect(dashboard).not.toContain('<details');
    expect(dashboard).not.toContain('<summary');
    expect(dashboard).not.toContain('<ActiveQueueCard');
    expect(dashboard).not.toContain('<BarberStationsCard');
  });

  it('orients to every panel section with links instead of a dead queue route', () => {
    const dashboard = read(...dashboardPath);
    const overview = read(...overviewPath);

    expect(dashboard).toContain('<SectionOverview');
    expect(dashboard).not.toContain('/cola');

    for (const section of ['/equipo', '/servicios', '/historial', '/configuracion']) {
      expect(overview).toContain(section);
    }

    expect(overview).not.toContain('/cola');
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
