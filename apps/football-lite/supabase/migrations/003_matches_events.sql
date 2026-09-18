create table public.matches (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null,
  season_id uuid not null,
  home_team_id uuid not null references public.teams(id) on delete restrict,
  away_team_id uuid not null references public.teams(id) on delete restrict,
  matchday integer check (matchday > 0),
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
  home_score integer check (home_score >= 0),
  away_score integer check (away_score >= 0),
  referee_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_competition_season foreign key (competition_id, season_id) references public.competitions(id, season_id) on delete restrict,
  constraint matches_different_teams check (home_team_id <> away_team_id),
  constraint matches_finished_score check (status <> 'finished' or (home_score is not null and away_score is not null))
);
create index matches_competition_schedule on public.matches(competition_id, scheduled_at);
create index matches_season on public.matches(season_id);
alter table public.matches enable row level security;
create policy "public reads published matches" on public.matches for select to anon using (
  exists (select 1 from public.seasons s where s.id = season_id and s.status in ('active', 'completed', 'archived'))
  and exists (select 1 from public.competitions c where c.id = competition_id and c.status in ('active', 'completed', 'archived'))
);
create policy "authenticated reads matches" on public.matches for select to authenticated using (true);
create policy "admins insert matches" on public.matches for insert to authenticated with check (app_private.is_admin());
create policy "admins update matches" on public.matches for update to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy "admins delete matches" on public.matches for delete to authenticated using (app_private.is_admin());

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  event_type text not null check (event_type in ('goal', 'assist', 'yellow_card', 'red_card', 'own_goal')),
  minute integer check (minute between 0 and 130),
  related_player_id uuid references public.players(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint event_distinct_players check (related_player_id is null or related_player_id <> player_id)
);
create index match_events_match on public.match_events(match_id, minute);
alter table public.match_events enable row level security;
create policy "public reads published events" on public.match_events for select to anon using (exists (select 1 from public.matches m where m.id = match_id));
create policy "authenticated reads events" on public.match_events for select to authenticated using (true);
create policy "admins insert events" on public.match_events for insert to authenticated with check (app_private.is_admin());
create policy "admins update events" on public.match_events for update to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy "admins delete events" on public.match_events for delete to authenticated using (app_private.is_admin());

create table public.match_player_appearances (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  starter boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);
create index appearances_player on public.match_player_appearances(player_id);
alter table public.match_player_appearances enable row level security;
create policy "public reads published appearances" on public.match_player_appearances for select to anon using (exists (select 1 from public.matches m where m.id = match_id));
create policy "authenticated reads appearances" on public.match_player_appearances for select to authenticated using (true);
create policy "admins insert appearances" on public.match_player_appearances for insert to authenticated with check (app_private.is_admin());
create policy "admins update appearances" on public.match_player_appearances for update to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy "admins delete appearances" on public.match_player_appearances for delete to authenticated using (app_private.is_admin());

grant select on public.matches, public.match_events, public.match_player_appearances to anon;
grant select, insert, update, delete on public.matches, public.match_events, public.match_player_appearances to authenticated;
