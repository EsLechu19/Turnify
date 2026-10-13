import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getSupabase } from '@/lib/supabase';
import { initializeNotificationFoundation } from '@/lib/notifications';
import { isPushRuntimeSupported, loadPushModule } from './push-runtime';
import { registerTokenAfterPermission, reportNotificationRegistrationDiagnostic } from './notification-registration';

const MAX_DEVICE_TOKEN_LENGTH = 4096;

function configuredProjectId(): string | null {
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  return typeof projectId === 'string' && projectId.trim() ? projectId.trim() : null;
}

/**
 * Binds the current device to an account-less ticket so the llamado push can
 * find it. The capability proves ticket ownership and is never stored.
 */
export async function registerGuestDevice(token: string, ticketId: string, capability: string): Promise<void> {
  const normalized = token.trim();
  if (!normalized || normalized.length > MAX_DEVICE_TOKEN_LENGTH) {
    throw new Error('Invalid device token.');
  }

  const { error } = await getSupabase().rpc('registrar_dispositivo_invitado', {
    p_push_token: normalized,
    p_ticket_id: ticketId,
    p_capacidad: capability,
  });

  if (error) {
    throw new Error('Unable to register this device for call alerts.');
  }
}

export async function revokeGuestDevice(token: string, ticketId: string, capability: string): Promise<void> {
  const { error } = await getSupabase().rpc('revocar_dispositivo_invitado', {
    p_push_token: token.trim(),
    p_ticket_id: ticketId,
    p_capacidad: capability,
  });

  if (error) {
    throw new Error('Unable to revoke this device from call alerts.');
  }
}

/**
 * Best-effort guest registration at ticket-confirm time: permission, token,
 * binding. Never throws and never blocks navigation — a missing push falls
 * back to the in-app polling the ticket screen already runs.
 */
export async function registerGuestDeviceForTicket(ticketId: string, capability: string): Promise<boolean> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false;
  if (!isPushRuntimeSupported()) return false;

  const projectId = configuredProjectId();
  if (!projectId) {
    reportNotificationRegistrationDiagnostic('expo_project_id_missing');
    return false;
  }

  const Notifications = await loadPushModule();
  if (!Notifications) return false;

  return registerTokenAfterPermission({
    initializeNotifications: initializeNotificationFoundation,
    getPermissions: Notifications.getPermissionsAsync,
    requestPermissions: Notifications.requestPermissionsAsync,
    acquireToken: async () => (await Notifications.getExpoPushTokenAsync({ projectId })).data,
    registerToken: (token) => registerGuestDevice(token, ticketId, capability),
    onDiagnostic: reportNotificationRegistrationDiagnostic,
  });
}
