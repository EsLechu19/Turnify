import type { AuthProfile } from '@/features/auth/use-auth';

export const publicLaunchRoute = '/' as const;
export const publicShopRoute = '/(public)/shop' as const;
/** The prescribed guest booking progression after QR/code shop discovery. */
export const publicBookingRoutes = [
  '/(public)/shop',
  '/(public)/service',
  '/(public)/barber',
  '/(public)/details',
  '/(public)/ticket',
] as const;
/** Public footer entry resolves to the single static login screen. */
export const workerSignInRoute = '/(auth)/login' as const;
/** Sign-up screen reachable from the login footer. */
export const customerRegistrationRoute = '/(auth)/register' as const;

/**
 * Where each role lands after signing in.
 *
 * Administration is handled in the web panel, so an owner opening the mobile app
 * goes back to the public launch instead of a screen this app no longer has.
 */
export function staffLanding(profile: AuthProfile | null): '/(app)/worker' | '/(app)/worker-shops' | '/' {
  if (profile?.role === 'personal' && profile.businessId) return '/(app)/worker';
  if (profile?.role === 'personal') return '/(app)/worker-shops';
  return '/';
}

export type WorkerIntentOutcome = 'worker' | 'worker-shops' | 'missing-profile' | 'not-worker';

/** Resolves the dedicated worker entry without treating another role as staff. */
export function workerIntentOutcome(profile: AuthProfile | null): WorkerIntentOutcome {
  if (!profile) return 'missing-profile';
  if (profile.role !== 'personal') return 'not-worker';
  return profile.businessId ? 'worker' : 'worker-shops';
}

export function canUseGuestTicket(access: { ticketId: string; capability: string } | null): boolean {
  return Boolean(access?.ticketId && access.capability);
}

export type GuestTicketStatus = 'en_espera' | 'notificado' | 'llamado' | 'en_atencion' | 'finalizado' | 'cancelado' | 'ausente';

export function isActiveGuestTicketStatus(status: GuestTicketStatus): boolean {
  return status === 'en_espera' || status === 'notificado' || status === 'llamado' || status === 'en_atencion';
}

export function isTerminalGuestTicketStatus(status: GuestTicketStatus): boolean {
  return !isActiveGuestTicketStatus(status);
}

/** Called tickets retain their existing alert presentation on the live ticket route. */
export function activeGuestTicketRoute(_status: GuestTicketStatus): '/(public)/ticket' {
  return '/(public)/ticket';
}
