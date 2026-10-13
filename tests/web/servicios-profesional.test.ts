import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { suggestDuration } from '../../apps/web/src/data/compute';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('professional services section', () => {
  it('drops decorative catalog averages and warns about the ETA impact', () => {
    const page = read('apps', 'web', 'src', 'features', 'services', 'ServicesPage.tsx');

    expect(page).not.toContain('Ticket medio');
    expect(page).not.toContain('avgTicket');
    expect(page).toContain('mueve las esperas');
  });

  it('shows measured times and satisfaction from real tickets', () => {
    const page = read('apps', 'web', 'src', 'features', 'services', 'ServicesPage.tsx');
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(page).toContain('fetchServicePerformance');
    expect(page).toContain('Medido');
    expect(page).toContain('Sugerido');
    expect(page).toContain('votos');
    expect(live).toContain('fetchServicePerformance');
    expect(live).toContain('puntuacion');
  });

  it('suggests from the recent window without outliers', () => {
    expect(suggestDuration([])).toEqual({ suggested: null, measured: 0 });
    expect(suggestDuration([30, 32, 28, 31, 29])).toEqual({ suggested: 30, measured: 5 });
    expect(suggestDuration([30, 30, 30, 180])).toEqual({ suggested: 30, measured: 4 });
  });
});
