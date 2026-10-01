import { describe, expect, it, vi } from 'vitest';

import { registerTokenAfterPermission } from '../../apps/mobile/src/features/notifications/notification-registration';

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

    const registration = registerTokenAfterPermission({
      initializeNotifications: async () => {
        steps.push('initialize');
        await initialized;
      },
      getPermissions,
      requestPermissions,
      registerToken,
    });

    await Promise.resolve();
    expect(steps).toEqual(['initialize']);
    expect(getPermissions).not.toHaveBeenCalled();

    releaseInitialization?.();

    await expect(registration).resolves.toBe(true);
    expect(steps).toEqual(['initialize', 'get-permissions', 'request-permissions', 'register-token']);
  });

  it('does not register or report an error when permission is denied', async () => {
    const registerToken = vi.fn(async () => undefined);

    await expect(registerTokenAfterPermission({
      initializeNotifications: async () => undefined,
      getPermissions: async () => ({ granted: false }),
      requestPermissions: async () => ({ granted: false }),
      registerToken,
    })).resolves.toBe(false);

    expect(registerToken).not.toHaveBeenCalled();
  });
});
