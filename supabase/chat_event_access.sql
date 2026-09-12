-- Run in Supabase SQL Editor if chat.sql was already applied with the old policy.

create or replace function public.user_has_purchase()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.purchases
    where user_id = auth.uid()
      and created_at >= '2026-09-12T00:00:00.000Z'::timestamptz
  );
$$;
