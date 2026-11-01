/**
 * Data boundary for the panel.
 *
 * Features consume these ports rather than Supabase calls directly. The
 * implementations below always return Supabase-backed operational data.
 */

import type {
  ActivityEvent,
  AuthSession,
  HistoryRecord,
  QueueSummary,
  QueueTicket,
  ServiceMixItem,
  ServiceRecord,
  StaffRecord,
  TeamMember,
} from './types';
import { authStorage, PANEL_SESSION_KEY } from './authStorage';
import { getSupabase, getSupabaseStorageKey, isSupabaseConfigured } from './supabase';
import * as live from './live';
import { buildPasswordResetRedirectUrl, translateRecoveryError } from '../features/auth/passwordRecovery';

export interface BranchLocation {
  name: string;
  city: string;
  code: string;
  slug: string;
  accessCode: string;
}

export interface BusinessProfile {
  name: string;
  subtitle: string;
  branch: string;
  /** Public ticket link shown by the branch QR code. */
  ticketUrl: string;
  /** Short code a customer reads out at the counter. */
  accessCode: string;
  owner: string;
  ownerEmail: string;
  today: string;
}

export interface PanelRepository {
  business(): Promise<BusinessProfile>;
  branch(): Promise<BranchLocation>;
  queues(): Promise<QueueSummary[]>;
  tickets(): Promise<QueueTicket[]>;
  team(): Promise<TeamMember[]>;
  activity(): Promise<ActivityEvent[]>;
  serviceMix(): Promise<ServiceMixItem[]>;
}

export interface ServiceRepository {
  list(): Promise<ServiceRecord[]>;
  create(input: live.ServiceInput): Promise<ServiceRecord>;
  update(id: string, input: live.ServiceInput): Promise<ServiceRecord>;
  remove(id: string): Promise<void>;
}

export interface StaffRepository {
  list(): Promise<StaffRecord[]>;
}

export interface HistoryRepository {
  list(): Promise<HistoryRecord[]>;
}

export type SignInResult =
  | { ok: true; session: AuthSession }
  | { ok: false; message: string };

export type SignUpResult =
  | { ok: true; session: AuthSession | null }
  | { ok: false; message: string };

export interface AuthRepository {
  signIn(email: string, password: string, rememberMe?: boolean): Promise<SignInResult>;
  signUp(email: string, password: string, name: string, businessName?: string): Promise<SignUpResult>;
  restore(): Promise<AuthSession | null>;
  signOut(): void;
  requestPasswordReset(email: string): Promise<PasswordRecoveryResult>;
}

export type PasswordRecoveryResult = { ok: true } | { ok: false; message: string };

export const panelRepository: PanelRepository = {
  business: live.fetchBusiness,
  branch: live.fetchBranch,
  queues: live.fetchQueues,
  tickets: live.fetchTickets,
  team: live.fetchTeam,
  activity: live.fetchActivity,
  serviceMix: live.fetchServiceMix,
};

export const serviceRepository: ServiceRepository = {
  list: live.fetchServices,
  create: (input) => live.createServiceRecord(input),
  update: (id, input) => live.updateServiceRecord(id, input),
  remove: (id) => live.removeServiceRecord(id),
};

export const staffRepository: StaffRepository = {
  list: live.fetchStaff,
};

export const historyRepository: HistoryRepository = {
  list: live.fetchHistory,
};

function persist(session: AuthSession): void {
  authStorage.storageAdapter.setItem(PANEL_SESSION_KEY, JSON.stringify(session));
}

function forget(): void {
  authStorage.storageAdapter.removeItem(PANEL_SESSION_KEY);
}

type PanelProfile = { nombre: string | null; rol: 'cliente' | 'admin' | 'personal' };

function translateSupabaseAuthError(message: string | undefined): string {
  const normalized = (message ?? '').toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (normalized.includes('email not confirmed')) return 'Confirma tu correo antes de entrar al panel.';
  if (normalized.includes('network') || normalized.includes('fetch')) return 'No pudimos conectar con el servidor. Revisa tu conexión.';
  return 'No pudimos iniciar sesión. Intenta de nuevo.';
}

async function fetchOwnPanelProfile(userId: string): Promise<PanelProfile | null> {
  const { data, error } = await getSupabase()
    .from('perfiles')
    .select('nombre,rol')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PanelProfile;
}

function toPanelSession(email: string, profile: PanelProfile): AuthSession {
  return {
    user: {
      email,
      name: profile.nombre?.trim() || email.split('@')[0] || 'Administrador',
      role: profile.rol === 'admin' ? 'admin' : 'barbero',
    },
    issuedAt: new Date().toISOString(),
  };
}

/**
 * Panel auth uses Supabase. Only `admin` and `personal` profiles enter;
 * `cliente` has no panel.
 */
export const authRepository: AuthRepository = {
  async requestPasswordReset(email) {
    if (!isSupabaseConfigured()) {
      return { ok: false, message: 'El panel no está disponible: falta configurar Supabase.' };
    }
    const redirectTo = buildPasswordResetRedirectUrl(window.location.origin);
    if (!redirectTo) return { ok: false, message: 'No pudimos preparar el enlace de recuperación.' };

    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectTo });
      if (error) return { ok: false, message: translateRecoveryError(error.message) };
      return { ok: true };
    } catch (error) {
      return { ok: false, message: translateRecoveryError(error instanceof Error ? error.message : undefined) };
    }
  },

  async signIn(email, password, rememberMe = true) {
    if (!isSupabaseConfigured()) {
      return { ok: false, message: 'El panel no está disponible: falta configurar Supabase.' };
    }

    const storageKey = getSupabaseStorageKey();
    authStorage.setManagedKeys([...(storageKey ? [storageKey] : []), PANEL_SESSION_KEY]);
    if (!authStorage.setPersistenceMode(rememberMe ? 'persistent' : 'session')) {
      return {
        ok: false,
        message: 'No pudimos cambiar la duración de la sesión en este navegador. Revisa su configuración de almacenamiento.',
      };
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session) {
      return { ok: false, message: translateSupabaseAuthError(error?.message) };
    }

    await live.completeBusinessOnboarding();
    const profile = await fetchOwnPanelProfile(data.session.user.id);

    if (!profile || (profile.rol !== 'admin' && profile.rol !== 'personal')) {
      await supabase.auth.signOut();
      return { ok: false, message: 'Esta cuenta no tiene acceso al panel.' };
    }

    const session = toPanelSession(data.session.user.email ?? email.trim(), profile);
    persist(session);
    return { ok: true, session };
  },

  async signUp(email, password, name, businessName) {
    if (!isSupabaseConfigured()) {
      return { ok: false, message: 'El panel no está disponible: falta configurar Supabase.' };
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nombre: name.trim(), empresa_nombre: businessName?.trim() || null } },
    });

    if (error) {
      return { ok: false, message: translateSupabaseAuthError(error.message) };
    }

    if (!data.session) {
      return { ok: true, session: null };
    }

    await live.completeBusinessOnboarding();
    const profile = await fetchOwnPanelProfile(data.session.user.id);

    if (!profile) {
      await supabase.auth.signOut();
      return { ok: false, message: 'No pudimos crear tu perfil. Intenta de nuevo.' };
    }

    const session = toPanelSession(data.session.user.email ?? email.trim(), profile);
    persist(session);
    return { ok: true, session };
  },

  async restore() {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      forget();
      return null;
    }

    const profile = await fetchOwnPanelProfile(data.session.user.id);

    if (!profile || (profile.rol !== 'admin' && profile.rol !== 'personal')) {
      await supabase.auth.signOut();
      forget();
      return null;
    }

    const session = toPanelSession(data.session.user.email ?? '', profile);
    persist(session);
    return session;
  },

  signOut() {
    forget();
    if (isSupabaseConfigured()) {
      void getSupabase().auth.signOut().catch(() => undefined).finally(() => {
        authStorage.clearManagedSessions();
      });
    } else {
      authStorage.clearManagedSessions();
    }
  },
};
