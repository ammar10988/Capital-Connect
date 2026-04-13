import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';
import { clearSessionTracking, formatAuthError, markSessionStarted } from '../lib/authSecurity';
import { loginWithGateway, registerWithGateway } from '../lib/authGateway';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data as Profile);
    setLoading(false);
  }

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
  }

  return { user, session, profile, loading, signIn, signUp, signOut };
}
