import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const WORKER_SCREENS = [
  '../../apps/mobile/src/app/(app)/worker.tsx',
  '../../apps/mobile/src/app/(app)/worker-queue.tsx',
  '../../apps/mobile/src/app/(app)/worker-history.tsx',
  '../../apps/mobile/src/app/(app)/worker-profile.tsx',
];

const MAX_LINE_LENGTH = 240;

describe('worker panel design', () => {
  it('keeps every worker screen readable with a bounded line length', () => {
    for (const path of WORKER_SCREENS) {
      const lengths = source(path).split('\n').map((line) => line.length);
      expect(Math.max(...lengths)).toBeLessThanOrEqual(MAX_LINE_LENGTH);
    }
  });

  it('renders the worker panel with the worker kit only', () => {
    for (const path of WORKER_SCREENS) {
      const screen = source(path);
      expect(screen).toContain('WorkerScreenContainer');
      expect(screen).not.toContain('ThemedText');
      expect(screen).not.toContain('AuthScreenContainer');
    }
  });

  it('keeps the product copy of the worker panel intact', () => {
    const jornada = source('../../apps/mobile/src/app/(app)/worker.tsx');
    const queue = source('../../apps/mobile/src/app/(app)/worker-queue.tsx');
    const history = source('../../apps/mobile/src/app/(app)/worker-history.tsx');
    const profile = source('../../apps/mobile/src/app/(app)/worker-profile.tsx');

    expect(jornada).toContain('Mi jornada');
    expect(jornada).toContain('Llamar al cliente');
    expect(jornada).toContain('Iniciar atención');
    expect(jornada).toContain('Finalizar atención');
    expect(jornada).toContain('finishMyService');
    expect(queue).toContain('Cola de espera');
    expect(queue).toContain('Agregar cliente presencial');
    expect(history).toContain('Mi historial');
    expect(profile).toContain('Mi perfil');
    expect(profile).toContain('Salir de la barbería');
  });
});
