import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Worker invitation UI', () => {
  it('shows a generated code only in transient Admin state and never persists it', () => {
    const admin = source('../../apps/mobile/src/app/(app)/admin.tsx');
    expect(admin).toContain('generateWorkerInvitationCode(workerEmail)');
    expect(admin).toContain('Código generado (se muestra una sola vez)');
    expect(admin).toContain('compártelo manualmente');
    expect(admin).not.toContain('AsyncStorage');
    expect(admin).not.toContain('SecureStore');
  });

  it('replaces direct add-by-email with pending approval controls', () => {
    const admin = source('../../apps/mobile/src/app/(app)/admin.tsx');
    expect(admin).not.toContain('addWorkerByEmail');
    expect(admin).toContain('getShopWorkerRequests');
    expect(admin).toContain('resolveWorkerRequest');
    expect(admin).toContain('Solicitudes pendientes');
  });
});
