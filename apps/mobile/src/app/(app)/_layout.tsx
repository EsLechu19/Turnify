import { Redirect, Stack, useSegments } from 'expo-router';

import { useAuth } from '@/features/auth/use-auth';
import { appRouteNameFromSegments, roleCanAccessAppRoute } from '@/features/worker/worker-navigation';

/**
 * Guard: only authenticated staff may reach operational routes.
 */
export default function AppLayout() {
  const { isRestoring, session, profile, isProfileLoading } = useAuth();
  const segments = useSegments();

  if (isRestoring) {
    return null;
  }

  if (!session) {
    return <Redirect href="/" />;
  }

  if (isProfileLoading) {
    return null;
  }

  if (!roleCanAccessAppRoute(profile, appRouteNameFromSegments(segments))) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
