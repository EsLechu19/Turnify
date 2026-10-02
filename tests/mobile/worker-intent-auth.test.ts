import { describe, expect, it } from 'vitest';

import { workerIntentOutcome, workerRegistrationRoute, workerSignInRoute } from '../../apps/mobile/src/features/public/public-route-policy';
import { roleCanAccessAppRoute } from '../../apps/mobile/src/features/worker/worker-navigation';

describe('worker intent authentication', () => {
  it('opens worker registration directly from the public footer', () => {
    expect(workerSignInRoute).toBe('/(auth)/worker-register');
    expect(workerRegistrationRoute).toBe('/(auth)/worker-register');
  });

  it('routes only an associated personal profile to the worker lifecycle', () => {
    expect(workerIntentOutcome({ role: 'personal', businessId: 'shop' })).toBe('worker');
    expect(workerIntentOutcome({ role: 'personal', businessId: null })).toBe('missing-business');
  });

  it('denies admin and missing profiles instead of treating them as workers', () => {
    expect(workerIntentOutcome({ role: 'admin', businessId: 'shop' })).toBe('not-worker');
    expect(workerIntentOutcome(null)).toBe('missing-profile');
    expect(roleCanAccessAppRoute(undefined, 'worker')).toBe(false);
    expect(roleCanAccessAppRoute({ role: 'admin', businessId: 'shop' }, 'worker')).toBe(false);
  });

  it('preserves the worker lifecycle destinations for a valid personal account', () => {
    const worker = { role: 'personal' as const, businessId: 'shop' };

    expect(roleCanAccessAppRoute(worker, 'worker')).toBe(true);
    expect(roleCanAccessAppRoute(worker, 'worker-queue')).toBe(true);
    expect(roleCanAccessAppRoute(worker, 'worker-profile')).toBe(true);
  });

  it('blocks direct worker navigation for an unassociated personal profile', () => {
    const unassociatedWorker = { role: 'personal' as const, businessId: null };

    expect(roleCanAccessAppRoute(unassociatedWorker, 'worker')).toBe(false);
    expect(roleCanAccessAppRoute(unassociatedWorker, 'worker-queue')).toBe(false);
    expect(roleCanAccessAppRoute(unassociatedWorker, 'worker-history')).toBe(false);
    expect(roleCanAccessAppRoute(unassociatedWorker, 'worker-profile')).toBe(false);
  });
});
