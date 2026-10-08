import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { CommercialCatalog } from '@/features/queue/commercial-queue-api';
import type { GuestDetails } from '@/features/queue/guest-ticket-details';
import type { GuestTicketAccess } from '@/features/queue/public-guest-ticket-api';

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
};

const GuestFlowContext = createContext<GuestFlowContextValue | undefined>(undefined);

export function GuestFlowProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<GuestBookingDraft | null>(null);
  const [ticketAccess, setTicketAccess] = useState<GuestTicketAccess | null>(null);
  const [demoTicket, setDemoTicket] = useState<DemoGuestTicket | null>(null);

  const beginDiscovery = useCallback((companyCode: string, catalog: CommercialCatalog) => {
    if (ticketAccess) return false;
    setDraft({ companyCode, catalog, serviceId: '', requestedBarberId: null, details: { name: '' } });
    return true;
  }, [ticketAccess]);
  const chooseService = useCallback((serviceId: string) => {
    setDraft((current) => current ? { ...current, serviceId, requestedBarberId: null } : current);
  }, []);
  const chooseBarber = useCallback((requestedBarberId: string | null) => {
    setDraft((current) => current ? { ...current, requestedBarberId } : current);
  }, []);
  const setDetails = useCallback((details: GuestDetails) => {
    setDraft((current) => current ? { ...current, details } : current);
  }, []);
  const setTicketAccessForFlow = useCallback((access: GuestTicketAccess) => { setDraft(null); setTicketAccess(access); }, []);
  const endGuestTicketSession = useCallback(() => { setDraft(null); setTicketAccess(null); setDemoTicket(null); }, []);

  const value = useMemo<GuestFlowContextValue>(() => ({
    draft,
    ticketAccess,
    demoTicket,
    beginDiscovery,
    chooseService,
    chooseBarber,
    setDetails,
    setTicketAccess: setTicketAccessForFlow,
    setDemoTicket,
    hasActiveTicketAccess: ticketAccess !== null,
    endGuestTicketSession,
  }), [beginDiscovery, chooseBarber, chooseService, demoTicket, draft, endGuestTicketSession, setDetails, setTicketAccessForFlow, ticketAccess]);

  return <GuestFlowContext.Provider value={value}>{children}</GuestFlowContext.Provider>;
}

export function useGuestFlow(): GuestFlowContextValue {
  const context = useContext(GuestFlowContext);
  if (!context) throw new Error('useGuestFlow must be used inside GuestFlowProvider.');
  return context;
}
