-- Run this in Supabase → SQL Editor (required for saving purchases)

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_session_id text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists purchases_user_id_idx on public.purchases (user_id);

alter table public.purchases enable row level security;

drop policy if exists "Users can read own purchases" on public.purchases;
create policy "Users can read own purchases"
  on public.purchases
  for select
  to authenticated
  using (auth.uid() = user_id);
