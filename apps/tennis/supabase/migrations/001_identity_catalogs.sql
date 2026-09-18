create schema if not exists app_private;

create table public.role_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role = 'admin'),
  created_at timestamptz not null default now()
);
alter table public.role_memberships enable row level security;

create or replace function app_private.is_admin(actor uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.role_memberships where user_id = actor and role = 'admin'); $$;
revoke all on function app_private.is_admin(uuid) from public, anon;
grant execute on function app_private.is_admin(uuid) to authenticated;

create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(app_private.is_admin(auth.uid()), false); $$;
revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated;
create policy "admins read memberships" on public.role_memberships for select to authenticated using (app_private.is_admin());
grant select on public.role_memberships to authenticated;

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_date_range check (end_date >= start_date)
);
create unique index seasons_one_active on public.seasons ((status)) where status = 'active';

create table public.players (
  id uuid primary key default gen_random_uuid(),
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

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 120),
  short_name text not null check (length(trim(short_name)) between 1 and 40),
  logo_url text,
  default_surface text not null check (default_surface in ('hard', 'clay', 'grass', 'indoor', 'custom')),
  category text not null check (category in ('major', 'masters', 'standard', 'finals', 'custom')),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournament_editions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict,
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

alter table public.seasons enable row level security;
alter table public.players enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_editions enable row level security;

create policy "public reads published seasons" on public.seasons for select to anon using (status in ('active', 'completed', 'archived'));
create policy "public reads players" on public.players for select to anon using (status in ('active', 'retired'));
create policy "public reads tournaments" on public.tournaments for select to anon using (status in ('active', 'archived'));
create policy "public reads editions" on public.tournament_editions for select to anon using (status in ('active', 'completed'));
create policy "authenticated reads seasons" on public.seasons for select to authenticated using (true);
create policy "authenticated reads players" on public.players for select to authenticated using (true);
create policy "authenticated reads tournaments" on public.tournaments for select to authenticated using (true);
create policy "authenticated reads editions" on public.tournament_editions for select to authenticated using (true);

create policy "admins insert seasons" on public.seasons for insert to authenticated with check (app_private.is_admin());
create policy "admins update seasons" on public.seasons for update to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy "admins delete seasons" on public.seasons for delete to authenticated using (app_private.is_admin());
create policy "admins insert players" on public.players for insert to authenticated with check (app_private.is_admin());
create policy "admins update players" on public.players for update to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy "admins delete players" on public.players for delete to authenticated using (app_private.is_admin());
create policy "admins insert tournaments" on public.tournaments for insert to authenticated with check (app_private.is_admin());
create policy "admins update tournaments" on public.tournaments for update to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy "admins delete tournaments" on public.tournaments for delete to authenticated using (app_private.is_admin());
create policy "admins insert editions" on public.tournament_editions for insert to authenticated with check (app_private.is_admin());
create policy "admins update editions" on public.tournament_editions for update to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy "admins delete editions" on public.tournament_editions for delete to authenticated using (app_private.is_admin());

grant select on public.seasons, public.players, public.tournaments, public.tournament_editions to anon;
grant select, insert, update, delete on public.seasons, public.players, public.tournaments, public.tournament_editions to authenticated;
