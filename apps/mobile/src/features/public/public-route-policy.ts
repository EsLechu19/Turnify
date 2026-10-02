import type { AuthProfile } from '@/features/auth/use-auth';

export const publicLaunchRoute = '/' as const;
export const publicShopRoute = '/(public)/shop' as const;

export function staffLanding(profile: AuthProfile | null): '/(app)/worker' | '/(app)/admin' | '/' {
  if (profile?.role === 'personal' && profile.businessId) return '/(app)/worker';
  if (profile?.role === 'admin' && profile.businessId) return '/(app)/admin';
  return '/';
}

export function canUseGuestTicket(access: { ticketId: string; capability: string } | null): boolean {
  return Boolean(access?.ticketId && access.capability);
}
