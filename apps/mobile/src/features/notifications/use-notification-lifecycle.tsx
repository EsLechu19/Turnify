import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerDeviceToken, revokeDeviceToken, registerGuestDeviceToken, revokeGuestDeviceToken, type DevicePlatform } from '@/features/notifications/device-token-api';
import {
  registerTokenAfterPermission,
  reportNotificationRegistrationDiagnostic,
} from '@/features/notifications/notification-registration';
import { ticketTargetFromNotificationData } from '@/features/notifications/notification-routing';
import { useAuth } from '@/features/auth/use-auth';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { initializeNotificationFoundation } from '@/lib/notifications';

function configuredProjectId(): string | null {
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  return typeof projectId === 'string' && projectId.trim() ? projectId.trim() : null;
}

/** Registers notification behavior for authenticated customers or public guests. */
export function useNotificationLifecycle(): void {
  const { session, profile, isProfileLoading } = useAuth();
  const { ticketAccess } = useGuestFlow();

  const isEligibleCustomer = Boolean(session && profile?.role === 'cliente' && !isProfileLoading);
  const isEligibleGuest = Boolean(ticketAccess);

  useEffect(() => {
    if (isProfileLoading || (Platform.OS !== 'android' && Platform.OS !== 'ios')) return;
    if (!isEligibleCustomer && !isEligibleGuest) {
      reportNotificationRegistrationDiagnostic('missing_authenticated_customer_profile');
      return;
    }

    const projectId = configuredProjectId();
    if (!projectId) {
      reportNotificationRegistrationDiagnostic('expo_project_id_missing');
      return;
    }
    const registrationProjectId = projectId;

    let active = true;
    let registeredToken: string | null = null;
    let registeredGuestAccess = ticketAccess;

    async function registerCurrentDevice(): Promise<void> {
      await registerTokenAfterPermission({
        initializeNotifications: initializeNotificationFoundation,
        getPermissions: Notifications.getPermissionsAsync,
        requestPermissions: Notifications.requestPermissionsAsync,
        acquireToken: async () => {
          if (!active) throw new Error();
          return (await Notifications.getExpoPushTokenAsync({ projectId: registrationProjectId })).data;
        },
        registerToken: async (token) => {
          if (!active) return;

          if (isEligibleCustomer) {
            await registerDeviceToken(token, Platform.OS as DevicePlatform);
          } else if (ticketAccess) {
            await registerGuestDeviceToken(ticketAccess, token, Platform.OS as DevicePlatform);
          }

          if (active) {
            registeredToken = token;
          } else {
            if (isEligibleCustomer) {
              void revokeDeviceToken(token).catch(() => undefined);
            } else if (registeredGuestAccess) {
              void revokeGuestDeviceToken(registeredGuestAccess, token).catch(() => undefined);
            }
          }
        },
        onDiagnostic: reportNotificationRegistrationDiagnostic,
      });
    }

    void registerCurrentDevice();

    return () => {
      active = false;
      if (registeredToken) {
        if (isEligibleCustomer) {
          void revokeDeviceToken(registeredToken).catch(() => undefined);
        } else if (registeredGuestAccess) {
          void revokeGuestDeviceToken(registeredGuestAccess, registeredToken).catch(() => undefined);
        }
      }
    };
  }, [isEligibleCustomer, isEligibleGuest, ticketAccess, isProfileLoading]);

  useEffect(() => {
    if (!isEligibleCustomer && !isEligibleGuest) return;

    function routeNotification(response: Notifications.NotificationResponse): void {
      const target = ticketTargetFromNotificationData(response.notification.request.content.data);
      if (!target) return;

      if (isEligibleCustomer) {
        router.push(
          `/(app)/ticket?ticketId=${encodeURIComponent(target.ticketId)}&queueId=${encodeURIComponent(target.queueId)}` as Href,
        );
      } else {
        router.push(`/(public)/ticket` as Href);
      }
    }

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
  }, [isEligibleCustomer, isEligibleGuest]);
}
