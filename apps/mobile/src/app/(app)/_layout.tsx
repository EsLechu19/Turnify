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
  const { isRestoring, session, profile, isProfileLoading } = useAuth();
  const segments = useSegments();

  if (isRestoring) {
    return null;
  }

  if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
    return <Stack screenOptions={{ headerShown: false }} />;
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

  return <Stack screenOptions={{ headerShown: false }} />;
}
