import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole, InvestorType, FounderType } from '../types';
import {
  clearBackgroundedAt,
  clearSessionTracking,
  formatAuthError,
  hasTrackedSessionExpired,
  isVerifiedUser,
  markBackgrounded,
  markSessionStarted,
} from '../lib/authSecurity';
import { loginWithGateway, registerWithGateway } from '../lib/authGateway';

interface CompleteOnboardingData {
  role: UserRole;
  investorType?: InvestorType;
  founderType?: FounderType;
  investorProfileData?: Record<string, unknown>;
  founderProfileData?: Record<string, unknown>;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: (data: CompleteOnboardingData) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data as Profile);
    return data as Profile | null;
  }, []);

  useEffect(() => {
    const applySession = async (nextSession: Session | null, shouldTrackStart = false) => {
      if (!nextSession?.user) {
        setSession(null);
        setUser(null);
        setProfile(null);
        await clearSessionTracking();
        setLoading(false);
        return;
      }

      if (!isVerifiedUser(nextSession.user)) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        await clearSessionTracking();
        setLoading(false);
        return;
      }

      if (await hasTrackedSessionExpired()) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        await clearSessionTracking();
        setLoading(false);
        return;
      }

      if (shouldTrackStart) {
        await markSessionStarted();
      } else {
        await clearBackgroundedAt();
      }

      setSession(nextSession);
      setUser(nextSession.user);
      await fetchProfile(nextSession.user.id);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      void applySession(session, false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      void applySession(nextSession, event === 'SIGNED_IN');
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        void markBackgrounded();
      }

      if (nextState === 'active' && user) {
        void (async () => {
          if (await hasTrackedSessionExpired()) {
            await supabase.auth.signOut();
          } else {
            await clearBackgroundedAt();
          }
        })();
      }
    });

    return () => subscription.remove();
  }, [user]);

  async function signIn(email: string, password: string) {
    try {
      await loginWithGateway(email, password);
      await markSessionStarted();
    } catch (error) {
      throw new Error(formatAuthError(error));
    }
  }

  async function signUp(email: string, password: string, firstName: string, lastName: string) {
    try {
      await registerWithGateway({
        email,
        password,
        redirectTo: process.env.EXPO_PUBLIC_AUTH_VERIFY_REDIRECT_URL ?? 'http://localhost:5173/auth/verify-email',
        data: { firstName, lastName },
      });
    } catch (error) {
      throw new Error(formatAuthError(error));
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    await clearSessionTracking();
    setProfile(null);
  }

  async function completeOnboarding(data: CompleteOnboardingData) {
    if (!user) throw new Error('User session not found. Please log in again.');

    // 1. Upsert the profiles row with role + onboarding_completed
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        role: data.role,
        investor_type: data.investorType ?? null,
        founder_type: data.founderType ?? null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (profileError) throw new Error(profileError.message);

    // 2. Upsert investor_profiles if role = investor
    if (data.role === 'investor' && data.investorProfileData) {
      const { error: invError } = await supabase
        .from('investor_profiles')
        .upsert({
          user_id: user.id,
          ...data.investorProfileData,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (invError) console.error('[completeOnboarding] investor_profiles:', invError.message);
    }

    // 3. Upsert founder_profiles if role = founder
    if (data.role === 'founder' && data.founderProfileData) {
      const { error: founderError } = await supabase
        .from('founder_profiles')
        .upsert({
          profile_id: user.id,
          ...data.founderProfileData,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'profile_id' });

      if (founderError) console.error('[completeOnboarding] founder_profiles:', founderError.message);
    }

    // 4. Refresh in-memory profile so the redirect guard unlocks
    await fetchProfile(user.id);
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) throw error;
    await fetchProfile(user.id);
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      completeOnboarding,
      updateProfile,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}
