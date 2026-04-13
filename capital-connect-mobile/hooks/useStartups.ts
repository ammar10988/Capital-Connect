import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface FounderProfile {
  id: string;
  profile_id: string;
  company_name: string | null;
  sector: string | null;
  stage: string | null;
  arr: string | null;
  mom_growth: string | null;
  raise_amount: string | null;
  bio: string | null;
  problem_statement: string | null;
  target_market: string | null;
  website: string | null;
  linkedin_url: string | null;
  team_size: number | null;
  founded_year: number | null;
  funding_purpose: string | null;
  views_count: number;
  verification_status: string;
  trust_badges: string[];
  pitch_deck_url: string | null;
  created_at: string;
  profile: {
    first_name: string;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useStartups() {
  const [startups, setStartups] = useState<FounderProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStartups = useCallback(async (search?: string, sector?: string, stage?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('founder_profiles')
        .select('*, profile:profiles(first_name, last_name, avatar_url)')
        .eq('founder_type', 'active')
        .order('created_at', { ascending: false });

      if (err) throw err;

      let results: FounderProfile[] = (data ?? []) as unknown as FounderProfile[];

      if (search) {
        const q = search.toLowerCase();
        results = results.filter(s =>
          (s.company_name ?? '').toLowerCase().includes(q) ||
          (s.sector ?? '').toLowerCase().includes(q) ||
          (s.bio ?? '').toLowerCase().includes(q)
        );
      }
      if (sector && sector !== 'All') {
        results = results.filter(s => s.sector === sector);
      }
      if (stage && stage !== 'All') {
        results = results.filter(s => s.stage === stage);
      }

      setStartups(results);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load startups');
    } finally {
      setLoading(false);
    }
  }, []);

  return { startups, loading, error, fetchStartups };
}
