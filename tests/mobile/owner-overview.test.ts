import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { mapOwnerOverview } from '../../apps/mobile/src/features/business/owner-overview-api';
import { roleCanAccessAppRoute } from '../../apps/mobile/src/features/worker/worker-navigation';

const adminSource = readFileSync(new URL('../../apps/mobile/src/app/admin.tsx', import.meta.url), 'utf8');
const apiSource = readFileSync(new URL('../../apps/mobile/src/features/business/owner-overview-api.ts', import.meta.url), 'utf8');

describe('Owner mobile overview', () => {
  it('keeps the owner route outside worker access', () => {
    expect(roleCanAccessAppRoute({ role: 'admin', businessId: 'business-1' }, 'worker')).toBe(false);
    expect(adminSource).toContain("profile?.role !== 'admin'");
  });

  it('renders the worker action only from an active WORKER membership', () => {
    expect(adminSource).toContain("membership.role === 'WORKER'");
    expect(adminSource).toContain('Operar como trabajador');
  });

  it('derives owner scope from authenticated membership or the legacy profile fallback', () => {
    expect(apiSource).toContain("rpc('mis_membresias_empresa')");
    expect(apiSource).toContain("from('perfiles').select('empresa_id')");
    expect(apiSource).toContain("from('empresas').select('id, nombre, codigo, abierta')");
    expect(apiSource).not.toContain('getOwnerOverview(businessId');
  });

  it('maps queue data into honest metrics, estimate, and objective alerts', () => {
    const overview = mapOwnerOverview({
      business: { id: 'business-1', name: 'Turnify', code: 'TURN-1', isOpen: false },
      queues: [{ id: 'queue-1', nombre: 'Cortes', en_espera: 3, puestos_activos: 1, duracion_promedio_seg: 300 }],
      todayTickets: [
        { estado: 'finalizado' },
        { estado: 'ausente' },
        { estado: 'en_espera' },
        { estado: 'en_atencion' },
      ],
      team: [],
    });

    expect(overview.waitingCount).toBe(3);
    expect(overview.estimatedWaitMinutes).toBe(15);
    expect(overview.metrics).toEqual({ completed: 1, absent: 1, waiting: 1, active: 1 });
    expect(overview.alerts).toEqual(['Hay clientes esperando mientras el negocio está cerrado.']);
  });

  it('does not invent an alert for an open business', () => {
    const overview = mapOwnerOverview({
      business: { id: 'business-1', name: 'Turnify', code: 'TURN-1', isOpen: true },
      queues: [],
      todayTickets: [],
      team: [],
    });
    expect(overview.alerts).toEqual([]);
  });
});
