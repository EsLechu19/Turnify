import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('hourly demand chart ownership', () => {
  it('keeps the hourly chart in Historial instead of duplicating it on Inicio', () => {
    const dashboard = read('apps', 'web', 'src', 'features', 'dashboard', 'DashboardPage.tsx');
    const history = read('apps', 'web', 'src', 'features', 'history', 'HistoryPage.tsx');

    expect(dashboard).not.toContain('<HourlyDemandCard');
    expect(dashboard).not.toContain('estimate={estimate}');
    expect(history).toContain('Demanda y afluencia por hora');
  });

  it('keeps the estimate baseline available from the data layer', () => {
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(live).toContain("rpc('demanda_estimada'");
  });
});
