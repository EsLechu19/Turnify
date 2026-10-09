import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { panelRepository, type BranchLocation, type BusinessProfile } from '@/data/repositories';

interface ShopContextValue {
  business: BusinessProfile | null;
  branch: BranchLocation | null;
  loading: boolean;
}

/** Shop identity for the shell and the pages (async: live backend or fixtures). */
const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShopContextValue>({ business: null, branch: null, loading: true });

  useEffect(() => {
    let active = true;

    Promise.all([panelRepository.business(), panelRepository.branch()])
      .then(([business, branch]) => {
        if (active) setState({ business, branch, loading: false });
      })
      .catch(() => {
        if (active) setState({ business: null, branch: null, loading: false });
      });

    return () => {
      active = false;
    };
  }, []);

  return <ShopContext.Provider value={state}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopContextValue {
  const context = useContext(ShopContext);

  if (!context) {
    throw new Error('useShop debe usarse dentro de <ShopProvider>');
  }

  return context;
}
