import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { computeAlerts } from '../../apps/web/src/data/compute';
import type { QueueTicket, TeamMember } from '../../apps/web/src/data/types';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

const ticket = (overrides: Partial<QueueTicket>): QueueTicket => ({
  id: 't1',
  code: 'A-01',
  queueId: 'q1',
  customer: 'Cliente',
  service: 'Corte',
  barber: null,
  status: 'espera',
  priority: false,
  waitedMinutes: 3,
  arrivesAt: '10:05',
  ...overrides,
});

const member = (overrides: Partial<TeamMember>): TeamMember => ({
  id: 'w1',
  name: 'Josue',
  availability: 'disponible',
  currentTicket: null,
  completedToday: 0,
  ...overrides,
});

describe('professional dashboard board', () => {
  it('shows a read-only board without fake actions or invented waits', () => {
    const card = read('apps', 'web', 'src', 'features', 'dashboard', 'components', 'ActiveQueueCard.tsx');

    expect(card).not.toContain('onCall');
    expect(card).not.toContain('onAssign');
    expect(card).not.toContain('AVISAR');
    expect(card).not.toContain('waitedMinutes + 5');
    expect(card).toContain("navigate('/cola')");
  });

  it('compares against yesterday instead of fixed trend copy', () => {
    const cards = read('apps', 'web', 'src', 'features', 'dashboard', 'components', 'StatCards.tsx');

    expect(cards).not.toContain('2 min vs. ayer');
    expect(cards).not.toContain('1 vs. semana pasada');
    expect(cards).toContain('compare');
  });

  it('wires alerts, ratings and yesterday compare on the dashboard', () => {
    const dashboard = read('apps', 'web', 'src', 'features', 'dashboard', 'DashboardPage.tsx');
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(dashboard).not.toContain('Pausar fila');
    expect(dashboard).toContain('AlertsCard');
    expect(dashboard).toContain('RatingsCard');
    expect(live).toContain('fetchYesterdayCompare');
  });
});

describe('operational alerts', () => {
  it('flags stuck chairs, unassigned calls, long waits and absence spikes', () => {
    const alerts = computeAlerts(
      [
        ticket({ id: 'called', code: 'A-10', status: 'llamado', barber: null }),
        ticket({ id: 'waiting', code: 'A-11', status: 'espera', waitedMinutes: 25 }),
        ticket({ id: 'a1', code: 'A-01', status: 'ausente' }),
        ticket({ id: 'a2', code: 'A-02', status: 'ausente' }),
        ticket({ id: 'a3', code: 'A-03', status: 'ausente' }),
      ],
      [member({ availability: 'atencion', currentTicket: null })],
    );

    expect(alerts.map((alert) => alert.id)).toEqual(
      expect.arrayContaining(['stuck-w1', 'unassigned-called', 'waiting-waiting', 'absent-spike']),
    );
  });

  it('stays quiet on a normal operation', () => {
    expect(
      computeAlerts([ticket({ status: 'espera', waitedMinutes: 4 })], [member()]),
    ).toEqual([]);
  });
});
