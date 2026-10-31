import type {
  cancelGuestTicket,
  createGuestTicket,
  getGuestTicketState,
  rateFinishedGuestTicket,
  respondToCalledGuestTicket,
  GuestDetails,
  GuestTicketAccess,
  GuestTicketState,
} from './customer-public-api';

const terminal = new Set<GuestTicketState['status']>(['finalizado', 'cancelado', 'ausente']);
const active = new Set<GuestTicketState['status']>(['en_espera', 'notificado', 'llamado', 'en_atencion']);

export type GuestSession = {
  access: GuestTicketAccess | null;
  ticket: GuestTicketState | null;
  error: string | null;
  busy: boolean;
  needsRefresh: boolean;
  storageWarning: string | null;
};

export type GuestSessionDependencies = {
  read: () => GuestTicketAccess | null;
  write: (access: GuestTicketAccess) => void;
  clear: () => void;
  create: typeof createGuestTicket;
  refresh: typeof getGuestTicketState;
  respond: typeof respondToCalledGuestTicket;
  rate: typeof rateFinishedGuestTicket;
  cancel: typeof cancelGuestTicket;
};

export function calledSecondsRemaining(ticket: GuestTicketState, now: number): number | null {
  if (ticket.status !== 'llamado' || !ticket.calledDeadlineAt) return null;
  const deadline = Date.parse(ticket.calledDeadlineAt);
  return Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
}

export function canRespondToCall(ticket: GuestTicketState, now: number): boolean {
  const remaining = calledSecondsRemaining(ticket, now);
  return remaining !== null && remaining > 0 && !ticket.customerResponse;
}

export class GuestSessionController {
  private current: GuestSession;
  private listeners = new Set<() => void>();
  private revision = 0;
  private alive = true;

  constructor(private businessCode: string, private deps: GuestSessionDependencies) {
    this.current = { access: deps.read(), ticket: null, error: null, busy: false, needsRefresh: false, storageWarning: null };
  }

  getSnapshot = (): GuestSession => this.current;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  dispose(): void {
    this.alive = false;
    this.revision++;
    this.listeners.clear();
  }

  private update(patch: Partial<GuestSession>): void {
    if (!this.alive) return;
    this.current = { ...this.current, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private matches(revision: number, access: GuestTicketAccess): boolean {
    return this.alive && revision === this.revision && this.current.access === access;
  }

  async refresh(successfulAction?: 'respond' | 'rate'): Promise<void> {
    const access = this.current.access;
    if (!access || !this.alive || (this.current.busy && !successfulAction)) return;
    const revision = ++this.revision;
    this.update({ error: null });
    try {
      const ticket = await this.deps.refresh(access);
      if (!this.matches(revision, access)) return;
      this.update({ ticket, needsRefresh: false });
      if (terminal.has(ticket.status)) {
        try { this.deps.clear(); } catch { /* Access remains in memory. */ }
      }
    } catch {
      if (this.matches(revision, access)) {
        this.update({ error: successfulAction
          ? `Tu ${successfulAction === 'respond' ? 'respuesta' : 'puntuación'} se registró, pero no pudimos actualizar el turno. Reintentá la actualización.`
          : 'No pudimos actualizar tu turno. Reintentá sin perder tu lugar.' });
      }
    }
  }

  async create(input: { serviceId: string; requestedBarberId: string | null; details: GuestDetails }): Promise<void> {
    if (!this.alive || this.current.access || this.current.busy) return;
    const revision = ++this.revision;
    this.update({ busy: true, error: null });
    try {
      const access = await this.deps.create({ businessCode: this.businessCode, ...input });
      if (!this.alive || revision !== this.revision) return;
      let storageWarning: string | null = null;
      try { this.deps.write(access); } catch { storageWarning = 'El turno se creó, pero no se pudo guardar en este navegador. No cierres esta página.'; }
      this.update({ access, ticket: null, storageWarning, busy: false });
      await this.refresh();
    } catch (cause) {
      if (this.alive && revision === this.revision) this.update({ error: cause instanceof Error ? cause.message : 'No pudimos crear tu turno.', busy: false });
    }
  }

  async respond(response: 'presente' | 'llega_en_2_min'): Promise<void> {
    const { access, ticket, busy, needsRefresh } = this.current;
    if (!access || !ticket || busy || needsRefresh || !canRespondToCall(ticket, Date.now())) return;
    const revision = ++this.revision;
    this.update({ busy: true, error: null });
    try {
      await this.deps.respond(access, response);
      if (!this.matches(revision, access)) return;
      this.update({ ticket: { ...ticket, customerResponse: response }, busy: false });
      await this.refresh('respond');
    } catch {
      if (this.matches(revision, access)) this.update({ error: 'No pudimos confirmar tu respuesta. Actualizá el turno antes de reintentar.', busy: false, needsRefresh: true });
    }
  }

  async rate(rating: number): Promise<void> {
    const { access, ticket, busy, needsRefresh } = this.current;
    if (!access || !ticket || busy || needsRefresh || ticket.status !== 'finalizado' || ticket.rating != null) return;
    const revision = ++this.revision;
    this.update({ busy: true, error: null });
    try {
      await this.deps.rate(access, rating);
      if (!this.matches(revision, access)) return;
      this.update({ ticket: { ...ticket, rating }, busy: false });
      await this.refresh('rate');
    } catch {
      if (this.matches(revision, access)) this.update({ error: 'No pudimos confirmar tu puntuación. Actualizá el turno antes de reintentar.', busy: false, needsRefresh: true });
    }
  }

  async cancel(): Promise<void> {
    const { access, ticket, busy, needsRefresh } = this.current;
    if (!access || !ticket || busy || needsRefresh || !active.has(ticket.status)) return;
    const revision = ++this.revision;
    this.update({ busy: true, error: null });
    try {
      await this.deps.cancel(access);
      if (!this.matches(revision, access)) return;
      try { this.deps.clear(); } catch { /* The cancelled access can still be resolved on reload. */ }
      this.update({ ticket: { ...ticket, status: 'cancelado' }, busy: false });
    } catch {
      if (this.matches(revision, access)) this.update({ error: 'No pudimos confirmar la cancelación. Actualizá el turno antes de reintentar.', busy: false, needsRefresh: true });
    }
  }

  restart(): void {
    if (!this.alive || this.current.busy || this.current.needsRefresh || !this.current.ticket || !terminal.has(this.current.ticket.status)) return;
    ++this.revision;
    try { this.deps.clear(); } catch { this.update({ error: 'No se pudo borrar el acceso anterior de este navegador. Intentá nuevamente.' }); return; }
    this.update({ access: null, ticket: null, error: null, needsRefresh: false, storageWarning: null });
  }
}
