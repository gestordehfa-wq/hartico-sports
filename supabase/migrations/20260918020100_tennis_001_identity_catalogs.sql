-- Generated from apps/tennis/supabase/migrations/001_identity_catalogs.sql by tooling/assemble-supabase.mjs. Do not edit this copy.
create extension if not exists pgcrypto with schema extensions;

create schema if not exists tennis;
revoke all on schema tennis from public, anon, authenticated;
grant usage on schema tennis to anon, authenticated;
alter default privileges in schema tennis revoke all on tables from public, anon, authenticated;
alter default privileges in schema tennis revoke all on sequences from public, anon, authenticated;
alter default privileges in schema tennis revoke all on functions from public, anon, authenticated;

create table tennis.role_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role = 'admin'),
  created_at timestamptz not null default now()
);
alter table tennis.role_memberships enable row level security;

create or replace function tennis.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from tennis.role_memberships where user_id = auth.uid() and role = 'admin'); $$;
revoke all on function tennis.is_admin() from public, anon, authenticated;
grant execute on function tennis.is_admin() to authenticated;

create or replace function tennis.current_user_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(tennis.is_admin(), false); $$;
revoke all on function tennis.current_user_is_admin() from public, anon;
grant execute on function tennis.current_user_is_admin() to authenticated;
create policy "admins read memberships" on tennis.role_memberships for select to authenticated using (tennis.is_admin());
grant select on tennis.role_memberships to authenticated;

create table tennis.seasons (
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
create unique index seasons_one_active on tennis.seasons ((status)) where status = 'active';

create table tennis.players (
  id uuid primary key default extensions.gen_random_uuid(),
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  real_name text,
  nationality text not null check (length(trim(nationality)) between 1 and 80),
  country_code text not null check (country_code ~ '^[A-Z]{2,3}$'),
  avatar_url text,
  handedness text check (handedness in ('right', 'left')),
  status text not null default 'active' check (status in ('active', 'inactive', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tennis.tournaments (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 120),
  short_name text not null check (length(trim(short_name)) between 1 and 40),
  logo_url text,
  default_surface text not null check (default_surface in ('hard', 'clay', 'grass', 'indoor', 'custom')),
  category text not null check (category in ('major', 'masters', 'standard', 'finals', 'custom')),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tennis.tournament_editions (
  id uuid primary key default extensions.gen_random_uuid(),
  tournament_id uuid not null references tennis.tournaments(id) on delete restrict,
  season_id uuid not null references tennis.seasons(id) on delete restrict,
  name text,
  surface text not null check (surface in ('hard', 'clay', 'grass', 'indoor', 'custom')),
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft', 'registration', 'active', 'completed', 'cancelled')),
  draw_size integer not null check (draw_size in (4, 8, 16)),
  best_of integer not null default 3 check (best_of in (1, 3, 5)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_editions_date_range check (end_date >= start_date),
  unique (tournament_id, season_id),
  unique (id, season_id)
);

alter table tennis.seasons enable row level security;
alter table tennis.players enable row level security;
alter table tennis.tournaments enable row level security;
alter table tennis.tournament_editions enable row level security;

create policy "public reads published seasons" on tennis.seasons for select to anon using (status in ('active', 'completed', 'archived'));
create policy "public reads players" on tennis.players for select to anon using (status in ('active', 'retired'));
create policy "public reads tournaments" on tennis.tournaments for select to anon using (status in ('active', 'archived'));
create policy "public reads editions" on tennis.tournament_editions for select to anon using (status in ('active', 'completed'));
create policy "authenticated reads seasons" on tennis.seasons for select to authenticated using (true);
create policy "authenticated reads players" on tennis.players for select to authenticated using (true);
create policy "authenticated reads tournaments" on tennis.tournaments for select to authenticated using (true);
create policy "authenticated reads editions" on tennis.tournament_editions for select to authenticated using (true);

create policy "admins insert seasons" on tennis.seasons for insert to authenticated with check (tennis.is_admin());
create policy "admins update seasons" on tennis.seasons for update to authenticated using (tennis.is_admin()) with check (tennis.is_admin());
create policy "admins delete seasons" on tennis.seasons for delete to authenticated using (tennis.is_admin());
create policy "admins insert players" on tennis.players for insert to authenticated with check (tennis.is_admin());
create policy "admins update players" on tennis.players for update to authenticated using (tennis.is_admin()) with check (tennis.is_admin());
create policy "admins delete players" on tennis.players for delete to authenticated using (tennis.is_admin());
create policy "admins insert tournaments" on tennis.tournaments for insert to authenticated with check (tennis.is_admin());
create policy "admins update tournaments" on tennis.tournaments for update to authenticated using (tennis.is_admin()) with check (tennis.is_admin());
create policy "admins delete tournaments" on tennis.tournaments for delete to authenticated using (tennis.is_admin());
create policy "admins insert editions" on tennis.tournament_editions for insert to authenticated with check (tennis.is_admin());
create policy "admins update editions" on tennis.tournament_editions for update to authenticated using (tennis.is_admin()) with check (tennis.is_admin());
create policy "admins delete editions" on tennis.tournament_editions for delete to authenticated using (tennis.is_admin());

grant select on tennis.seasons, tennis.players, tennis.tournaments, tennis.tournament_editions to anon;
grant select, insert, update, delete on tennis.seasons, tennis.players, tennis.tournaments, tennis.tournament_editions to authenticated;
