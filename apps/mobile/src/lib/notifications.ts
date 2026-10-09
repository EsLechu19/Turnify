import { Platform } from 'react-native';

import { loadPushModule } from '@/features/notifications/push-runtime';

const ANDROID_CHANNEL_ID = 'ticket-updates';

let initialization: Promise<void> | undefined;

async function configureNotificationFoundation(): Promise<void> {
  const Notifications = await loadPushModule();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Actualizaciones de turnos',
      importance: Notifications.AndroidImportance.HIGH,
    });
  } catch {
    // Native notification APIs are unavailable in unsupported runtimes.
  }
}

/**
 * Configures local notification presentation without requesting permissions,
 * registering a device, or sending notifications. Resolves silently where push
 * is unsupported (Expo Go).
 */
export function initializeNotificationFoundation(): Promise<void> {
  initialization ??= configureNotificationFoundation();
  return initialization;
}
