import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import { authRepository } from '@/data/repositories';
import type { AuthSession } from '@/data/types';

/**
 * Panel session.
 *
 * `authRepository` decides who is who; this provider only holds the result and
 * mirrors it to `localStorage`, so a reload keeps the user signed in. Swapping
 * the mock for Supabase means changing the repository body, not this file.
 */

export type AuthStatus = 'restoring' | 'authenticated' | 'anonymous';

interface AuthState {
  status: AuthStatus;
  session: AuthSession | null;
  error: string | null;
  pending: boolean;
}

type AuthAction =
  | { type: 'restored'; session: AuthSession | null }
  | { type: 'submitting' }
  | { type: 'succeeded'; session: AuthSession }
  | { type: 'failed'; message: string }
  | { type: 'error-cleared' }
  | { type: 'signed-out' };

const initialState: AuthState = {
  status: 'restoring',
  session: null,
  error: null,
  pending: false,
};

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'restored':
      return {
        status: action.session ? 'authenticated' : 'anonymous',
        session: action.session,
        error: null,
        pending: false,
      };

    case 'submitting':
      return { ...state, error: null, pending: true };

    case 'succeeded':
      return { status: 'authenticated', session: action.session, error: null, pending: false };

    case 'failed':
      return { ...state, error: action.message, pending: false };

    case 'error-cleared':
      return { ...state, error: null };

    case 'signed-out':
      return { status: 'anonymous', session: null, error: null, pending: false };
  }
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    void authRepository.restore().then((session) => dispatch({ type: 'restored', session }));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'submitting' });

    const result = await authRepository.signIn(email, password);

    if (result.ok) {
      dispatch({ type: 'succeeded', session: result.session });
      return true;
    }

    dispatch({ type: 'failed', message: result.message });
    return false;
  }, []);

  const signOut = useCallback(() => {
    authRepository.signOut();
    dispatch({ type: 'signed-out' });
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'error-cleared' }), []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, signOut, clearError }),
    [state, signIn, signOut, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }

  return context;
}