create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 120),
  short_name text not null check (length(trim(short_name)) between 1 and 30),
  type text not null check (type in ('league', 'cup', 'supercup')),
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, season_id)
);
create index competitions_season on public.competitions(season_id);
alter table public.competitions enable row level security;
create policy "public reads published competitions" on public.competitions for select to anon using (status in ('active', 'completed', 'archived'));
create policy "authenticated reads competitions" on public.competitions for select to authenticated using (true);
create policy "admins insert competitions" on public.competitions for insert to authenticated with check (app_private.is_admin());
create policy "admins update competitions" on public.competitions for update to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy "admins delete competitions" on public.competitions for delete to authenticated using (app_private.is_admin());

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  short_name text not null check (length(trim(short_name)) between 1 and 40),
  code text not null unique check (code ~ '^[A-Z0-9]{2,6}$'),
  country text not null check (length(trim(country)) between 2 and 80),
  country_code text not null check (country_code ~ '^[A-Z]{2,3}$'),
  logo_url text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.teams enable row level security;
create policy "public reads teams" on public.teams for select to anon using (status in ('active', 'archived'));
create policy "authenticated reads teams" on public.teams for select to authenticated using (true);
create policy "admins insert teams" on public.teams for insert to authenticated with check (app_private.is_admin());
create policy "admins update teams" on public.teams for update to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy "admins delete teams" on public.teams for delete to authenticated using (app_private.is_admin());

create table public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  real_name text,
  nationality text not null check (length(trim(nationality)) between 2 and 80),
  country_code text not null check (country_code ~ '^[A-Z]{2,3}$'),
  position text not null check (position in ('POR', 'DEF', 'MED', 'ATK')),
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.players enable row level security;
create policy "public reads players" on public.players for select to anon using (status in ('active', 'archived'));
create policy "authenticated reads players" on public.players for select to authenticated using (true);
create policy "admins insert players" on public.players for insert to authenticated with check (app_private.is_admin());
create policy "admins update players" on public.players for update to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy "admins delete players" on public.players for delete to authenticated using (app_private.is_admin());

create table public.season_player_rosters (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  player_id uuid not null references public.players(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  start_date date,
  end_date date,
  role text not null default 'player' check (role in ('player', 'captain', 'loan')),
  status text not null default 'active' check (status in ('active', 'completed', 'released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rosters_date_range check (end_date is null or start_date is null or end_date >= start_date),
  unique (season_id, player_id, team_id, start_date)
);
create index rosters_season_team on public.season_player_rosters(season_id, team_id);
alter table public.season_player_rosters enable row level security;
create policy "public reads published rosters" on public.season_player_rosters for select to anon using (exists (select 1 from public.seasons s where s.id = season_id and s.status in ('active', 'completed', 'archived')));
create policy "authenticated reads rosters" on public.season_player_rosters for select to authenticated using (true);
create policy "admins insert rosters" on public.season_player_rosters for insert to authenticated with check (app_private.is_admin());
create policy "admins update rosters" on public.season_player_rosters for update to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy "admins delete rosters" on public.season_player_rosters for delete to authenticated using (app_private.is_admin());

grant select on public.competitions, public.teams, public.players, public.season_player_rosters to anon;
grant select, insert, update, delete on public.competitions, public.teams, public.players, public.season_player_rosters to authenticated;
