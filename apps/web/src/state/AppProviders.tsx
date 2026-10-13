import type { ReactNode } from 'react';

import { QueueProvider } from '@/state/QueueContext';
import { ServicesProvider } from '@/state/ServicesContext';
import { AuthProvider } from '@/state/AuthContext';
import { ShopProvider } from '@/state/ShopContext';
import { useAuth } from '@/state/AuthContext';

function ProtectedProviders({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status !== 'authenticated') {
    return <>{children}</>;
  }

  return (
    <ShopProvider>
      <ServicesProvider>
        <QueueProvider>{children}</QueueProvider>
      </ServicesProvider>
    </ShopProvider>
  );
}

/** Wraps the app in every feature-level provider, in one place. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedProviders>{children}</ProtectedProviders>
    </AuthProvider>
  );
}
