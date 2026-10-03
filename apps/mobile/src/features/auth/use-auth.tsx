import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { translateAuthError } from '@/features/auth/auth-errors';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export type AuthError = string | null;

export type AuthProfile = {
  role: 'cliente' | 'admin' | 'personal';
  businessId: string | null;
};

export interface AuthContextValue {
  /** True until the persisted session has been read from storage on launch. */
  isRestoring: boolean;
  session: Session | null;
  isSupabaseConfigured: boolean;
  profile: AuthProfile | null;
  isProfileLoading: boolean;
  reloadProfile(): Promise<AuthProfile | null>;
  signIn(email: string, password: string): Promise<AuthError>;
  signUp(email: string, password: string, metadata?: { name?: string; workerIntent?: boolean }): Promise<AuthError>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

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

  const signUp = useCallback<AuthContextValue['signUp']>(async (email, password, metadata) => {
    const { error } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nombre: metadata?.name?.trim() || undefined, worker_intent: metadata?.workerIntent ? 'true' : undefined } },
    });
    return error ? translateAuthError(error.message) : null;
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  const reloadProfile = useCallback(async (): Promise<AuthProfile | null> => {
    const userId = session?.user.id;
    if (!userId) {
      setProfile(null);
      return null;
    }

    setIsProfileLoading(true);
    try {
      const { data, error } = await getSupabase()
        .from('perfiles')
        .select('rol, empresa_id, empresa_personal_actual_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      const nextProfile = data
        ? {
            role: data.rol as AuthProfile['role'],
            businessId: data.rol === 'personal' ? data.empresa_personal_actual_id : data.empresa_id,
          }
        : null;
      setProfile(nextProfile);
      return nextProfile;
    } finally {
      setIsProfileLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }

    void reloadProfile().catch(() => {
      setProfile(null);
    });
  }, [reloadProfile, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isRestoring,
      session,
      isSupabaseConfigured,
      profile,
      isProfileLoading,
      reloadProfile,
      signIn,
      signUp,
      signOut,
    }),
    [isRestoring, session, profile, isProfileLoading, reloadProfile, signIn, signUp, signOut]
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
