create extension if not exists pg_trgm;

-- profiles
create index if not exists profiles_role_idx
  on public.profiles (role);

-- `profiles.user_id` does not exist in this schema.
-- `profiles.id` is already the primary key that references auth.users(id).

-- auth/security
create index if not exists auth_attempts_identifier_hash_idx
  on public.auth_attempts (identifier_hash);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- founder discovery
create index if not exists founder_profiles_founder_type_created_idx
  on public.founder_profiles (founder_type, created_at desc);

create index if not exists founder_profiles_founder_type_views_created_idx
  on public.founder_profiles (founder_type, views_count desc, created_at desc);

create index if not exists founder_profiles_company_name_trgm_idx
  on public.founder_profiles using gin (company_name gin_trgm_ops);

-- investor discovery
create index if not exists investor_profiles_location_idx
  on public.investor_profiles (location)
  where location is not null;

create index if not exists scraped_investors_location_idx
  on public.scraped_investors (location)
  where location is not null;

-- intros / activity feeds
create index if not exists introductions_founder_initiated_idx
  on public.introductions (founder_id, initiated_at desc)
  where founder_id is not null;

create index if not exists introductions_investor_initiated_idx
  on public.introductions (investor_id, initiated_at desc);

create index if not exists deck_downloads_startup_downloaded_idx
  on public.deck_downloads (startup_id, downloaded_at desc);

create index if not exists event_rsvps_user_id_idx
  on public.event_rsvps (user_id);

create index if not exists portfolio_items_investor_date_idx
  on public.portfolio_items (investor_id, investment_date desc);

-- content feeds
create index if not exists news_articles_title_trgm_idx
  on public.news_articles using gin (title gin_trgm_ops);
