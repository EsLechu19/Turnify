import { Redirect, Stack, useSegments } from 'expo-router';

import { useAuth } from '@/features/auth/use-auth';
import { staffLanding } from '@/features/public/public-route-policy';

/**
 * Guard: an authenticated user never stays on the auth stack.
 */
export default function AuthLayout() {
  const { isRestoring, session, profile, isProfileLoading } = useAuth();
  const segments = useSegments();
  const isWorkerIntentRoute = /worker-(access|register)/.test(segments.join('/'));

  if (isRestoring) {
    return null;
  }

  if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
    return <Redirect href="/(app)/worker" />;
  }

  if (session && isProfileLoading) {
    return null;
  }

  if (session && !isWorkerIntentRoute) {
    return <Redirect href={staffLanding(profile)} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
