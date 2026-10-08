import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { serviceRepository } from '@/data/repositories';
import type { ServiceRecord } from '@/data/types';

/** Service catalog state, shared by the services section and the staff section. */

interface ServicesState {
  services: ServiceRecord[];
}

type ServicesAction =
  | { type: 'saved'; service: ServiceRecord }
  | { type: 'removed'; id: string };

function initialState(): ServicesState {
  return { services: serviceRepository.list() };
}

function reducer(state: ServicesState, action: ServicesAction): ServicesState {
  switch (action.type) {
    case 'saved': {
      const exists = state.services.some((service) => service.id === action.service.id);

      return {
        services: exists
          ? state.services.map((service) =>
              service.id === action.service.id ? action.service : service,
            )
          : [action.service, ...state.services],
      };
    }

    case 'removed':
      return { services: state.services.filter((service) => service.id !== action.id) };
  }
}

interface ServicesContextValue extends ServicesState {
  saveService: (service: ServiceRecord) => void;
  removeService: (id: string) => void;
}

const ServicesContext = createContext<ServicesContextValue | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const value = useMemo<ServicesContextValue>(
    () => ({
      services: state.services,
      saveService: (service) => dispatch({ type: 'saved', service }),
      removeService: (id) => dispatch({ type: 'removed', id }),
    }),
    [state],
  );

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): ServicesContextValue {
  const context = useContext(ServicesContext);

  if (!context) {
    throw new Error('useServices debe usarse dentro de <ServicesProvider>');
  }

  return context;
}