import { Redirect, Stack, useSegments } from 'expo-router';

import { useAuth } from '@/features/auth/use-auth';
import { staffLanding } from '@/features/public/public-route-policy';
import { appRouteNameFromSegments, roleCanAccessAppRoute } from '@/features/worker/worker-navigation';

/**
 * Guard: only customers and barbers may reach the authenticated app group.
 * Administration lives in the web panel, so anyone else goes back to the public
 * launch via `staffLanding`.
 */
export default function AppLayout() {
  const { isRestoring, isSigningOut, session, profile, isProfileLoading } = useAuth();
  const segments = useSegments();

  if (isRestoring) {
    return null;
  }

  if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
    return <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 200 }} />;
  }

  if (isSigningOut) {
    return null;
  }

  if (!session) {
    return <Redirect href="/" />;
  }

  if (isProfileLoading) {
    return null;
  }

  if (!roleCanAccessAppRoute(profile, appRouteNameFromSegments(segments))) {
    return <Redirect href={staffLanding(profile)} />;
  }

  // Lateral tab-level destinations: fade avoids a false forward hierarchy
  // and keeps replace-based navigation instant-feeling.
  return <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 200 }} />;
}
