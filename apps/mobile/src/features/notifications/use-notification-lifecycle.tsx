import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerDeviceToken, revokeDeviceToken, type DevicePlatform } from '@/features/notifications/device-token-api';
import {
  registerTokenAfterPermission,
  reportNotificationRegistrationDiagnostic,
} from '@/features/notifications/notification-registration';
import { ticketTargetFromNotificationData } from '@/features/notifications/notification-routing';
import { isPushRuntimeSupported, loadPushModule, type PushModule } from '@/features/notifications/push-runtime';
import { activeGuestTicketRoute } from '@/features/public/public-route-policy';
import { useAuth } from '@/features/auth/use-auth';
import { initializeNotificationFoundation } from '@/lib/notifications';

function configuredProjectId(): string | null {
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  return typeof projectId === 'string' && projectId.trim() ? projectId.trim() : null;
}

type NotificationResponseLike = {
  notification: { request: { content: { data?: unknown } } };
};

function routeNotification(response: NotificationResponseLike): void {
  const target = ticketTargetFromNotificationData(response.notification.request.content.data);
  if (!target) return;

  // The live ticket lives in the public group: it is readable by guests holding
  // a capability, so a push must land there and not inside the guarded `(app)`.
  router.push({
    pathname: activeGuestTicketRoute('llamado'),
    params: {
      ticketId: target.ticketId,
      queueId: target.queueId,
    },
  });
}

/** Registers customer-only notification behavior after authentication is ready. */
export function useNotificationLifecycle(): void {
  const { session, profile, isProfileLoading } = useAuth();
  const isEligibleCustomer = Boolean(session && profile?.role === 'cliente' && !isProfileLoading);

  useEffect(() => {
    if (isProfileLoading || (Platform.OS !== 'android' && Platform.OS !== 'ios')) return;
    if (!isEligibleCustomer) {
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

    async function registerCurrentDevice(): Promise<void> {
      if (!isPushRuntimeSupported()) {
        reportNotificationRegistrationDiagnostic('push_unsupported_runtime');
        return;
      }
      const Notifications: PushModule | null = await loadPushModule();
      if (!active || !Notifications) {
        if (!Notifications) reportNotificationRegistrationDiagnostic('push_unsupported_runtime');
        return;
      }
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

          await registerDeviceToken(token, Platform.OS as DevicePlatform);
          if (active) {
            registeredToken = token;
          } else {
            void revokeDeviceToken(token).catch(() => undefined);
          }
        },
        onDiagnostic: reportNotificationRegistrationDiagnostic,
      });
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
    if (!isEligibleCustomer || !isPushRuntimeSupported()) return;

    let active = true;
    let cleanup: (() => void) | undefined;

    loadPushModule().then((Notifications) => {
      if (!active || !Notifications) return;
      const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
        // Foreground presentation is configured by the notification foundation.
      });
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(routeNotification);

      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) routeNotification(response);
      }).catch(() => undefined);

      cleanup = () => {
        receivedSubscription.remove();
        responseSubscription.remove();
      };
    }).catch(() => undefined);

    return () => {
      active = false;
      cleanup?.();
    };
  }, [isEligibleCustomer]);
}
