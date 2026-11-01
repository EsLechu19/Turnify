import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';

import { authRepository, type PasswordRecoveryResult } from '@/data/repositories';
import type { AuthSession } from '@/data/types';

/**
 * Panel session.
 *
 * `authRepository` decides who is who; this provider only holds the result and
 * mirrors it to the selected browser storage, so a reload keeps the user signed in. Swapping
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
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<boolean>;
  signUp: (email: string, password: string, name: string, businessName?: string) => Promise<'authenticated' | 'confirm-email' | string>;
  refreshProfile: () => Promise<void>;
  signOut: () => void;
  clearError: () => void;
  recoverySessionActive: boolean;
  passwordRecoveryStatus: 'checking' | 'ready' | 'invalid';
  requestPasswordReset: (email: string) => Promise<PasswordRecoveryResult>;
  updatePassword: (password: string) => Promise<PasswordRecoveryResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [recoverySessionActive, setRecoverySessionActive] = useState(false);
  const [passwordRecoveryStatus, setPasswordRecoveryStatus] = useState<'checking' | 'ready' | 'invalid'>('checking');

  useEffect(() => {
    let restored = false;
    const unsubscribe = authRepository.subscribeToPasswordRecovery((active) => {
      setRecoverySessionActive(active);
      if (active) setPasswordRecoveryStatus('ready');
      else if (restored) setPasswordRecoveryStatus('invalid');
    });

    void authRepository.restore()
      .then((session) => {
        dispatch({ type: 'restored', session });
        restored = true;
        const active = authRepository.isPasswordRecoverySessionActive();
        setRecoverySessionActive(active);
        setPasswordRecoveryStatus(active ? 'ready' : 'invalid');
      })
      .catch((error: unknown) => {
        restored = true;
        setPasswordRecoveryStatus('invalid');
        dispatch({
          type: 'restore-failed',
          message: error instanceof Error ? error.message : 'No pudimos restaurar la sesión.',
        });
      });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    dispatch({ type: 'submitting' });

    const result = await authRepository.signIn(email, password, rememberMe);

    if (result.ok) {
      dispatch({ type: 'succeeded', session: result.session });
      return true;
    }

    dispatch({ type: 'failed', message: result.message });
    return false;
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, businessName?: string) => {
    dispatch({ type: 'submitting' });

    const result = await authRepository.signUp(email, password, name, businessName);

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
  const requestPasswordReset = useCallback((email: string) => authRepository.requestPasswordReset(email), []);
  const updatePassword = useCallback((password: string) => authRepository.updatePassword(password), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn,
      signUp,
      refreshProfile,
      signOut,
      clearError,
      recoverySessionActive,
      passwordRecoveryStatus,
      requestPasswordReset,
      updatePassword,
    }),
    [state, signIn, signUp, refreshProfile, signOut, clearError, recoverySessionActive, passwordRecoveryStatus, requestPasswordReset, updatePassword],
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
