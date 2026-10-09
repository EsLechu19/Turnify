import { BrowserRouter } from 'react-router-dom';

import { AppRoutes } from '@/app/routes';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { AppProviders } from '@/state/AppProviders';

/** Composition root: providers, router, routes. No state or markup of its own. */
export default function App() {
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