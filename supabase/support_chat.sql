-- Run in Supabase → SQL Editor

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id text not null,
  role text not null check (role in ('visitor', 'staff')),
  body text not null check (char_length(body) between 1 and 1000),
  email text,
  created_at timestamptz not null default now()
);

create index if not exists support_messages_thread_created_idx
  on public.support_messages (thread_id, created_at asc);

create index if not exists support_messages_created_at_idx
  on public.support_messages (created_at desc);

alter table public.support_messages enable row level security;
