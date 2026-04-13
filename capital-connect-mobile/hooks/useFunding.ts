import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { FundingRound } from '../types';

export function useFunding() {
  const [rounds, setRounds] = useState<FundingRound[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRounds = useCallback(async (stage?: string) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('funding_rounds')
        .select('*')
        .order('announced_at', { ascending: false })
        .limit(50);
      if (stage) query = query.eq('stage', stage);
      const { data, error: err } = await query;
      if (err) throw err;
      setRounds(data ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load funding rounds');
    } finally {
      setLoading(false);
    }
  }, []);

  return { rounds, loading, error, fetchRounds };
}
