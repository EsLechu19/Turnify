import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/features/auth/use-auth';
import { useNotificationLifecycle } from '@/features/notifications/use-notification-lifecycle';
import { GuestFlowProvider } from '@/features/public/guest-flow-session';
import { initializeNotificationFoundation } from '@/lib/notifications';
import { Palette } from '@/constants/theme';

function NotificationLifecycle() {
  useNotificationLifecycle();
  return null;
}

/** Turnify ships in one light appearance; this is the navigation palette. */
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Palette.brand,
    background: Palette.canvas,
    card: Palette.surface,
    text: Palette.ink,
    border: Palette.border,
    notification: Palette.gold,
  },
};

export default function RootLayout() {
  useEffect(() => {
    void initializeNotificationFoundation();
  }, []);

  return (
    <AuthProvider>
      <GuestFlowProvider>
        <NotificationLifecycle />
        <SafeAreaProvider>
          <ThemeProvider value={navigationTheme}>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: Palette.canvas },
              }}
            >
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
