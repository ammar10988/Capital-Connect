import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface PublicStartup {
  id: string;
  company_name: string;
  tagline: string | null;
  sector: string | null;
  city: string | null;
  country: string;
  stage: string | null;
  funding_amount: string | null;
  funding_amount_usd: number | null;
  funding_round: string | null;
  currency: string | null;
  investor_name: string | null;
  description: string | null;
  source_url: string | null;
  source_name: string | null;
  announced_date: string | null;
  is_hot: boolean;
  trend_signal: string | null;
  rank: number | null;
  updated_at: string;
}

export interface SectorStat {
  name: string;
  count: number;
  totalUsd: number;
  topCompanies: string[];
}

export function useTrending() {
  const [startups, setStartups] = useState<PublicStartup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('public_startups')
        .select('*')
        .order('rank', { ascending: true })
        .limit(100);
      if (err) throw err;
      setStartups(data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load trending data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Compute sector stats client-side from startups data
  const getSectorStats = (data: PublicStartup[]): SectorStat[] => {
    const sectorMap: Record<string, { count: number; totalUsd: number; companies: string[] }> = {};
    for (const s of data) {
      if (!s.sector) continue;
      if (!sectorMap[s.sector]) sectorMap[s.sector] = { count: 0, totalUsd: 0, companies: [] };
      sectorMap[s.sector].count++;
      sectorMap[s.sector].totalUsd += s.funding_amount_usd ?? 0;
      if (sectorMap[s.sector].companies.length < 3) sectorMap[s.sector].companies.push(s.company_name);
    }
    return Object.entries(sectorMap)
      .map(([name, d]) => ({ name, count: d.count, totalUsd: d.totalUsd, topCompanies: d.companies }))
      .sort((a, b) => b.count - a.count);
  };

  return { startups, loading, error, fetchTrending, getSectorStats };
}
