import type { GuestTicketAccess } from './customer-public-api';

const WINDOW_MS = 86_400_000;
const key = (code: string) => `turnify.public-ticket-session.v1:${code}`;

function valid(value: Partial<GuestTicketAccess> | null): value is GuestTicketAccess {
  return Boolean(value?.ticketId && value.visibleCode && value.capability);
}

export function readGuestAccess(code: string): GuestTicketAccess | null {
  try {
    const session = JSON.parse(sessionStorage.getItem(key(code)) ?? 'null') as Partial<GuestTicketAccess> | null;
    if (valid(session)) return session;
  } catch { /* Continue with browser-close recovery. */ }
  try {
    const storedKey = `${key(code)}:rating`;
    const saved = JSON.parse(localStorage.getItem(storedKey) ?? 'null') as (GuestTicketAccess & { deadline: string; savedAt: number }) | null;
    const deadline = Date.parse(saved?.deadline ?? '');
    if (valid(saved) && Number.isFinite(deadline) && Number.isFinite(saved.savedAt)
      && Date.now() < deadline && Date.now() < saved.savedAt + WINDOW_MS) {
      return { ticketId: saved.ticketId, visibleCode: saved.visibleCode, capability: saved.capability };
    }
    localStorage.removeItem(storedKey);
  } catch { /* Storage can be unavailable in private browsing. */ }
  return null;
}

export function writeGuestAccess(code: string, access: GuestTicketAccess, deadline?: string | null): void {
  if (!deadline) {
    sessionStorage.setItem(key(code), JSON.stringify(access));
    return;
  }
  const storedKey = `${key(code)}:rating`;
  let savedAt = Date.now();
  try {
    const previous = JSON.parse(localStorage.getItem(storedKey) ?? 'null') as { ticketId?: string; savedAt?: number } | null;
    if (previous?.ticketId === access.ticketId && Number.isFinite(previous.savedAt)
      && previous.savedAt! <= savedAt) savedAt = previous.savedAt!;
  } catch { /* Replace malformed records. */ }
  localStorage.setItem(storedKey, JSON.stringify({ ...access, deadline, savedAt }));
  sessionStorage.removeItem(key(code));
}

export function clearGuestAccess(code: string): void {
  sessionStorage.removeItem(key(code));
  localStorage.removeItem(`${key(code)}:rating`);
}
