create table if not exists public.cache_entries (
  key text primary key,
  value jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists cache_entries_expires_at_idx
  on public.cache_entries (expires_at);

alter table public.cache_entries enable row level security;

revoke all on table public.cache_entries from anon;
grant select on table public.cache_entries to authenticated;

drop policy if exists "Authenticated users can read cache entries" on public.cache_entries;
create policy "Authenticated users can read cache entries"
  on public.cache_entries
  for select
  to authenticated
  using (true);
