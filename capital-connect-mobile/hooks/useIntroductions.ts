import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface IntroRequest {
  id: string;
  investor_id: string;
  founder_id: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  investor: { first_name: string; last_name: string | null; company: string | null } | null;
  founder: { first_name: string; last_name: string | null; company: string | null } | null;
}

export function useIntroductions(userId: string | undefined, role: 'investor' | 'founder' | null | undefined) {
  const [intros, setIntros] = useState<IntroRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntros = useCallback(async () => {
    if (!userId || !role) return;
    setLoading(true);
    setError(null);
    try {
      const column = role === 'investor' ? 'investor_id' : 'founder_id';
      const { data, error: err } = await supabase
        .from('founder_intro_requests')
        .select(`
          id, investor_id, founder_id, message, status, created_at,
          investor:investor_id ( first_name, last_name, company ),
          founder:founder_id ( first_name, last_name, company )
        `)
        .eq(column, userId)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setIntros((data ?? []) as unknown as IntroRequest[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load introductions');
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  const updateStatus = useCallback(async (
    introId: string,
    status: 'accepted' | 'declined'
  ) => {
    const { error } = await supabase
      .from('founder_intro_requests')
      .update({ status })
      .eq('id', introId);
    if (error) throw error;
    setIntros(prev =>
      prev.map(i => i.id === introId ? { ...i, status } : i)
    );
  }, []);

  return { intros, loading, error, fetchIntros, updateStatus };
}
