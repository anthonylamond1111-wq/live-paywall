-- Run in Supabase SQL Editor (after chat.sql)

create table if not exists public.chat_moderation (
  user_id uuid primary key references auth.users (id) on delete cascade,
  banned boolean not null default false,
  timeout_until timestamptz,
  display_name text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create index if not exists chat_moderation_timeout_idx
  on public.chat_moderation (timeout_until);

alter table public.chat_moderation enable row level security;

-- Moderation is managed via service role API only (no public policies)
