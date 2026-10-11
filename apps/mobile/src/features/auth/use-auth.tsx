import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

const isDemoSkipAuth = process.env.EXPO_PUBLIC_SKIP_AUTH === '1';
const demoProfile: AuthProfile = {
  role: 'personal',
  businessId: process.env.EXPO_PUBLIC_DEMO_BUSINESS_ID?.trim() || null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoring, setIsRestoring] = useState(!isDemoSkipAuth);
  const [profile, setProfile] = useState<AuthProfile | null>(isDemoSkipAuth ? demoProfile : null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const signOutPromise = useRef<Promise<void> | null>(null);
  const isSigningOut = useRef(false);
  const isSigningIn = useRef(false);
  const profileResolutionSessionId = useRef<string | null>(null);

  useEffect(() => {
    if (isDemoSkipAuth) {
      setProfile(demoProfile);
      setSession(null);
      setIsRestoring(false);
      setIsProfileLoading(false);
      return;
    }
    if (!isSupabaseConfigured) {
      setIsRestoring(false);
      return;
    }

    const supabase = getSupabase();
    let active = true;

    // getSession reads the session persisted by the secure storage adapter,
    // which is what keeps the user signed in across launches.
    void supabase.auth.getSession().then(({ data }) => {
      if (!active || isSigningOut.current) {
        return;
      }
      setSession(data.session ?? null);
      setIsRestoring(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active && !isSigningOut.current) {
        setSession(nextSession);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  /** Reads the profile row without touching state: shared by sign-in and reload. */
  const fetchProfileData = useCallback(async (userId: string): Promise<AuthProfile | null> => {
    const { data, error } = await getSupabase()
      .from('perfiles')
      .select('rol, empresa_id, empresa_personal_actual_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return {
      role: data.rol as AuthProfile['role'],
      businessId: data.rol === 'personal' ? data.empresa_personal_actual_id : data.empresa_id,
    };
  }, []);

  const clearAuthenticatedState = useCallback(async () => {
    isSigningOut.current = true;
    profileResolutionSessionId.current = null;
    setSession(null);
    setProfile(null);
    await getSupabase().auth.signOut().catch(() => undefined);
  }, []);

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    // A new login attempt must be allowed to update auth state even if the
    // previous logout was still completing.
    isSigningOut.current = false;
    if (isDemoSkipAuth) {
      return 'La demostración no usa correo y contraseña.';
    }
    if (!isSupabaseConfigured) {
      return 'Falta configurar Supabase. Copia apps/mobile/.env.example a apps/mobile/.env y completa los valores.';
    }
    isSigningIn.current = true;
    profileResolutionSessionId.current = null;
    setIsProfileLoading(true);
    setProfile(null);
    try {
      const { data, error } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        return translateAuthError(error.message);
      }
      if (!data.session) {
        return translateAuthError('email not confirmed');
      }
      // The auth listener can publish this session before signInWithPassword
      // resolves. Mark it as owned by this flow so the session effect does not
      // issue a second profile request.
      profileResolutionSessionId.current = data.session.user.id;
      setSession(data.session);
      try {
        const nextProfile = await fetchProfileData(data.session.user.id);
        if (!nextProfile) {
          throw new Error('profile load failed');
        }
        setProfile(nextProfile);
      } catch {
        await clearAuthenticatedState();
        return translateAuthError('profile load failed');
      }
      return null;
    } catch (reason) {
      return translateAuthError(reason instanceof Error ? reason.message : '');
    } finally {
      isSigningIn.current = false;
      setIsProfileLoading(false);
    }
  }, [clearAuthenticatedState, fetchProfileData]);

  const signUp = useCallback<AuthContextValue['signUp']>(async (email, password, metadata) => {
    if (isDemoSkipAuth) {
      return 'La demostración no usa correo y contraseña.';
    }
    if (!isSupabaseConfigured) {
      return 'Falta configurar Supabase. Copia apps/mobile/.env.example a apps/mobile/.env y completa los valores.';
    }
    try {
      const { data, error } = await getSupabase().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nombre: metadata?.name?.trim() || null,
            worker_intent: metadata?.workerIntent ?? false,
          },
        },
      });
      if (error) {
        return translateAuthError(error.message);
      }
      if (data.session) {
        isSigningOut.current = false;
        setSession(data.session);
        try {
          const nextProfile = await fetchProfileData(data.session.user.id);
          if (!nextProfile) {
            throw new Error('profile load failed');
          }
          setProfile(nextProfile);
        } catch {
          await clearAuthenticatedState();
          return translateAuthError('profile load failed');
        }
      }
      return null;
    } catch (reason) {
      return translateAuthError(reason instanceof Error ? reason.message : '');
    }
  }, [clearAuthenticatedState, fetchProfileData]);

  const signOut = useCallback(async () => {
    if (isDemoSkipAuth) return;
    if (signOutPromise.current) return signOutPromise.current;

    // Clear local state before waiting for Supabase or its auth listener. The
    // app guard can then perform the only navigation back to public launch.
    isSigningOut.current = true;
    setSession(null);
    setProfile(null);
    setIsRestoring(false);
    setIsProfileLoading(false);

    const promise = getSupabase().auth.signOut().then(() => undefined, () => undefined).finally(() => {
      signOutPromise.current = null;
    });
    signOutPromise.current = promise;
    return promise;
  }, []);

  const reloadProfile = useCallback(async (): Promise<AuthProfile | null> => {
    if (isDemoSkipAuth) {
      setProfile(demoProfile);
      return demoProfile;
    }
    const userId = session?.user.id;
    if (!userId) {
      setProfile(null);
      return null;
    }

    setIsProfileLoading(true);
    try {
      const nextProfile = await fetchProfileData(userId);
      setProfile(nextProfile);
      return nextProfile;
    } finally {
      setIsProfileLoading(false);
    }
  }, [fetchProfileData, session?.user.id]);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }

    if (isSigningIn.current || profileResolutionSessionId.current === session.user.id) {
      profileResolutionSessionId.current = null;
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
