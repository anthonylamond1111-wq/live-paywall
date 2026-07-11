-- One active auth session per user (enforced in app; exempt admin email).
-- Run in Supabase SQL editor.

create table if not exists public.user_active_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  session_id text not null,
  updated_at timestamptz not null default now()
);

create index if not exists user_active_sessions_session_id_idx
  on public.user_active_sessions (session_id);

alter table public.user_active_sessions enable row level security;

-- No client policies — service role only.
