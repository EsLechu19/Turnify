import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { panelRepository, type BranchLocation, type BusinessProfile } from '@/data/repositories';
import { fetchShopOpen } from '@/data/live';

interface ShopContextValue {
  business: BusinessProfile | null;
  branch: BranchLocation | null;
  loading: boolean;
  /** Live open state of the shop (`empresas.abierta`); null until loaded. */
  open: boolean | null;
  refreshShop: () => void;
}

/** Shop identity for the shell and the pages (async: live backend or fixtures). */
const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShopContextValue>({ business: null, branch: null, loading: true, open: null, refreshShop: () => undefined });

  const refreshShop = useCallback(() => {
    Promise.all([panelRepository.business(), panelRepository.branch(), fetchShopOpen()])
      .then(([business, branch, open]) => setState((current) => ({ ...current, business, branch, loading: false, open, refreshShop })))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([panelRepository.business(), panelRepository.branch()])
      .then(([business, branch]) => {
        if (!active) return;
        setState((current) => ({ ...current, business, branch, loading: false, refreshShop }));
        refreshShop();
      })
      .catch(() => {
        if (active) setState({ business: null, branch: null, loading: false, open: null, refreshShop });
      });

    return () => {
      active = false;
    };
  }, [refreshShop]);

  return <ShopContext.Provider value={state}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopContextValue {
  const context = useContext(ShopContext);

  if (!context) {
    throw new Error('useShop debe usarse dentro de <ShopProvider>');
  }

  return context;
}
