import { describe, expect, it } from 'vitest';

import { normalizeBusinessCode, parseTurnifyQr } from '../../apps/mobile/src/features/queue/queue-api';

describe('QR and code parsing', () => {
  it('accepts raw business codes', () => {
    expect(parseTurnifyQr('TURNO-123')).toBe('TURNO-123');
    expect(parseTurnifyQr('  turno-123  ')).toBe('TURNO-123');
  });

  it('accepts the turnify: scheme', () => {
    expect(parseTurnifyQr('turnify:TURNO-123')).toBe('TURNO-123');
  });

  it('accepts the dashboard ticket URL payload', () => {
    expect(parseTurnifyQr('turnify.app/t/TURNO-123')).toBe('TURNO-123');
    expect(parseTurnifyQr('https://turnify.app/t/TURNO-123')).toBe('TURNO-123');
    expect(parseTurnifyQr('HTTPS://TURNIFY.APP/t/turno-123')).toBe('TURNO-123');
  });

  it('rejects non-Turnify payloads', () => {
    expect(parseTurnifyQr('https://example.com/t/TURNO-123')).toBeNull();
    expect(parseTurnifyQr('https://evilturnify.app/t/TURNO-123')).toBeNull();
    expect(parseTurnifyQr('https://turnify.app/t/TURNO-123/extra')).toBeNull();
    expect(parseTurnifyQr('https://turnify.app/other/TURNO-123')).toBeNull();
    expect(parseTurnifyQr('https://turnify.app/t/TURNO-123?next=evil')).toBeNull();
    expect(parseTurnifyQr('hola mundo')).toBeNull();
    expect(parseTurnifyQr('')).toBeNull();
    expect(normalizeBusinessCode('AB')).toBeNull();
  });
});
