import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { translateAuthError } from '@/features/auth/auth-errors';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export type AuthError = string | null;

export interface AuthContextValue {
  /** True until the persisted session has been read from storage on launch. */
  isRestoring: boolean;
  session: Session | null;
  isSupabaseConfigured: boolean;
  signIn(email: string, password: string): Promise<AuthError>;
  signUp(email: string, password: string): Promise<AuthError>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsRestoring(false);
      return;
    }

    const supabase = getSupabase();
    let active = true;

    // getSession reads the session persisted by the secure storage adapter,
    // which is what keeps the user signed in across launches.
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }
      setSession(data.session ?? null);
      setIsRestoring(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    return error ? translateAuthError(error.message) : null;
  }, []);

  const signUp = useCallback<AuthContextValue['signUp']>(async (email, password) => {
    const { error } = await getSupabase().auth.signUp({ email: email.trim(), password });
    return error ? translateAuthError(error.message) : null;
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ isRestoring, session, isSupabaseConfigured, signIn, signUp, signOut }),
    [isRestoring, session, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return context;
}
