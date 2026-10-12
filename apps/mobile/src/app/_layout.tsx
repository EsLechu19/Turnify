import { DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/features/auth/use-auth';
import { useNotificationLifecycle } from '@/features/notifications/use-notification-lifecycle';
import { GuestFlowProvider } from '@/features/public/guest-flow-session';
import { prefetchCustomerLocation } from '@/features/location/customer-location';
import { initializeNotificationFoundation } from '@/lib/notifications';
import { Palette } from '@/constants/theme';

function AuthNavigationBoundary() {
  const { isSigningOut } = useAuth();

  useEffect(() => {
    if (isSigningOut) {
      router.replace('/(auth)/login');
    }
  }, [isSigningOut]);

  return null;
}

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
    if (process.env.EXPO_PUBLIC_SKIP_AUTH === '1') return;
    void prefetchCustomerLocation();
  }, []);

  return (
    <AuthProvider>
      <AuthNavigationBoundary />
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
              <Stack.Screen name="index" />
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
