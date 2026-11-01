import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { CommercialCatalog } from '@/features/queue/commercial-queue-api';
import type { GuestDetails } from '@/features/queue/guest-ticket-details';
import { getGuestTicketState, type GuestTicketAccess } from '@/features/queue/public-guest-ticket-api';
import { isActiveGuestTicketStatus } from '@/features/public/public-route-policy';
import { guestRatingState } from '@/features/public/guest-rating';
import { clearStoredGuestTicketAccess, loadStoredGuestTicketAccess, storeGuestTicketAccess } from '@/features/public/guest-ticket-storage';

export type GuestBookingDraft = {
  companyCode: string;
  catalog: CommercialCatalog;
  serviceId: string;
  requestedBarberId: string | null;
  details: GuestDetails;
};

/**
 * Locally created ticket used when the app runs as a static demo. The static
 * barbería directory has no matching rows in the backend, so the booking RPC
 * cannot be called; this keeps the post-confirmation experience intact.
 */
export type DemoGuestTicket = {
  visibleCode: string;
  status: 'en_espera' | 'llamado' | 'en_atencion';
  serviceName: string;
  barberName: string | null;
  peopleAhead: number;
  waitMinutes: number;
};

/** Shown by the customer surfaces before the demo customer books a real turn. */
export const DEFAULT_DEMO_TICKET: DemoGuestTicket = {
  visibleCode: 'A24',
  status: 'en_espera',
  serviceName: 'Corte clásico',
  barberName: null,
  peopleAhead: 2,
  waitMinutes: 10,
};

type GuestFlowContextValue = {
  draft: GuestBookingDraft | null;
  ticketDetails: GuestDetails | null;
  ticketAccess: GuestTicketAccess | null;
  demoTicket: DemoGuestTicket | null;
  beginDiscovery(companyCode: string, catalog: CommercialCatalog): boolean;
  chooseService(serviceId: string): void;
  chooseBarber(requestedBarberId: string | null): void;
  setDetails(details: GuestDetails): void;
  setTicketAccess(access: GuestTicketAccess): void;
  setDemoTicket(ticket: DemoGuestTicket | null): void;
  hasActiveTicketAccess: boolean;
  endGuestTicketSession(): void;
  settleGuestTicket(access: GuestTicketAccess, state: Awaited<ReturnType<typeof getGuestTicketState>>): void;
};

const GuestFlowContext = createContext<GuestFlowContextValue | undefined>(undefined);

export function GuestFlowProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<GuestBookingDraft | null>(null);
  const [ticketDetails, setTicketDetails] = useState<GuestDetails | null>(null);
  const [ticketAccess, setTicketAccess] = useState<GuestTicketAccess | null>(null);
  const [demoTicket, setDemoTicket] = useState<DemoGuestTicket | null>(null);
  const sessionRevision = useRef(0);
  const currentAccess = useRef<GuestTicketAccess | null>(null);
  const [restoring, setRestoring] = useState(true);

  const beginDiscovery = useCallback((companyCode: string, catalog: CommercialCatalog) => {
    if (ticketAccess || restoring) return false;
    setTicketDetails(null);
    setDraft({ companyCode, catalog, serviceId: '', requestedBarberId: null, details: { name: '' } });
    return true;
  }, [ticketAccess, restoring]);
  const chooseService = useCallback((serviceId: string) => {
    setDraft((current) => current ? { ...current, serviceId, requestedBarberId: null } : current);
  }, []);
  const chooseBarber = useCallback((requestedBarberId: string | null) => {
    setDraft((current) => current ? { ...current, requestedBarberId } : current);
  }, []);
  const setDetails = useCallback((details: GuestDetails) => {
    setTicketDetails(details);
    setDraft((current) => current ? { ...current, details } : current);
  }, []);
  const setTicketAccessForFlow = useCallback((access: GuestTicketAccess) => {
    sessionRevision.current++;
    currentAccess.current = access;
    setDraft(null);
    setTicketAccess(access);
    void storeGuestTicketAccess(undefined, access).catch(() => undefined);
  }, []);
  const endGuestTicketSession = useCallback(() => {
    sessionRevision.current++;
    const oldAccess = currentAccess.current;
    currentAccess.current = null;
    setDraft(null);
    setTicketDetails(null);
    setTicketAccess(null);
    setDemoTicket(null);
    if (oldAccess) void clearStoredGuestTicketAccess(undefined, oldAccess).catch(() => undefined);
  }, []);

  const settleGuestTicket = useCallback((access: GuestTicketAccess, state: Awaited<ReturnType<typeof getGuestTicketState>>) => {
    if (currentAccess.current?.ticketId !== access.ticketId || currentAccess.current.capability !== access.capability) return;
    if (state.status === 'finalizado' && guestRatingState(state) === 'pending') {
      void storeGuestTicketAccess(undefined, access, state.ratingDeadlineAt).catch(() => undefined);
    } else if (!isActiveGuestTicketStatus(state.status)) {
      void clearStoredGuestTicketAccess(undefined, access).catch(() => undefined);
      currentAccess.current = null;
      setTicketAccess(null);
    }
  }, []);

  // A network failure does not make a saved ticket safe to replace.
  useEffect(() => {
    let active = true;
    const revision = sessionRevision.current;
    void loadStoredGuestTicketAccess()
      .then((stored) => (stored ? getGuestTicketState(stored).then((state) => ({ stored, state })).catch(() => ({ stored, state: null })) : null))
      .then((restored) => {
        if (!active || revision !== sessionRevision.current) return;
        setRestoring(false);
        if (!restored) return;
        if (!restored.state || isActiveGuestTicketStatus(restored.state.status) || (restored.state.status === 'finalizado' && guestRatingState(restored.state) === 'pending')) {
          currentAccess.current = restored.stored;
          setDraft(null);
          setTicketAccess(restored.stored);
          if (restored.state?.status === 'finalizado') void storeGuestTicketAccess(undefined, restored.stored, restored.state.ratingDeadlineAt).catch(() => undefined);
        } else {
          void clearStoredGuestTicketAccess(undefined, restored.stored).catch(() => undefined);
        }
      })
      .catch(() => { if (active) setRestoring(false); });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<GuestFlowContextValue>(() => ({
    draft,
    ticketDetails,
    ticketAccess,
    demoTicket,
    beginDiscovery,
    chooseService,
    chooseBarber,
    setDetails,
    setTicketAccess: setTicketAccessForFlow,
    setDemoTicket,
    hasActiveTicketAccess: ticketAccess !== null || restoring,
    endGuestTicketSession,
    settleGuestTicket,
  }), [beginDiscovery, chooseBarber, chooseService, demoTicket, draft, endGuestTicketSession, restoring, setDetails, setTicketAccessForFlow, settleGuestTicket, ticketAccess, ticketDetails]);

  return <GuestFlowContext.Provider value={value}>{children}</GuestFlowContext.Provider>;
}

export function useGuestFlow(): GuestFlowContextValue {
  const context = useContext(GuestFlowContext);
  if (!context) throw new Error('useGuestFlow must be used inside GuestFlowProvider.');
  return context;
}
