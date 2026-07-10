-- Run in Supabase SQL Editor (optional — for "Notify me when live" emails)

create table if not exists public.notify_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.notify_signups enable row level security;

-- No public read — inserts via service role API only
