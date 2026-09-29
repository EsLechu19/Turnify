import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/use-auth';

/**
 * Entry route: sends the user to the auth stack or the app stack depending on
 * the restored session, so neither group needs to duplicate the check.
 */
export default function IndexScreen() {
  const { isRestoring, session } = useAuth();

  if (isRestoring) {
    return null;
  }

  return <Redirect href={session ? '/(app)' : '/(auth)/login'} />;
}
