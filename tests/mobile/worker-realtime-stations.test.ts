import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('worker realtime coordination', () => {
  it('refreshes the worker queue over a company-scoped realtime channel', () => {
    const queue = source('../../apps/mobile/src/app/(app)/worker-queue.tsx');

    expect(queue).toContain('.channel(');
    expect(queue).toContain('empresa_id=eq.');
    expect(queue).toContain('removeChannel');
  });

  it('renders stations from real roster data without placeholder chairs', () => {
    const stations = source('../../apps/mobile/src/components/worker/worker-stations.tsx');

    expect(stations).not.toContain('Por asignar');
    expect(stations).toContain('stations');
  });

  it('loads shop stations through the worker barber API', () => {
    const api = source('../../apps/mobile/src/features/queue/worker-barber-api.ts');
    const jornada = source('../../apps/mobile/src/app/(app)/worker.tsx');

    expect(api).toContain('getShopStations');
    expect(api).toContain('estaciones_de_mi_empresa');
    expect(jornada).toContain('getShopStations');
  });
});
