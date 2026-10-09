import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('hourly demand card wiring', () => {
  it('compares the live day against a real baseline instead of invented numbers', () => {
    const card = read('apps', 'web', 'src', 'features', 'history', 'components', 'HourlyDemandCard.tsx');

    expect(card).toContain('estimate');
    expect(card).not.toContain('estimated: 12');
    expect(card).not.toContain('estimated: 35');
  });

  it('serves the baseline from the new RPC and the dashboard consumes it', () => {
    const live = read('apps', 'web', 'src', 'data', 'live.ts');
    const dashboard = read('apps', 'web', 'src', 'features', 'dashboard', 'DashboardPage.tsx');

    expect(live).toContain("rpc('demanda_estimada'");
    expect(dashboard).toContain('estimate={estimate}');
  });
});
