import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ANDROID_CHANNEL_ID = 'ticket-updates';

let initialization: Promise<void> | undefined;

async function configureNotificationFoundation(): Promise<void> {
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
      name: 'Ticket updates',
      importance: Notifications.AndroidImportance.HIGH,
    });
  } catch {
    // Native notification APIs are unavailable in unsupported runtimes.
  }
}

/**
 * Configures local notification presentation without requesting permissions,
 * registering a device, or sending notifications.
 */
export function initializeNotificationFoundation(): Promise<void> {
  initialization ??= configureNotificationFoundation();
  return initialization;
}
