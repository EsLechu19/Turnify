import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('professional history and reports', () => {
  it('filters by date range with an honest subtitle', () => {
    const page = read('apps', 'web', 'src', 'features', 'history', 'HistoryPage.tsx');

    expect(page).toContain('rangeCutoff');
    expect(page).toContain('RANGE_OPTIONS');
    expect(page).toContain('RANGE_LABELS[rangeFilter]');
    expect(page).not.toContain('turnos en el día');
  });

  it('shows ratings per ticket and performance per barber', () => {
    const page = read('apps', 'web', 'src', 'features', 'history', 'HistoryPage.tsx');
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(page).toContain('perBarber');
    expect(page).toContain('ratingCell');
    expect(live).toContain('puntuacion');
  });
});
