import { describe, expect, it } from 'vitest';
import {
  deriveEtaMinutes,
  projectQueue,
  resolveAverage,
} from '../../src/domain/eta';
import { buildQueue } from './factories';

// Verifies the ETA formula, its bounds, the average fallback policy
// and the pure queue projection combining order with per-ticket ETA.
describe('deriveEtaMinutes', () => {
  it('computes ceil(delante * promedio / puestos / 60)', () => {
    // 2 ahead * 300s / 1 counter / 60 = 10 minutes exactly.
    expect(deriveEtaMinutes(2, 300, 1)).toBe(10);
  });

  it('rounds fractional minutes up', () => {
    // 1 ahead * 90s / 1 counter / 60 = 1.5 -> 2 minutes.
    expect(deriveEtaMinutes(1, 90, 1)).toBe(2);
  });

  it('splits the load across active counters', () => {
    // 4 ahead * 300s / 2 counters / 60 = 10 minutes.
    expect(deriveEtaMinutes(4, 300, 2)).toBe(10);
  });

  it('floors at 1 minute while anyone is ahead', () => {
    // 1 ahead * 5s / 4 counters / 60 ~ 0.02 -> floored to 1.
    expect(deriveEtaMinutes(1, 5, 4)).toBe(1);
  });

  it('returns 0 minutes when nobody is ahead', () => {
    expect(deriveEtaMinutes(0, 300, 1)).toBe(0);
    expect(deriveEtaMinutes(0, 300, 4)).toBe(0);
  });
});

describe('resolveAverage', () => {
  it('averages samples once minSamples is reached', () => {
    expect(resolveAverage([200, 300, 400])).toBe(300);
  });

  it('accepts a custom minSamples threshold', () => {
    expect(resolveAverage([120, 180], 300, 2)).toBe(150);
  });

  it('falls back to the default 300s when samples are scarce', () => {
    expect(resolveAverage([200, 400])).toBe(300);
    expect(resolveAverage([])).toBe(300);
  });

  it('falls back to a custom fallback when samples are scarce', () => {
    expect(resolveAverage([200], 240, 3)).toBe(240);
  });
});

describe('projectQueue', () => {
  it('combines order with per-ticket ETA', () => {
    const queue = buildQueue({ normals: 2, preferentials: 0 });
    const projected = projectQueue(queue, { averageSeconds: 300, activeCounters: 1 });
    expect(projected).toEqual([
      { id: 'normal-1', posicion: 1, personasDelante: 0, etaMinutes: 0 },
      { id: 'normal-2', posicion: 2, personasDelante: 1, etaMinutes: 5 },
    ]);
  });

  it('projects the preferential first service slot', () => {
    const queue = buildQueue({ normals: 3, preferentials: 1 });
    const projected = projectQueue(queue, {
      averageSeconds: 300,
      activeCounters: 1,
      preferencialCada: 3,
    });
    expect(projected.map((entry) => entry.id)).toEqual([
      'preferencial-1',
      'normal-1',
      'normal-2',
      'normal-3',
    ]);
    expect(projected[0]).toMatchObject({ posicion: 1, personasDelante: 0 });
    expect(projected[0]?.etaMinutes).toBe(0);
  });

  it('skips non-waiting tickets in the projection', () => {
    const queue = buildQueue({ normals: 1, preferentials: 0 });
    const projected = projectQueue(
      [...queue, { ...queue[0]!, id: 'done', status: 'finalizado' as const }],
      { averageSeconds: 300, activeCounters: 1 },
    );
    expect(projected.map((entry) => entry.id)).toEqual(['normal-1']);
  });
});
