-- Run this in Supabase → SQL Editor
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_session_id text not null unique,
  created_at timestamptz not null default now()
);

alter table public.purchases enable row level security;

create policy "Users can read own purchases"
  on public.purchases
  for select
  using (auth.uid() = user_id);
