import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerDeviceToken, revokeDeviceToken, type DevicePlatform } from '@/features/notifications/device-token-api';
import { ticketTargetFromNotificationData } from '@/features/notifications/notification-routing';
import { useAuth } from '@/features/auth/use-auth';

function configuredProjectId(): string | null {
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  return typeof projectId === 'string' && projectId.trim() ? projectId.trim() : null;
}

function routeNotification(response: Notifications.NotificationResponse): void {
  const target = ticketTargetFromNotificationData(response.notification.request.content.data);
  if (!target) return;

  router.push(
    `/(app)/ticket?ticketId=${encodeURIComponent(target.ticketId)}&queueId=${encodeURIComponent(target.queueId)}` as Href,
  );
}

/** Registers customer-only notification behavior after authentication is ready. */
export function useNotificationLifecycle(): void {
  const { session, profile, isProfileLoading } = useAuth();
  const isEligibleCustomer = Boolean(session && profile?.role === 'cliente' && !isProfileLoading);

  useEffect(() => {
    if (!isEligibleCustomer || (Platform.OS !== 'android' && Platform.OS !== 'ios')) return;

    const projectId = configuredProjectId();
    if (!projectId) return;
    const registrationProjectId = projectId;

    let active = true;
    let registeredToken: string | null = null;

    async function registerCurrentDevice(): Promise<void> {
      try {
        const existingPermission = await Notifications.getPermissionsAsync();
        const permission = existingPermission.granted
          ? existingPermission
          : await Notifications.requestPermissionsAsync();
        if (!active || !permission.granted) return;

        const token = (await Notifications.getExpoPushTokenAsync({ projectId: registrationProjectId })).data;
        if (!active) return;

        await registerDeviceToken(token, Platform.OS as DevicePlatform);
        if (active) {
          registeredToken = token;
        } else {
          void revokeDeviceToken(token).catch(() => undefined);
        }
      } catch {
        // Permission, token, and registration failures must not block the app.
      }
    }

    void registerCurrentDevice();

    return () => {
      active = false;
      if (registeredToken) {
        void revokeDeviceToken(registeredToken).catch(() => undefined);
      }
    };
  }, [isEligibleCustomer]);

  useEffect(() => {
    if (!isEligibleCustomer) return;

    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      // Foreground presentation is configured by the notification foundation.
    });
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(routeNotification);

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) routeNotification(response);
    }).catch(() => undefined);

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [isEligibleCustomer]);
}
