-- One active paid device per receipt email.
-- Run in Supabase SQL Editor.

create table if not exists public.paid_device_access (
  email text primary key,
  stripe_session_id text not null,
  device_token text not null,
  updated_at timestamptz not null default now()
);

create index if not exists paid_device_access_session_idx
  on public.paid_device_access (stripe_session_id);

create index if not exists paid_device_access_token_idx
  on public.paid_device_access (device_token);

alter table public.paid_device_access enable row level security;

-- No public policies — service role only.
