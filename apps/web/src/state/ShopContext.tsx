import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { panelRepository, type BranchLocation, type BusinessProfile } from '@/data/repositories';
import { fetchShopOpen } from '@/data/live';

interface ShopContextValue {
  business: BusinessProfile | null;
  branch: BranchLocation | null;
  loading: boolean;
  error: string | null;
  /** Live open state of the shop (`empresas.abierta`); null until loaded. */
  open: boolean | null;
  refreshShop: () => void;
}

/** Shop identity for the shell and the pages (async: live backend or fixtures). */
const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ business: null as BusinessProfile | null, branch: null as BranchLocation | null, loading: true, open: null as boolean | null, error: null as string | null });
  const requestId = useRef(0);

  const refreshShop = useCallback(() => {
    const currentRequest = ++requestId.current;
    setState((current) => ({ ...current, loading: true, error: null }));
    Promise.all([panelRepository.business(), panelRepository.branch(), fetchShopOpen()])
      .then(([business, branch, open]) => {
        if (currentRequest === requestId.current) setState({ business, branch, loading: false, open, error: null });
      })
      .catch((error: unknown) => {
        if (currentRequest === requestId.current) {
          setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : 'No pudimos cargar la barbería.' }));
        }
      });
  }, []);

  useEffect(() => {
    refreshShop();
    return () => { requestId.current += 1; };
  }, [refreshShop]);

  return <ShopContext.Provider value={{ ...state, refreshShop }}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopContextValue {
  const context = useContext(ShopContext);

  if (!context) {
    throw new Error('useShop debe usarse dentro de <ShopProvider>');
  }

  return context;
}
