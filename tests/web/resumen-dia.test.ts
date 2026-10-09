import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('daily summary wiring', () => {
  it('renders the day summary from live data instead of fixed numbers', () => {
    const card = read('apps', 'web', 'src', 'features', 'dashboard', 'components', 'DailySummaryCard.tsx');

    expect(card).toContain('summary');
    expect(card).not.toContain('attended: 47');
    expect(card).not.toContain('avgServiceTime: 28');
    expect(card).not.toContain('satisfaction: 4.8');
  });

  it('serves the summary from the tickets of the day and the dashboard consumes it', () => {
    const live = read('apps', 'web', 'src', 'data', 'live.ts');
    const dashboard = read('apps', 'web', 'src', 'features', 'dashboard', 'DashboardPage.tsx');

    expect(live).toContain('fetchDailySummary');
    expect(live).toContain('America/Lima');
    expect(dashboard).toContain('summary={summary}');
  });
});
