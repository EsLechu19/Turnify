import type { AuthProfile } from '@/features/auth/use-auth';

export const publicLaunchRoute = '/' as const;
export const publicShopRoute = '/(public)/shop' as const;
/** Public footer entry begins the invitation-bound worker registration flow. */
export const workerSignInRoute = '/(auth)/worker-register' as const;
export const workerRegistrationRoute = '/(auth)/worker-register' as const;

export function staffLanding(profile: AuthProfile | null): '/(app)/worker' | '/(app)/admin' | '/' {
  if (profile?.role === 'personal' && profile.businessId) return '/(app)/worker';
  if (profile?.role === 'admin' && profile.businessId) return '/(app)/admin';
  return '/';
}

export type WorkerIntentOutcome = 'worker' | 'missing-profile' | 'not-worker' | 'missing-business';

/** Resolves the dedicated worker entry without treating another role as staff. */
export function workerIntentOutcome(profile: AuthProfile | null): WorkerIntentOutcome {
  if (!profile) return 'missing-profile';
  if (profile.role !== 'personal') return 'not-worker';
  return profile.businessId ? 'worker' : 'missing-business';
}

export function canUseGuestTicket(access: { ticketId: string; capability: string } | null): boolean {
  return Boolean(access?.ticketId && access.capability);
}
