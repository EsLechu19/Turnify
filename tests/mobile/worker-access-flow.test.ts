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

  it('validates registration input before it ever reaches the removed screen', () => {
    expect(validateWorkerRegistration('', 'worker@example.com', 'secret')).toBe('Ingresa tu nombre.');
    expect(validateWorkerRegistration('Ana', 'worker@example.com', 'short')).toBe('La contraseña debe tener al menos 6 caracteres.');
    expect(validateWorkerRegistration('Ana', 'worker@example.com', 'secret')).toBeNull();
  });

  it('keeps a single login screen for staff without blind role shortcuts', () => {
    const login = source('../../apps/mobile/src/app/(auth)/login.tsx');

    expect(login).not.toContain("router.replace('/(app)')");
    expect(login).not.toContain("router.replace('/(app)/worker')");
    expect(login).not.toContain('label="Cliente"');
    expect(login).not.toContain('label="Empleado"');
    expect(login).toContain('label="Ingresar"');
    expect(login).toContain('Entrar como invitado');
  });

  it('wires the login form to the real sign-in with validation and visible errors', () => {
    const login = source('../../apps/mobile/src/app/(auth)/login.tsx');
    const context = source('../../apps/mobile/src/features/auth/use-auth.tsx');

    expect(login).toContain('signIn(');
    expect(login).toContain('validateWorkerCredentials');
    expect(login).toContain('AuthErrorMessage');
    expect(context).toContain('signInWithPassword');
    expect(context).toContain('translateAuthError');
  });

  it('uses Worker Shops as the awaiting destination and denies unselected live routes', () => {
    expect(roleCanAccessAppRoute({ role: 'admin', businessId: 'shop' }, 'worker')).toBe(false);
    expect(roleCanAccessAppRoute({ role: 'cliente', businessId: null }, 'worker')).toBe(false);
    const profile = source('../../apps/mobile/src/app/(app)/worker-profile.tsx');
    expect(profile).toContain('selectWorkerShop(shop.businessId)');
    expect(profile).toContain("router.replace('/(app)/worker')");
    expect(profile).toContain('Salir de la barbería');
    expect(profile).toContain("router.replace('/(app)/worker-shops')");
  });

  it('permits an unselected personal account only to Worker Shops', () => {
    const worker = { role: 'personal' as const, businessId: null };
    expect(roleCanAccessAppRoute(worker, 'worker-shops')).toBe(true);
    expect(roleCanAccessAppRoute(worker, 'worker')).toBe(false);
    expect(source('../../apps/mobile/src/app/(app)/worker-shops.tsx')).toContain('requestWorkerInvitation(code)');
    expect(source('../../apps/mobile/src/app/(app)/worker-shops.tsx')).toContain("router.replace('/(app)/worker')");
  });

  it('returns signed-out users to the public launch screen', () => {
    const profile = source('../../apps/mobile/src/app/(app)/profile.tsx');
    const workerProfile = source('../../apps/mobile/src/app/(app)/worker-profile.tsx');
    const workerShops = source('../../apps/mobile/src/app/(app)/worker-shops.tsx');

    for (const screen of [profile, workerProfile, workerShops]) {
      expect(screen).toContain("router.replace('/')");
      expect(screen).not.toContain("router.replace('/(auth)/login')");
    }
  });

  it('renders Worker Shops with the current UI kit instead of the legacy surfaces', () => {
    const shops = source('../../apps/mobile/src/app/(app)/worker-shops.tsx');

    expect(shops).toContain("from '@/components/ui'");
    expect(shops).toContain('Palette');
    expect(shops).toContain('OptionCard');
    expect(shops).toContain('Row');
    expect(shops).not.toContain('ThemedText');
    expect(shops).not.toContain('AuthScreenContainer');
    expect(shops).not.toContain('AppCard');
  });

  it('avoids unsupported station, queue-total, and static-progress dashboard claims', () => {
    const dashboard = source('../../apps/mobile/src/app/(app)/worker.tsx');
    expect(dashboard).not.toContain('Tu estación');
    expect(dashboard).not.toContain('EN COLA');
    expect(dashboard).not.toContain('progressFill');
    expect(dashboard).not.toContain('elapsedModule');
  });
});
