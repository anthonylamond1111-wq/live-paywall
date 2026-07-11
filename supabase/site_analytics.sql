-- Live visitor heartbeats for private admin dashboard (service role only).
-- Run in Supabase SQL Editor.

create table if not exists public.site_visitor_sessions (
  visitor_id text primary key,
  view text not null default 'site',
  path text not null default '/',
  last_seen timestamptz not null default now()
);

create index if not exists site_visitor_sessions_last_seen_idx
  on public.site_visitor_sessions (last_seen desc);

create index if not exists site_visitor_sessions_view_last_seen_idx
  on public.site_visitor_sessions (view, last_seen desc);

alter table public.site_visitor_sessions enable row level security;

-- No public policies — inserts via service role API only.
