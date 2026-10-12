import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('daily summary ownership', () => {
  it('keeps the day summary in Historial instead of duplicating it on Inicio', () => {
    const dashboard = read('apps', 'web', 'src', 'features', 'dashboard', 'DashboardPage.tsx');
    const history = read('apps', 'web', 'src', 'features', 'history', 'HistoryPage.tsx');

    expect(dashboard).not.toContain('<DailySummaryCard');
    expect(dashboard).not.toContain('summary={summary}');
    expect(history).toContain('Turnos completados');
  });

  it('serves the summary from the tickets of the day', () => {
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(live).toContain('fetchDailySummary');
    expect(live).toContain('America/Lima');
  });
});
