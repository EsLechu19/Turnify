import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/use-auth';
import { staffLanding } from '@/features/public/public-route-policy';

/**
 * Entry point of the authenticated app group.
 *
 * `(app)/_layout` already sends barbers and admins to their own landing, so only
 * a signed-in customer reaches this screen. Their history is the closest thing
 * to a home, so that is where they land.
 */
export default function AppIndexScreen() {
  const { profile, isProfileLoading } = useAuth();

  if (isProfileLoading) {
    return null;
  }

  if (profile?.role === 'personal' || profile?.role === 'admin') {
    return <Redirect href={staffLanding(profile)} />;
  }

  return <Redirect href="/(app)/history" />;
}