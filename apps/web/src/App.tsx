import { BrowserRouter } from 'react-router-dom';

import { AppRoutes } from '@/app/routes';
import { ConfigurationUnavailable } from '@/app/ConfigurationUnavailable';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { isSupabaseConfigurationUnavailable } from '@/data/supabase';
import { AppProviders } from '@/state/AppProviders';

/** Composition root: providers, router, routes. No state or markup of its own. */
export default function App() {
  if (isSupabaseConfigurationUnavailable()) {
    return <ConfigurationUnavailable />;
  }

  return (
    <AppProviders>
      <ErrorBoundary>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ErrorBoundary>
    </AppProviders>
  );
}
