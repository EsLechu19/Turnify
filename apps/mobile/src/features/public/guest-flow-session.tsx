import { createContext, useCallback, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';

import type { CommercialCatalog } from '@/features/queue/commercial-queue-api';
import type { GuestDetails } from '@/features/queue/guest-ticket-details';
import type { GuestTicketAccess } from '@/features/queue/public-guest-ticket-api';
import { secureStorage } from '@/lib/secure-storage';

export type GuestBookingDraft = {
  companyCode: string;
  catalog: CommercialCatalog;
  serviceId: string;
  requestedBarberId: string | null;
  details: GuestDetails;
};

type GuestFlowContextValue = {
  draft: GuestBookingDraft | null;
  ticketAccess: GuestTicketAccess | null;
  isRestoringTicket: boolean;
  beginDiscovery(companyCode: string, catalog: CommercialCatalog): boolean;
  chooseService(serviceId: string): void;
  chooseBarber(requestedBarberId: string | null): void;
  setDetails(details: GuestDetails): void;
  setTicketAccess(access: GuestTicketAccess): void;
  hasActiveTicketAccess: boolean;
  endGuestTicketSession(): void;
};

const GuestFlowContext = createContext<GuestFlowContextValue | undefined>(undefined);

const TICKET_ACCESS_KEY = 'turnify_guest_ticket_access';

export function GuestFlowProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<GuestBookingDraft | null>(null);
  const [ticketAccess, setTicketAccess] = useState<GuestTicketAccess | null>(null);
  const [isRestoringTicket, setIsRestoringTicket] = useState(true);

  useEffect(() => {
    secureStorage.getItem(TICKET_ACCESS_KEY).then((stored) => {
      if (stored) {
        try {
          setTicketAccess(JSON.parse(stored) as GuestTicketAccess);
        } catch {
          // invalid JSON
        }
      }
      setIsRestoringTicket(false);
    });
  }, []);

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
  const setTicketAccessForFlow = useCallback((access: GuestTicketAccess) => {
    setDraft(null);
    setTicketAccess(access);
    void secureStorage.setItem(TICKET_ACCESS_KEY, JSON.stringify(access));
  }, []);
  const endGuestTicketSession = useCallback(() => {
    setDraft(null);
    setTicketAccess(null);
    void secureStorage.removeItem(TICKET_ACCESS_KEY);
  }, []);

  const value = useMemo<GuestFlowContextValue>(() => ({
    draft,
    ticketAccess,
    isRestoringTicket,
    beginDiscovery,
    chooseService,
    chooseBarber,
    setDetails,
    setTicketAccess: setTicketAccessForFlow,
    hasActiveTicketAccess: ticketAccess !== null,
    endGuestTicketSession,
  }), [beginDiscovery, chooseBarber, chooseService, draft, endGuestTicketSession, isRestoringTicket, setDetails, setTicketAccessForFlow, ticketAccess]);

  return <GuestFlowContext.Provider value={value}>{children}</GuestFlowContext.Provider>;
}

export function useGuestFlow(): GuestFlowContextValue {
  const context = useContext(GuestFlowContext);
  if (!context) throw new Error('useGuestFlow must be used inside GuestFlowProvider.');
  return context;
}
