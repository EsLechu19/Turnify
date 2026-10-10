import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('dashboard operational refresh', () => {
  it('polls the shared queue once and refreshes it when the window regains focus', () => {
    const queue = read('apps', 'web', 'src', 'state', 'QueueContext.tsx');

    expect(queue).toContain('const OPERATIONAL_REFRESH_MS = 15_000;');
    expect(queue).toContain('window.addEventListener(\'focus\', refresh);');
    expect(queue).toContain('const intervalId = window.setInterval(refresh, OPERATIONAL_REFRESH_MS);');
    expect(queue).toContain('window.removeEventListener(\'focus\', refresh);');
    expect(queue).toContain('window.clearInterval(intervalId);');
  });

  it('keeps refresh errors distinct from an empty operational queue and rejects stale responses', () => {
    const queue = read('apps', 'web', 'src', 'state', 'QueueContext.tsx');

    expect(queue).toContain('error: string | null;');
    expect(queue).toContain("type: 'failed'; error: string");
    expect(queue).toContain('requestId !== requestIdRef.current');
    expect(queue).toContain('refreshVersion');
  });

  it('refreshes dashboard aggregates whenever the shared operational snapshot changes', () => {
    const dashboard = read('apps', 'web', 'src', 'features', 'dashboard', 'DashboardPage.tsx');

    expect(dashboard).toContain('refreshVersion');
    expect(dashboard).toContain('}, [refreshVersion]);');
  });
});
