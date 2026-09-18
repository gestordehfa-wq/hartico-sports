-- Generated from apps/football-lite/supabase/migrations/001_identity_seasons.sql by tooling/assemble-supabase.mjs. Do not edit this copy.
create extension if not exists pgcrypto with schema extensions;

create schema if not exists football;
revoke all on schema football from public, anon, authenticated;
grant usage on schema football to anon, authenticated;
alter default privileges in schema football revoke all on tables from public, anon, authenticated;
alter default privileges in schema football revoke all on sequences from public, anon, authenticated;
alter default privileges in schema football revoke all on functions from public, anon, authenticated;

create table football.role_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role = 'admin'),
  created_at timestamptz not null default now()
);
alter table football.role_memberships enable row level security;

create or replace function football.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from football.role_memberships
    where user_id = auth.uid() and role = 'admin'
  );
$$;
revoke all on function football.is_admin() from public, anon, authenticated;
grant execute on function football.is_admin() to authenticated;

create or replace function football.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(football.is_admin(), false); $$;
revoke all on function football.current_user_is_admin() from public, anon;
grant execute on function football.current_user_is_admin() to authenticated;

create policy "admins read memberships" on football.role_memberships
for select to authenticated using (football.is_admin());

create table football.seasons (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_date_range check (end_date >= start_date)
);
create unique index seasons_one_active on football.seasons ((status)) where status = 'active';
alter table football.seasons enable row level security;
create policy "public reads published seasons" on football.seasons for select to anon using (status in ('active', 'completed', 'archived'));
create policy "authenticated reads seasons" on football.seasons for select to authenticated using (true);
create policy "admins insert seasons" on football.seasons for insert to authenticated with check (football.is_admin());
create policy "admins update seasons" on football.seasons for update to authenticated using (football.is_admin()) with check (football.is_admin());
create policy "admins delete seasons" on football.seasons for delete to authenticated using (football.is_admin());

grant select on football.seasons to anon;
grant select, insert, update, delete on football.seasons to authenticated;
grant select on football.role_memberships to authenticated;
