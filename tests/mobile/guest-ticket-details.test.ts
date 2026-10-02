import { describe, expect, it } from 'vitest';

import { normalizeGuestDetails } from '../../apps/mobile/src/features/queue/guest-ticket-details';

describe('guest ticket details', () => {
  it('trims a required name and preserves only approved optional values', () => {
    expect(normalizeGuestDetails({ name: '  Ada  ', ageRange: '25_34', gender: 'prefer_not_to_say' }))
      .toEqual({ name: 'Ada', ageRange: '25_34', gender: 'prefer_not_to_say' });
  });

  it('rejects missing or oversized names without collecting a phone number', () => {
    expect(() => normalizeGuestDetails({ name: ' ' })).toThrow('between 1 and 80');
    expect(() => normalizeGuestDetails({ name: 'a'.repeat(81) })).toThrow('between 1 and 80');
  });
});
