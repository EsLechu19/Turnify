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
import { getSupabase, isSupabaseConfigured } from './supabase';
import * as live from './live';

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

export interface AuthRepository {
  signIn(email: string, password: string): Promise<SignInResult>;
  restore(): Promise<AuthSession | null>;
  signOut(): void;
}

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

const SESSION_KEY = 'turnify.panel.session';

function persist(session: AuthSession): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* session stays in memory only */
  }
}

function forget(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable (private mode); the in-memory session still drops */
  }
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
  async signIn(email, password) {
    if (!isSupabaseConfigured()) {
      return { ok: false, message: 'El panel no está disponible: falta configurar Supabase.' };
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session) {
      return { ok: false, message: translateSupabaseAuthError(error?.message) };
    }

    const profile = await fetchOwnPanelProfile(data.session.user.id);

    if (!profile || (profile.rol !== 'admin' && profile.rol !== 'personal')) {
      await supabase.auth.signOut();
      return { ok: false, message: 'Esta cuenta no tiene acceso al panel.' };
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
    if (isSupabaseConfigured()) void getSupabase().auth.signOut();
  },
};
