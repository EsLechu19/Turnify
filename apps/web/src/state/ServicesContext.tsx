import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';

import { serviceRepository } from '@/data/repositories';
import type { ServiceInput } from '@/data/live';
import type { ServiceRecord } from '@/data/types';

/** Service catalog state, shared by the services section and the staff section. */

interface ServicesState {
  services: ServiceRecord[];
  loading: boolean;
  error: string | null;
}

type ServicesAction =
  | { type: 'loaded'; services: ServiceRecord[] }
  | { type: 'loading' }
  | { type: 'failed'; error: string }
  | { type: 'saved'; service: ServiceRecord }
  | { type: 'removed'; id: string };

function reducer(state: ServicesState, action: ServicesAction): ServicesState {
  switch (action.type) {
    case 'loaded':
      return { services: action.services, loading: false, error: null };
    case 'loading':
      return { ...state, loading: true, error: null };
    case 'failed':
      return { ...state, loading: false, error: action.error };
    case 'saved': {
      const exists = state.services.some((service) => service.id === action.service.id);

      return {
        ...state,
        services: exists
          ? state.services.map((service) =>
              service.id === action.service.id ? action.service : service,
            )
          : [action.service, ...state.services],
      };
    }

    case 'removed':
      return { ...state, services: state.services.filter((service) => service.id !== action.id) };
  }
}

interface ServicesContextValue extends ServicesState {
  createService: (input: ServiceInput) => Promise<void>;
  updateService: (id: string, input: ServiceInput) => Promise<void>;
  removeService: (id: string) => Promise<void>;
  reloadServices: () => void;
}

const ServicesContext = createContext<ServicesContextValue | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, (): ServicesState => ({ services: [], loading: true, error: null }));
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    dispatch({ type: 'loading' });

    serviceRepository
      .list()
      .then((services) => {
        if (active) dispatch({ type: 'loaded', services });
      })
      .catch((error: unknown) => {
        if (active) dispatch({ type: 'failed', error: error instanceof Error ? error.message : 'No pudimos cargar los servicios.' });
      });

    return () => {
      active = false;
    };
  }, [nonce]);

  const value = useMemo<ServicesContextValue>(
    () => ({
      ...state,
      createService: async (input) => {
        const created = await serviceRepository.create(input);
        dispatch({ type: 'saved', service: created });
      },
      updateService: async (id, input) => {
        const updated = await serviceRepository.update(id, input);
        dispatch({ type: 'saved', service: updated });
      },
      removeService: async (id) => {
        await serviceRepository.remove(id);
        dispatch({ type: 'removed', id });
      },
      reloadServices: () => setNonce((n) => n + 1),
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
