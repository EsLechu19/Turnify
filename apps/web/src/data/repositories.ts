/**
 * Data boundary for the panel.
 *
 * Features never import from `data/mocks` directly: they go through these
 * ports. Today the implementation reads fixtures; swapping in Supabase means
 * replacing the bodies below (and awaiting them) without touching a single
 * feature, because the interfaces already describe the read model.
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
import { business, branchAccessCode, branchLocation, branchSlug, initialActivity, initialTeam, initialTickets, queues, serviceMix } from './mocks/panel';
import { mockAccounts } from './mocks/accounts';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { initialServices } from './mocks/services';
import { initialStaff } from './mocks/staff';
import { initialHistory } from './mocks/history';
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
  save(service: ServiceRecord): ServiceRecord;
  remove(id: string): void;
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

/**
 * Read ports: live Supabase when configured, fixtures otherwise. Writes
 * (`save`/`remove`, page-local staff edits) stay local until S2b, which owns
 * the missing backend counterparts (invitations, shifts, stations).
 */
export const panelRepository: PanelRepository = {
  business: () => (isSupabaseConfigured() ? live.fetchBusiness() : Promise.resolve(business)),
  branch: () =>
    isSupabaseConfigured()
      ? live.fetchBranch()
      : Promise.resolve({
        name: branchLocation.name,
        city: branchLocation.city,
        code: branchLocation.code,
        slug: branchSlug,
        accessCode: branchAccessCode,
      }),
  queues: () => (isSupabaseConfigured() ? live.fetchQueues() : Promise.resolve(queues)),
  tickets: () => (isSupabaseConfigured() ? live.fetchTickets() : Promise.resolve(initialTickets)),
  team: () => (isSupabaseConfigured() ? live.fetchTeam() : Promise.resolve(initialTeam)),
  activity: () => (isSupabaseConfigured() ? live.fetchActivity() : Promise.resolve(initialActivity)),
  serviceMix: () => (isSupabaseConfigured() ? live.fetchServiceMix() : Promise.resolve(serviceMix)),
};

export const serviceRepository: ServiceRepository = {
  list: () => (isSupabaseConfigured() ? live.fetchServices() : Promise.resolve(initialServices)),
  save: (service) => service,
  remove: () => undefined,
};

export const staffRepository: StaffRepository = {
  list: () => (isSupabaseConfigured() ? live.fetchStaff() : Promise.resolve(initialStaff)),
};

export const historyRepository: HistoryRepository = {
  list: () => (isSupabaseConfigured() ? live.fetchHistory() : Promise.resolve(initialHistory)),
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

/**
 * Demo auth without backend: matches the demo accounts and keeps the session
 * in `localStorage`. Only used while Supabase is not configured.
 */
async function mockSignIn(email: string, password: string): Promise<SignInResult> {
  const account = mockAccounts.find(
    (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase(),
  );

  if (!account || account.password !== password) {
    return { ok: false, message: 'Correo o contraseña incorrectos.' };
  }

  const session: AuthSession = {
    user: { email: account.email, name: account.name, role: account.role },
    issuedAt: new Date().toISOString(),
  };

  persist(session);
  return { ok: true, session };
}

function mockRestore(): Promise<AuthSession | null> {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return Promise.resolve(raw ? (JSON.parse(raw) as AuthSession) : null);
  } catch {
    return Promise.resolve(null);
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
 * Panel auth: Supabase when configured, demo accounts otherwise.
 * Only `admin` and `personal` profiles enter; `cliente` has no panel.
 */
export const authRepository: AuthRepository = {
  async signIn(email, password) {
    if (!isSupabaseConfigured()) return mockSignIn(email, password);

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
    if (!isSupabaseConfigured()) return mockRestore();

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