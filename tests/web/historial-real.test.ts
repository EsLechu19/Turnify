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

  it('includes active tickets in the all-status live history and labels them', () => {
    const live = read('apps', 'web', 'src', 'data', 'live.ts');
    const types = read('apps', 'web', 'src', 'data', 'types.ts');
    const labels = read('apps', 'web', 'src', 'data', 'labels.ts');

    expect(live).not.toContain(".in('estado', ['finalizado', 'ausente', 'cancelado'])");
    expect(live).toContain("case 'en_atencion':");
    expect(types).toContain("| 'en_atencion'");
    expect(labels).toContain("en_atencion: 'En atención'");
  });

  it('renders a fetch error instead of an empty-history state', () => {
    const page = read('apps', 'web', 'src', 'features', 'history', 'HistoryPage.tsx');

    expect(page).toContain('const [historyError, setHistoryError] = useState<string | null>(null);');
    expect(page).toContain('title="No pudimos cargar el historial"');
    expect(page).toContain('detail={historyError}');
  });
});
