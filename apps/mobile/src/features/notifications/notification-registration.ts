export type NotificationPermission = {
  granted: boolean;
};

type NotificationRegistrationDependencies = {
  initializeNotifications(): Promise<void>;
  getPermissions(): Promise<NotificationPermission>;
  requestPermissions(): Promise<NotificationPermission>;
  registerToken(): Promise<void>;
};

/**
 * Prepares Android's notification channel before permission and token work.
 * A denied permission is expected and deliberately not treated as an error.
 */
export async function registerTokenAfterPermission({
  initializeNotifications,
  getPermissions,
  requestPermissions,
  registerToken,
}: NotificationRegistrationDependencies): Promise<boolean> {
  await initializeNotifications();

  const existingPermission = await getPermissions();
  const permission = existingPermission.granted ? existingPermission : await requestPermissions();
  if (!permission.granted) return false;

  await registerToken();
  return true;
}
