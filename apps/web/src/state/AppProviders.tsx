import type { ReactNode } from 'react';

import { QueueProvider } from '@/state/QueueContext';
import { ServicesProvider } from '@/state/ServicesContext';
import { AuthProvider } from '@/state/AuthContext';

/** Wraps the app in every feature-level provider, in one place. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ServicesProvider>
        <QueueProvider>{children}</QueueProvider>
      </ServicesProvider>
    </AuthProvider>
  );
}