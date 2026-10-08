/**
 * The root route renders the demo login. The old public welcome screen
 * ("Tu turno empieza aquí" with QR/code entry and the personal-access footer)
 * was removed: the app entry point is now the single login with its
 * Cliente/Empleado shortcuts, and `/(app)` covers the customer surfaces.
 *
 * Keeping the route as an alias (instead of deleting the file) preserves the
 * typed `/` route used by `publicLaunchRoute`.
 */
export { default } from './(auth)/login';
