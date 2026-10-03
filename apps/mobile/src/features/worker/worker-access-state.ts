import type { AuthProfile } from '@/features/auth/use-auth';

export type WorkerAccessState = 'resolving' | 'approved' | 'awaiting-assignment' | 'missing-profile' | 'denied';

/**
 * Client navigation may use only the server-resolved selected membership context.
 * Worker RPCs independently enforce that membership and shop scope on the server.
 */
export function resolveWorkerAccessState(profile: AuthProfile | null, isProfileLoading: boolean): WorkerAccessState {
  if (isProfileLoading) return 'resolving';
  if (!profile) return 'missing-profile';
  if (profile.role !== 'personal') return 'denied';
  return profile.businessId ? 'approved' : 'awaiting-assignment';
}

export function validateWorkerCredentials(email: string, password: string): string | null {
  if (!email.trim() || !password) return 'Ingresa tu correo y contraseña.';
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Ingresa un correo válido.';
  return null;
}

export function validateWorkerRegistration(name: string, email: string, password: string): string | null {
  if (!name.trim()) return 'Ingresa tu nombre.';
  const credentialsError = validateWorkerCredentials(email, password);
  if (credentialsError) return credentialsError;
  if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  return null;
}
