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
import { initialServices } from './mocks/services';
import { initialStaff } from './mocks/staff';
import { initialHistory } from './mocks/history';

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
  business(): BusinessProfile;
  branch(): BranchLocation;
  queues(): QueueSummary[];
  tickets(): QueueTicket[];
  team(): TeamMember[];
  activity(): ActivityEvent[];
  serviceMix(): ServiceMixItem[];
}

export interface ServiceRepository {
  list(): ServiceRecord[];
  save(service: ServiceRecord): ServiceRecord;
  remove(id: string): void;
}

export interface StaffRepository {
  list(): StaffRecord[];
}

export interface HistoryRepository {
  list(): HistoryRecord[];
}

export type SignInResult =
  | { ok: true; session: AuthSession }
  | { ok: false; message: string };

export interface AuthRepository {
  signIn(email: string, password: string): Promise<SignInResult>;
  restore(): AuthSession | null;
  signOut(): void;
}

export const panelRepository: PanelRepository = {
  business: () => business,
  branch: () => ({
    name: branchLocation.name,
    city: branchLocation.city,
    code: branchLocation.code,
    slug: branchSlug,
    accessCode: branchAccessCode,
  }),
  queues: () => queues,
  tickets: () => initialTickets,
  team: () => initialTeam,
  activity: () => initialActivity,
  serviceMix: () => serviceMix,
};

export const serviceRepository: ServiceRepository = {
  list: () => initialServices,
  save: (service) => service,
  remove: () => undefined,
};

export const staffRepository: StaffRepository = {
  list: () => initialStaff,
};

export const historyRepository: HistoryRepository = {
  list: () => initialHistory,
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
 * Mock auth: matches the demo accounts and keeps the session in
 * `localStorage` so a reload does not bounce the user back to the login form.
 */
export const authRepository: AuthRepository = {
  async signIn(email, password) {
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
  },

  restore() {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  },

  signOut: forget,
};