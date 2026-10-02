import { Redirect, Stack, useSegments } from 'expo-router';

import { useAuth } from '@/features/auth/use-auth';
import { appRouteNameFromSegments, roleCanAccessAppRoute } from '@/features/worker/worker-navigation';

/**
 * Guard: a signed-out user never reaches the app stack.
 */
export default function AppLayout() {
  const { isRestoring, session, profile, isProfileLoading } = useAuth();
  const segments = useSegments();

  if (isRestoring) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isProfileLoading) {
    return null;
  }

  if (profile && !roleCanAccessAppRoute(profile.role, appRouteNameFromSegments(segments))) {
    return <Redirect href="/(app)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
