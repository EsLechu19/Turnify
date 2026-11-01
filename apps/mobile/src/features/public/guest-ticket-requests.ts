import type { GuestTicketAccess, GuestTicketState } from '@/features/queue/public-guest-ticket-api';

/** Latest request wins within a focused screen and a single guest identity. */
export class GuestTicketRequests {
  private revision = 0;
  private active = false;
  private access: GuestTicketAccess | null = null;

  setIdentity(access: GuestTicketAccess | null): void {
    if (this.access?.ticketId !== access?.ticketId || this.access?.capability !== access?.capability) {
      this.revision++;
      this.access = access;
    }
  }

  setActive(active: boolean): void {
    this.active = active;
    this.revision++;
  }

  invalidate(): void { this.revision++; }

  matches(access: GuestTicketAccess): boolean {
    return this.active && this.access?.ticketId === access.ticketId && this.access.capability === access.capability;
  }

  async refresh(
    access: GuestTicketAccess,
    fetch: (access: GuestTicketAccess) => Promise<GuestTicketState>,
    apply: (ticket: GuestTicketState) => void,
    fail: (error: unknown) => void,
    finish: () => void,
  ): Promise<boolean> {
    if (!this.matches(access)) return false;
    const revision = ++this.revision;
    const current = () => this.active && revision === this.revision;
    try {
      const ticket = await fetch(access);
      if (!current()) return false;
      apply(ticket);
      return true;
    } catch (error) {
      if (current()) fail(error);
      return false;
    } finally {
      if (current()) finish();
    }
  }
}
