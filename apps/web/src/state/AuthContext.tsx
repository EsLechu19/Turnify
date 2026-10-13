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
  | { type: 'restore-failed'; message: string }
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

    case 'restore-failed':
      return { status: 'anonymous', session: null, error: action.message, pending: false };

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
  signUp: (email: string, password: string, name: string) => Promise<'authenticated' | 'confirm-email' | string>;
  refreshProfile: () => Promise<void>;
  signOut: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    void authRepository.restore()
      .then((session) => dispatch({ type: 'restored', session }))
      .catch((error: unknown) => {
        dispatch({
          type: 'restore-failed',
          message: error instanceof Error ? error.message : 'No pudimos restaurar la sesión.',
        });
      });
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

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    dispatch({ type: 'submitting' });

    const result = await authRepository.signUp(email, password, name);

    if (!result.ok) {
      dispatch({ type: 'failed', message: result.message });
      return result.message;
    }

    if (!result.session) {
      dispatch({ type: 'signed-out' });
      return 'confirm-email' as const;
    }

    dispatch({ type: 'succeeded', session: result.session });
    return 'authenticated' as const;
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const session = await authRepository.restore();
      dispatch({ type: 'restored', session });
    } catch (error: unknown) {
      dispatch({
        type: 'restore-failed',
        message: error instanceof Error ? error.message : 'No pudimos restaurar la sesión.',
      });
    }
  }, []);

  const signOut = useCallback(() => {
    authRepository.signOut();
    dispatch({ type: 'signed-out' });
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'error-cleared' }), []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, signUp, refreshProfile, signOut, clearError }),
    [state, signIn, signUp, refreshProfile, signOut, clearError],
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
