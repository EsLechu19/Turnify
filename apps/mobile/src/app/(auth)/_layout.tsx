import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/features/auth/use-auth';

/**
 * Guard: an authenticated user never stays on the auth stack.
 */
export default function AuthLayout() {
  const { isRestoring, session } = useAuth();

  if (isRestoring) {
    return null;
  }

  if (session) {
    return <Redirect href="/(app)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
