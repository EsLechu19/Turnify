import { describe, expect, it } from 'vitest';

import { normalizeGuestDetails } from '../../apps/mobile/src/features/queue/guest-ticket-details';

describe('guest ticket details', () => {
  it('trims a required name and preserves only approved optional values', () => {
    expect(normalizeGuestDetails({ name: '  Ada  ', ageRange: '25_34', gender: 'prefer_not_to_say' }))
      .toEqual({ name: 'Ada', ageRange: '25_34', gender: 'prefer_not_to_say', phone: null, whatsappConsent: false });
  });

  it('rejects missing or oversized names without collecting a phone number', () => {
    expect(() => normalizeGuestDetails({ name: ' ' })).toThrow('between 1 and 80');
    expect(() => normalizeGuestDetails({ name: 'a'.repeat(81) })).toThrow('between 1 and 80');
  });

  it('normalizes an international phone only when consent is explicit', () => {
    expect(normalizeGuestDetails({ name: 'Ada', phone: ' +51 (987) 654-321 ', whatsappConsent: true }).phone)
      .toBe('+51987654321');
    expect(normalizeGuestDetails({ name: 'Ada', phone: ' +51987654321 ', whatsappConsent: false }))
      .toMatchObject({ phone: null, whatsappConsent: false });
    expect(normalizeGuestDetails({ name: 'Ada', phone: 'not a phone', whatsappConsent: false }))
      .toMatchObject({ phone: null, whatsappConsent: false });
  });

  it('rejects consent without a valid international phone', () => {
    expect(() => normalizeGuestDetails({ name: 'Ada', whatsappConsent: true })).toThrow('WhatsApp consent requires a valid phone number');
    expect(() => normalizeGuestDetails({ name: 'Ada', phone: '987654321', whatsappConsent: true })).toThrow('WhatsApp consent requires a valid phone number');
  });
});
