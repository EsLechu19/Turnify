import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { resolveWorkerAccessState, validateWorkerCredentials, validateWorkerRegistration } from '../../apps/mobile/src/features/worker/worker-access-state';
import { roleCanAccessAppRoute } from '../../apps/mobile/src/features/worker/worker-navigation';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Worker authenticated access flow', () => {
  it('validates login credentials before attempting authentication', () => {
    expect(validateWorkerCredentials('', '')).toBe('Ingresa tu correo y contraseña.');
    expect(validateWorkerCredentials('not-an-email', 'secret')).toBe('Ingresa un correo válido.');
    expect(validateWorkerCredentials('worker@example.com', 'secret')).toBeNull();
  });

  it('models profile resolution and membership authorization separately', () => {
    expect(resolveWorkerAccessState(null, true)).toBe('resolving');
    expect(resolveWorkerAccessState(null, false)).toBe('missing-profile');
    expect(resolveWorkerAccessState({ role: 'personal', businessId: null }, false)).toBe('awaiting-assignment');
    expect(resolveWorkerAccessState({ role: 'personal', businessId: 'approved-shop' }, false)).toBe('approved');
    expect(resolveWorkerAccessState({ role: 'admin', businessId: 'shop' }, false)).toBe('denied');
    expect(resolveWorkerAccessState({ role: 'cliente', businessId: null }, false)).toBe('denied');
  });

  it('validates registration and preserves Worker intent in the sign-up call', () => {
    expect(validateWorkerRegistration('', 'worker@example.com', 'secret')).toBe('Ingresa tu nombre.');
    expect(validateWorkerRegistration('Ana', 'worker@example.com', 'short')).toBe('La contraseña debe tener al menos 6 caracteres.');
    expect(validateWorkerRegistration('Ana', 'worker@example.com', 'secret')).toBeNull();
    expect(source('../../apps/mobile/src/app/(auth)/worker-register.tsx')).toContain('signUp(email, password, { name, workerIntent: true })');
  });

  it('renders confirmation and live-session awaiting-assignment states without creating memberships', () => {
    const registration = source('../../apps/mobile/src/app/(auth)/worker-register.tsx');
    expect(registration).toContain('Confirma tu correo');
    expect(registration).toContain('accessState === \'awaiting-assignment\'');
    expect(registration).not.toContain('registerAsWorker');
  });

  it('keeps the approved Worker destination and denies customer/admin Worker routes', () => {
    expect(source('../../apps/mobile/src/app/(auth)/worker-access.tsx')).toContain('Redirect href="/(app)/worker"');
    expect(roleCanAccessAppRoute({ role: 'admin', businessId: 'shop' }, 'worker')).toBe(false);
    expect(roleCanAccessAppRoute({ role: 'cliente', businessId: null }, 'worker')).toBe(false);
    expect(source('../../apps/mobile/src/app/(app)/worker-profile.tsx')).toContain('selectWorkerShop(shop.businessId).then(reloadProfile)');
  });

  it('avoids unsupported station, queue-total, and static-progress dashboard claims', () => {
    const dashboard = source('../../apps/mobile/src/app/(app)/worker.tsx');
    expect(dashboard).not.toContain('Tu estación');
    expect(dashboard).not.toContain('EN COLA');
    expect(dashboard).not.toContain('progressFill');
    expect(dashboard).not.toContain('elapsedModule');
  });
});
