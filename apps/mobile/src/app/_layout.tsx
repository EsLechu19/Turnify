import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/features/auth/use-auth';
import { useNotificationLifecycle } from '@/features/notifications/use-notification-lifecycle';
import { GuestFlowProvider } from '@/features/public/guest-flow-session';
import { initializeNotificationFoundation } from '@/lib/notifications';

function NotificationLifecycle() {
  useNotificationLifecycle();
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    void initializeNotificationFoundation();
  }, []);

  return (
    <AuthProvider>
      <GuestFlowProvider>
      <NotificationLifecycle />
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(public)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
      </GuestFlowProvider>
    </AuthProvider>
  );
}
