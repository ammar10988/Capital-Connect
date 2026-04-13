import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ScrapedInvestor, InvestorProfile } from '../types';

export function useInvestors() {
  const [investors, setInvestors] = useState<ScrapedInvestor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvestors = useCallback(async (search?: string, sector?: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch scraped investors
      let query = supabase
        .from('scraped_investors')
        .select('id, name, institution, title, location, sectors, stages, check_min, check_max, email, website, linkedin_url, response_rate, actively_investing, verified, is_new, date_added, investment_thesis, portfolio_count')
        .order('date_added', { ascending: false })
        .limit(100);
      if (sector) query = query.contains('sectors', [sector]);

      // Fetch platform investors
      const platformQuery = supabase
        .from('investor_profiles')
        .select('id, user_id, title, location, sectors, stage_preference, ticket_size_min, ticket_size_max, investment_thesis, linkedin_url, website_url, actively_investing, is_verified, response_rate, portfolio_count, created_at, fund_name, bank_name, profile:profiles(first_name, last_name, company)')
        .limit(50);

      const [scrapedRes, platformRes] = await Promise.all([query, platformQuery]);
      if (scrapedRes.error) throw scrapedRes.error;

      const scraped: ScrapedInvestor[] = (scrapedRes.data ?? []).map(r => ({
        ...r,
        sectors: r.sectors ?? [],
        stages: r.stages ?? [],
        portfolio_count: r.portfolio_count ?? null,
        is_platform_member: false,
      }));

      const platform: ScrapedInvestor[] = (platformRes.data ?? []).map((ip: any) => {
        const p = ip.profile;
        const name = p ? `${p.first_name} ${p.last_name ?? ''}`.trim() : 'Capital Connect Investor';
        const institution = ip.fund_name || ip.bank_name || p?.company || '';
        return {
          id: `platform_${ip.id}`,
          name,
          institution,
          title: ip.title,
          location: ip.location,
          sectors: ip.sectors ?? [],
          stages: ip.stage_preference ?? [],
          check_min: ip.ticket_size_min ? String(ip.ticket_size_min) : null,
          check_max: ip.ticket_size_max ? String(ip.ticket_size_max) : null,
          investment_thesis: ip.investment_thesis,
          portfolio_count: ip.portfolio_count,
          verified: ip.is_verified ?? false,
          response_rate: ip.response_rate,
          actively_investing: ip.actively_investing ?? true,
          email: null,
          website: ip.website_url,
          linkedin_url: ip.linkedin_url,
          is_new: false,
          date_added: ip.created_at,
          is_platform_member: true,
        };
      });

      let merged = [...platform, ...scraped];
      if (search) {
        const q = search.toLowerCase();
        merged = merged.filter(inv =>
          inv.name.toLowerCase().includes(q) ||
          (inv.institution ?? '').toLowerCase().includes(q) ||
          inv.sectors.some(s => s.toLowerCase().includes(q))
        );
      }
      setInvestors(merged);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load investors');
    } finally {
      setLoading(false);
    }
  }, []);

  return { investors, loading, error, fetchInvestors };
}
