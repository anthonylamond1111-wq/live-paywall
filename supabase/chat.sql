-- Run this in Supabase → SQL Editor (after purchases.sql)

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_created_at_idx
  on public.chat_messages (created_at asc);

alter table public.chat_messages enable row level security;

create or replace function public.user_has_purchase()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.purchases where user_id = auth.uid()
  );
$$;

grant execute on function public.user_has_purchase() to authenticated;

create policy "Paid users can read chat"
  on public.chat_messages
  for select
  to authenticated
  using (public.user_has_purchase());

create policy "Paid users can post chat"
  on public.chat_messages
  for insert
  to authenticated
  with check (auth.uid() = user_id and public.user_has_purchase());

-- Enable realtime: Supabase Dashboard → Database → Replication → chat_messages
-- Or run (if not already on publication):
do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
end $$;

alter table public.chat_messages replica identity full;
