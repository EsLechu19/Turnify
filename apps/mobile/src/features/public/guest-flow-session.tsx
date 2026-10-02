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

type GuestFlowContextValue = {
  draft: GuestBookingDraft | null;
  ticketAccess: GuestTicketAccess | null;
  beginDiscovery(companyCode: string, catalog: CommercialCatalog): void;
  chooseService(serviceId: string): void;
  chooseBarber(requestedBarberId: string | null): void;
  setDetails(details: GuestDetails): void;
  setTicketAccess(access: GuestTicketAccess): void;
  reset(): void;
};

const GuestFlowContext = createContext<GuestFlowContextValue | undefined>(undefined);

export function GuestFlowProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<GuestBookingDraft | null>(null);
  const [ticketAccess, setTicketAccess] = useState<GuestTicketAccess | null>(null);

  const beginDiscovery = useCallback((companyCode: string, catalog: CommercialCatalog) => {
    setTicketAccess(null);
    setDraft({ companyCode, catalog, serviceId: '', requestedBarberId: null, details: { name: '' } });
  }, []);
  const chooseService = useCallback((serviceId: string) => {
    setDraft((current) => current ? { ...current, serviceId, requestedBarberId: null } : current);
  }, []);
  const chooseBarber = useCallback((requestedBarberId: string | null) => {
    setDraft((current) => current ? { ...current, requestedBarberId } : current);
  }, []);
  const setDetails = useCallback((details: GuestDetails) => {
    setDraft((current) => current ? { ...current, details } : current);
  }, []);
  const setTicketAccessForFlow = useCallback((access: GuestTicketAccess) => { setTicketAccess(access); }, []);
  const reset = useCallback(() => { setDraft(null); setTicketAccess(null); }, []);

  const value = useMemo<GuestFlowContextValue>(() => ({
    draft,
    ticketAccess,
    beginDiscovery,
    chooseService,
    chooseBarber,
    setDetails,
    setTicketAccess: setTicketAccessForFlow,
    reset,
  }), [beginDiscovery, chooseBarber, chooseService, draft, reset, setDetails, setTicketAccessForFlow, ticketAccess]);

  return <GuestFlowContext.Provider value={value}>{children}</GuestFlowContext.Provider>;
}

export function useGuestFlow(): GuestFlowContextValue {
  const context = useContext(GuestFlowContext);
  if (!context) throw new Error('useGuestFlow must be used inside GuestFlowProvider.');
  return context;
}
