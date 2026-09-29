import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/features/auth/use-auth';

/**
 * Guard: a signed-out user never reaches the app stack.
 */
export default function AppLayout() {
  const { isRestoring, session } = useAuth();

  if (isRestoring) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
