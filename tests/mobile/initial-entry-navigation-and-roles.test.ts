import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { publicLaunchRoute, publicShopRoute, workerRegistrationRoute, workerSignInRoute } from '../../apps/mobile/src/features/public/public-route-policy';
import { roleCanAccessAppRoute } from '../../apps/mobile/src/features/worker/worker-navigation';

const source = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('Criterios de Aceptación: Entrada inicial, Guards de rol y Enlaces de retorno', () => {
  it('1. Entrada inicial expone ambos recorridos (Cliente y Personal) sin exigir cuenta al cliente', () => {
    const launchSource = source('../../apps/mobile/src/app/index.tsx');

    // La ruta de lanzamiento es el punto de entrada principal
    expect(publicLaunchRoute).toBe('/');

    // Opción Cliente: QR e ingreso por código de barbería
    expect(launchSource).toContain('Escanear código QR');
    expect(launchSource).toContain('/(public)/scan');
    expect(launchSource).toContain('Ingresar código de la barbería');
    expect(launchSource).toContain('publicShopRoute');
    expect(publicShopRoute).toBe('/(public)/shop');

    // Opción Personal: Acceso para personal
    expect(launchSource).toContain('¿Trabajas en una barbería?');
    expect(launchSource).toContain('Acceso para personal');
    expect(launchSource).toContain('workerSignInRoute');
    expect(workerSignInRoute).toBe('/(auth)/worker-access');
    expect(workerRegistrationRoute).toBe('/(auth)/worker-register');
  });

  it('2. Cliente y personal no acceden a pantallas ajenas a su rol (Guards de rol)', () => {
    const appLayoutSource = source('../../apps/mobile/src/app/(app)/_layout.tsx');
    const authLayoutSource = source('../../apps/mobile/src/app/(auth)/_layout.tsx');

    // App Layout redirige a no autenticados a /
    expect(appLayoutSource).toContain("Redirect href=\"/\"");

    // Verificación de roles para Cliente
    const customer = { role: 'cliente' as const, businessId: null };
    expect(roleCanAccessAppRoute(customer, 'worker')).toBe(false);
    expect(roleCanAccessAppRoute(customer, 'worker-queue')).toBe(false);
    expect(roleCanAccessAppRoute(customer, 'worker-shops')).toBe(false);
    expect(roleCanAccessAppRoute(customer, 'admin')).toBe(false);
    expect(roleCanAccessAppRoute(customer, 'configuration')).toBe(false);

    // Verificación de roles para Personal sin barbería asignada
    const unassignedWorker = { role: 'personal' as const, businessId: null };
    expect(roleCanAccessAppRoute(unassignedWorker, 'worker-shops')).toBe(true);
    expect(roleCanAccessAppRoute(unassignedWorker, 'worker')).toBe(false);
    expect(roleCanAccessAppRoute(unassignedWorker, 'admin')).toBe(false);

    // Verificación de roles para Personal asignado
    const assignedWorker = { role: 'personal' as const, businessId: 'shop-123' };
    expect(roleCanAccessAppRoute(assignedWorker, 'worker')).toBe(true);
    expect(roleCanAccessAppRoute(assignedWorker, 'worker-queue')).toBe(true);
    expect(roleCanAccessAppRoute(assignedWorker, 'worker-history')).toBe(true);
    expect(roleCanAccessAppRoute(assignedWorker, 'worker-profile')).toBe(true);
    expect(roleCanAccessAppRoute(assignedWorker, 'admin')).toBe(false);

    // Verificación de roles para Admin
    const admin = { role: 'admin' as const, businessId: 'shop-123' };
    expect(roleCanAccessAppRoute(admin, 'admin')).toBe(true);
    expect(roleCanAccessAppRoute(admin, 'configuration')).toBe(true);
    expect(roleCanAccessAppRoute(admin, 'worker')).toBe(false);

    // Auth Layout previene que usuarios con sesión activa se queden en auth
    expect(authLayoutSource).toContain('staffLanding(profile)');
  });

  it('3. Los enlaces de retorno conservan una navegación predecible hacia el inicio y entre vistas', () => {
    const workerAccessSource = source('../../apps/mobile/src/app/(auth)/worker-access.tsx');
    const workerRegisterSource = source('../../apps/mobile/src/app/(auth)/worker-register.tsx');
    const loginSource = source('../../apps/mobile/src/app/(auth)/login.tsx');
    const registerSource = source('../../apps/mobile/src/app/(auth)/register.tsx');
    const scanSource = source('../../apps/mobile/src/app/(public)/scan.tsx');
    const shopSource = source('../../apps/mobile/src/app/(public)/shop.tsx');
    const ticketSource = source('../../apps/mobile/src/app/(public)/ticket.tsx');

    // Pantallas de Auth incluyen retorno al inicio (/)
    expect(workerAccessSource).toContain('href="/"');
    expect(workerAccessSource).toContain('Volver al inicio');
    expect(workerRegisterSource).toContain('href="/"');
    expect(workerRegisterSource).toContain('Volver al inicio');
    expect(loginSource).toContain('href="/"');
    expect(loginSource).toContain('Volver al inicio');
    expect(registerSource).toContain('href="/"');
    expect(registerSource).toContain('Volver al inicio');

    // Flujo público contiene retornos predecibles
    expect(scanSource).toContain('publicLaunchRoute');
    expect(shopSource).toContain("router.replace('/')");
    expect(ticketSource).toContain("router.replace('/')");
  });
});
