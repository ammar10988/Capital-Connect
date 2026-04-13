export type UserRole = 'investor' | 'founder';
export type InvestorType = 'angel' | 'venture-capital' | 'bank' | 'nbfc' | 'family-office' | 'corporate-venture';
export type FounderType = 'active' | 'idea';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string | null;
  company: string | null;
  role: UserRole | null;
  investor_type: InvestorType | null;
  founder_type: FounderType | null;
  onboarding_completed: boolean;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestorProfile {
  id: string;
  user_id: string;
  title: string | null;
  bio: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  location: string | null;
  investment_thesis: string | null;
  sectors: string[];
  stage_preference: string[];
  geography: string[];
  ticket_size_min: number | null;
  ticket_size_max: number | null;
  fund_name: string | null;
  actively_investing: boolean;
  is_verified: boolean;
  portfolio_count: number;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface ScrapedInvestor {
  id: string;
  name: string;
  institution: string | null;
  title: string | null;
  location: string | null;
  sectors: string[];
  stages: string[];
  check_min: string | null;
  check_max: string | null;
  investment_thesis: string | null;
  portfolio_count: number | null;
  verified: boolean;
  response_rate: string | null;
  actively_investing: boolean;
  email: string | null;
  website: string | null;
  linkedin_url: string | null;
  is_new: boolean;
  date_added: string;
  is_platform_member?: boolean;
}

export interface FounderProfile {
  id: string;
  profile_id: string;
  founder_type: FounderType;
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
  pitch_deck_url: string | null;
  verification_status: string;
  views_count: number;
  created_at: string;
  profile?: Profile;
}

export interface StartupApplication {
  id: string;
  company_name: string;
  tagline: string | null;
  sector: string | null;
  stage: string | null;
  arr_usd: number | null;
  growth_rate_pct: number | null;
  funding_ask_usd: number | null;
  team_size: number | null;
  total_views: number | null;
  total_bookmarks: number | null;
  trust_badge: boolean;
  status: string;
  created_at: string;
}

export interface FundingRound {
  id: string;
  company_name: string;
  lead_investor: string | null;
  amount_usd: number | null;
  round_type: string | null;
  sector: string | null;
  location: string | null;
  stage: string | null;
  country: string | null;
  description: string | null;
  announced_at: string | null;
  source_url: string;
  source_name: string;
  created_at: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string | null;
  url: string | null;
  source_url: string | null;
  source_name: string | null;
  image_url: string | null;
  category: string | null;
  sector_tags: string[];
  is_hot: boolean;
  is_featured: boolean;
  published_at: string | null;
  fetched_at: string | null;
  indexed_at: string | null;
}
