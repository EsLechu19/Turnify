import { describe, expect, it } from 'vitest';

import { formatEstimatedWait } from '../../apps/mobile/src/features/queue/ticket-presentation';

describe('formatEstimatedWait', () => {
  it('formats minutes and seconds', () => {
    expect(formatEstimatedWait(599)).toBe('9:59');
    expect(formatEstimatedWait(600)).toBe('10:00');
    expect(formatEstimatedWait(9)).toBe('0:09');
  });

  it('never goes negative', () => {
    expect(formatEstimatedWait(-12)).toBe('0:00');
  });
});
