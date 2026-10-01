export type NotificationPermission = {
  granted: boolean;
};

export type NotificationRegistrationDiagnostic =
  | 'missing_authenticated_customer_profile'
  | 'expo_project_id_missing'
  | 'android_foundation_failed'
  | 'permission_denied'
  | 'expo_token_acquisition_failed'
  | 'registration_rpc_failed'
  | 'registration_completed';

type NotificationRegistrationDependencies = {
  initializeNotifications(): Promise<void>;
  getPermissions(): Promise<NotificationPermission>;
  requestPermissions(): Promise<NotificationPermission>;
  acquireToken(): Promise<string>;
  registerToken(token: string): Promise<void>;
  onDiagnostic(code: NotificationRegistrationDiagnostic): void;
};

function emitDiagnostic(
  onDiagnostic: NotificationRegistrationDependencies['onDiagnostic'],
  code: NotificationRegistrationDiagnostic,
): void {
  try {
    onDiagnostic(code);
  } catch {
    // Diagnostics must never affect notification registration.
  }
}

/** Emits one token-free diagnostic code only in development builds. */
export function reportNotificationRegistrationDiagnostic(code: NotificationRegistrationDiagnostic): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.info(code);
  }
}

/**
 * Prepares Android's notification channel before permission and token work.
 * A denied permission is expected and deliberately not treated as an error.
 */
export async function registerTokenAfterPermission({
  initializeNotifications,
  getPermissions,
  requestPermissions,
  acquireToken,
  registerToken,
  onDiagnostic,
}: NotificationRegistrationDependencies): Promise<boolean> {
  try {
    await initializeNotifications();
  } catch {
    emitDiagnostic(onDiagnostic, 'android_foundation_failed');
    return false;
  }

  try {
    const existingPermission = await getPermissions();
    const permission = existingPermission.granted ? existingPermission : await requestPermissions();
    if (!permission.granted) {
      emitDiagnostic(onDiagnostic, 'permission_denied');
      return false;
    }
  } catch {
    emitDiagnostic(onDiagnostic, 'permission_denied');
    return false;
  }

  let token: string;
  try {
    token = await acquireToken();
  } catch {
    emitDiagnostic(onDiagnostic, 'expo_token_acquisition_failed');
    return false;
  }

  try {
    await registerToken(token);
  } catch {
    emitDiagnostic(onDiagnostic, 'registration_rpc_failed');
    return false;
  }

  emitDiagnostic(onDiagnostic, 'registration_completed');
  return true;
}
