import { describe, expect, it, vi } from 'vitest';

import {
  type NotificationRegistrationDiagnostic,
  registerTokenAfterPermission,
} from '../../apps/mobile/src/features/notifications/notification-registration';

function diagnosticCollector(): [NotificationRegistrationDiagnostic[], (code: NotificationRegistrationDiagnostic) => void] {
  const diagnostics: NotificationRegistrationDiagnostic[] = [];
  return [diagnostics, (code) => diagnostics.push(code)];
}

describe('registerTokenAfterPermission', () => {
  it('waits for notification initialization before requesting permission and registering', async () => {
    const steps: string[] = [];
    let releaseInitialization: (() => void) | undefined;
    const initialized = new Promise<void>((resolve) => {
      releaseInitialization = resolve;
    });
    const getPermissions = vi.fn(async () => {
      steps.push('get-permissions');
      return { granted: false };
    });
    const requestPermissions = vi.fn(async () => {
      steps.push('request-permissions');
      return { granted: true };
    });
    const registerToken = vi.fn(async () => {
      steps.push('register-token');
    });
    const [diagnostics, onDiagnostic] = diagnosticCollector();

    const registration = registerTokenAfterPermission({
      initializeNotifications: async () => {
        steps.push('initialize');
        await initialized;
      },
      getPermissions,
      requestPermissions,
      acquireToken: async () => 'token-is-not-a-diagnostic',
      registerToken: async () => registerToken(),
      onDiagnostic,
    });

    await Promise.resolve();
    expect(steps).toEqual(['initialize']);
    expect(getPermissions).not.toHaveBeenCalled();

    releaseInitialization?.();

    await expect(registration).resolves.toBe(true);
    expect(steps).toEqual(['initialize', 'get-permissions', 'request-permissions', 'register-token']);
    expect(diagnostics).toEqual(['registration_completed']);
  });

  it('does not register after permission is denied', async () => {
    const registerToken = vi.fn(async () => undefined);
    const [diagnostics, onDiagnostic] = diagnosticCollector();

    await expect(registerTokenAfterPermission({
      initializeNotifications: async () => undefined,
      getPermissions: async () => ({ granted: false }),
      requestPermissions: async () => ({ granted: false }),
      acquireToken: async () => 'token-is-not-a-diagnostic',
      registerToken,
      onDiagnostic,
    })).resolves.toBe(false);

    expect(registerToken).not.toHaveBeenCalled();
    expect(diagnostics).toEqual(['permission_denied']);
  });

  it.each([
    ['android foundation failure', { initializeNotifications: async () => { throw new Error('secret foundation detail'); } }, 'android_foundation_failed'],
    ['Expo token acquisition failure', { acquireToken: async () => { throw new Error('ExponentPushToken[secret]'); } }, 'expo_token_acquisition_failed'],
    ['registration RPC failure', { registerToken: async () => { throw new Error('customer@example.com'); } }, 'registration_rpc_failed'],
  ] as const)('reports only the stable code for %s', async (_scenario, overrides, expectedDiagnostic) => {
    const [diagnostics, onDiagnostic] = diagnosticCollector();

    await expect(registerTokenAfterPermission({
      initializeNotifications: async () => undefined,
      getPermissions: async () => ({ granted: true }),
      requestPermissions: async () => ({ granted: true }),
      acquireToken: async () => 'ExponentPushToken[secret]',
      registerToken: async () => undefined,
      onDiagnostic,
      ...overrides,
    })).resolves.toBe(false);

    expect(diagnostics).toEqual([expectedDiagnostic]);
    expect(diagnostics.join(' ')).not.toContain('secret');
    expect(diagnostics.join(' ')).not.toContain('@');
  });
});
