-- Generated from apps/racing/supabase/migrations/001_core_identity.sql by tooling/assemble-supabase.mjs. Do not edit this copy.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

create schema if not exists racing;
revoke all on schema racing from public, anon, authenticated;
grant usage on schema racing to anon, authenticated;
alter default privileges in schema racing revoke all on tables from public, anon, authenticated;
alter default privileges in schema racing revoke all on sequences from public, anon, authenticated;
alter default privileges in schema racing revoke all on functions from public, anon, authenticated;

create table racing.role_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role = 'admin'),
  created_at timestamptz not null default now()
);
alter table racing.role_memberships enable row level security;

create or replace function racing.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select auth.uid() is not null and exists (
    select 1 from racing.role_memberships
    where user_id = auth.uid() and role = 'admin'
  );
$$;
revoke all on function racing.is_admin() from public, anon, authenticated;
grant execute on function racing.is_admin() to authenticated;

create or replace function racing.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$ select racing.is_admin(); $$;
revoke all on function racing.current_user_is_admin() from public, anon;
grant execute on function racing.current_user_is_admin() to authenticated;

create or replace function racing.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function racing.set_updated_at() from public, anon, authenticated;

comment on table racing.role_memberships is 'Membresías mínimas administradas fuera de la API pública; v0.1 solo admite admin.';
