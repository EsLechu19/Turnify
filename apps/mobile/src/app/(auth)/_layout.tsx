import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/features/auth/use-auth';
import { staffLanding } from '@/features/public/public-route-policy';

/**
 * Guard: an authenticated user never stays on the auth stack.
 */
export default function AuthLayout() {
  const { isRestoring, session, profile, isProfileLoading } = useAuth();

  if (isRestoring) {
    return null;
  }

  if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  if (session && isProfileLoading) {
    return null;
  }

  if (session) {
    return <Redirect href={staffLanding(profile)} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
