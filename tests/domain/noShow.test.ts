import { describe, expect, it } from 'vitest';
import {
  applyNoShowSweep,
  expiredCalledTurnIds,
  isPastGrace,
} from '../../src/domain/noShow';
import { buildCalledItem } from './factories';

// Verifies the no-show grace sweep: inclusive cutoff, llamado-only scope,
// invalid grace rejection and snapshot immutability.
describe('isPastGrace', () => {
  it('expires exactly at the inclusive cutoff (T0 + grace)', () => {
    expect(
      isPastGrace('2026-01-01T10:00:00Z', '2026-01-01T10:05:00Z', 5),
    ).toBe(true);
  });

  it('stays fresh one millisecond before the cutoff', () => {
    expect(
      isPastGrace('2026-01-01T10:00:00Z', '2026-01-01T10:04:59.999Z', 5),
    ).toBe(false);
  });

  it('expires after the cutoff', () => {
    expect(
      isPastGrace('2026-01-01T10:00:00Z', '2026-01-01T10:05:00.001Z', 5),
    ).toBe(true);
  });

  it('accepts a Date as now', () => {
    expect(
      isPastGrace(
        '2026-01-01T10:00:00Z',
        new Date('2026-01-01T10:05:00Z'),
        5,
      ),
    ).toBe(true);
  });

  it('supports a custom 1-minute grace fast-path', () => {
    expect(
      isPastGrace('2026-01-01T10:00:00Z', '2026-01-01T10:01:00Z', 1),
    ).toBe(true);
    expect(
      isPastGrace('2026-01-01T10:00:00Z', '2026-01-01T10:00:59Z', 1),
    ).toBe(false);
  });

  it('rejects a grace below 1 minute', () => {
    expect(() =>
      isPastGrace('2026-01-01T10:00:00Z', '2026-01-01T10:05:00Z', 0),
    ).toThrow(RangeError);
  });
});

describe('expiredCalledTurnIds', () => {
  it('collects only past-grace llamado ids', () => {
    const snapshot = [
      buildCalledItem({
        id: 'expired',
        llamadoEn: '2026-01-01T10:00:00Z',
      }),
      buildCalledItem({
        id: 'fresh',
        llamadoEn: '2026-01-01T10:04:00Z',
      }),
    ];
    expect(
      expiredCalledTurnIds(snapshot, '2026-01-01T10:05:00Z', 5),
    ).toEqual(['expired']);
  });

  it('ignores llamado tickets without llamadoEn', () => {
    const snapshot = [buildCalledItem({ id: 'no-stamp', llamadoEn: undefined })];
    expect(
      expiredCalledTurnIds(snapshot, '2026-01-01T10:05:00Z', 5),
    ).toEqual([]);
  });

  it('ignores non-llamado statuses even with an old stamp', () => {
    const snapshot = [
      buildCalledItem({
        id: 'waiting',
        status: 'en_espera',
        llamadoEn: '2026-01-01T09:00:00Z',
      }),
      buildCalledItem({
        id: 'notified',
        status: 'notificado',
        llamadoEn: '2026-01-01T09:00:00Z',
      }),
      buildCalledItem({
        id: 'serving',
        status: 'en_atencion',
        llamadoEn: '2026-01-01T09:00:00Z',
      }),
    ];
    expect(
      expiredCalledTurnIds(snapshot, '2026-01-01T10:05:00Z', 5),
    ).toEqual([]);
  });

  it('returns an empty list for an empty snapshot', () => {
    expect(expiredCalledTurnIds([], '2026-01-01T10:05:00Z', 5)).toEqual([]);
  });

  it('rejects a grace below 1 minute', () => {
    expect(() => expiredCalledTurnIds([], '2026-01-01T10:05:00Z', 0)).toThrow(
      RangeError,
    );
  });
});

describe('applyNoShowSweep', () => {
  it('moves expired llamado tickets to ausente and reports their ids', () => {
    const snapshot = [
      buildCalledItem({
        id: 'expired',
        llamadoEn: '2026-01-01T10:00:00Z',
      }),
      buildCalledItem({
        id: 'fresh',
        llamadoEn: '2026-01-01T10:04:30Z',
      }),
    ];
    const result = applyNoShowSweep(snapshot, '2026-01-01T10:05:00Z', 5);
    expect(result.expiredIds).toEqual(['expired']);
    expect(result.snapshot).toEqual([
      {
        id: 'expired',
        status: 'ausente',
        llamadoEn: '2026-01-01T10:00:00Z',
      },
      {
        id: 'fresh',
        status: 'llamado',
        llamadoEn: '2026-01-01T10:04:30Z',
      },
    ]);
  });

  it('leaves en_espera, notificado and en_atencion untouched', () => {
    const snapshot = [
      buildCalledItem({ id: 'waiting', status: 'en_espera' }),
      buildCalledItem({ id: 'notified', status: 'notificado' }),
      buildCalledItem({ id: 'serving', status: 'en_atencion' }),
      buildCalledItem({
        id: 'expired',
        llamadoEn: '2026-01-01T10:00:00Z',
      }),
    ];
    const result = applyNoShowSweep(snapshot, '2026-01-01T10:05:00Z', 5);
    expect(result.expiredIds).toEqual(['expired']);
    expect(result.snapshot.map((item) => item.status)).toEqual([
      'en_espera',
      'notificado',
      'en_atencion',
      'ausente',
    ]);
  });

  it('returns an empty sweep for an empty snapshot', () => {
    expect(applyNoShowSweep([], '2026-01-01T10:05:00Z', 5)).toEqual({
      snapshot: [],
      expiredIds: [],
    });
  });

  it('treats the boundary as expired with a custom 1-minute grace', () => {
    const snapshot = [
      buildCalledItem({
        id: 'boundary',
        llamadoEn: '2026-01-01T10:00:00Z',
      }),
    ];
    const result = applyNoShowSweep(snapshot, '2026-01-01T10:01:00Z', 1);
    expect(result.expiredIds).toEqual(['boundary']);
    expect(result.snapshot[0]?.status).toBe('ausente');
  });

  it('rejects a grace below 1 minute', () => {
    expect(() => applyNoShowSweep([], '2026-01-01T10:05:00Z', 0)).toThrow(
      RangeError,
    );
  });

  it('never mutates the input snapshot', () => {
    const snapshot = [
      buildCalledItem({
        id: 'expired',
        llamadoEn: '2026-01-01T10:00:00Z',
      }),
    ];
    const frozen = Object.freeze(snapshot.map((item) => Object.freeze({ ...item })));
    const result = applyNoShowSweep(snapshot, '2026-01-01T10:05:00Z', 5);
    expect(snapshot).toEqual([...frozen]);
    expect(result.snapshot).not.toBe(snapshot);
    expect(result.snapshot[0]).not.toBe(snapshot[0]);
  });
});
