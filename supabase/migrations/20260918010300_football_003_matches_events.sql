-- Generated from apps/football-lite/supabase/migrations/003_matches_events.sql by tooling/assemble-supabase.mjs. Do not edit this copy.
create table football.matches (
  id uuid primary key default extensions.gen_random_uuid(),
  competition_id uuid not null,
  season_id uuid not null,
  home_team_id uuid not null references football.teams(id) on delete restrict,
  away_team_id uuid not null references football.teams(id) on delete restrict,
  matchday integer check (matchday > 0),
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
  home_score integer check (home_score >= 0),
  away_score integer check (away_score >= 0),
  referee_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_competition_season foreign key (competition_id, season_id) references football.competitions(id, season_id) on delete restrict,
  constraint matches_different_teams check (home_team_id <> away_team_id),
  constraint matches_finished_score check (status <> 'finished' or (home_score is not null and away_score is not null))
);
create index matches_competition_schedule on football.matches(competition_id, scheduled_at);
create index matches_season on football.matches(season_id);
alter table football.matches enable row level security;
create policy "public reads published matches" on football.matches for select to anon using (
  exists (select 1 from football.seasons s where s.id = season_id and s.status in ('active', 'completed', 'archived'))
  and exists (select 1 from football.competitions c where c.id = competition_id and c.status in ('active', 'completed', 'archived'))
);
create policy "authenticated reads matches" on football.matches for select to authenticated using (true);
create policy "admins insert matches" on football.matches for insert to authenticated with check (football.is_admin());
create policy "admins update matches" on football.matches for update to authenticated using (football.is_admin()) with check (football.is_admin());
create policy "admins delete matches" on football.matches for delete to authenticated using (football.is_admin());

create table football.match_events (
  id uuid primary key default extensions.gen_random_uuid(),
  match_id uuid not null references football.matches(id) on delete cascade,
  player_id uuid not null references football.players(id) on delete restrict,
  team_id uuid not null references football.teams(id) on delete restrict,
  event_type text not null check (event_type in ('goal', 'assist', 'yellow_card', 'red_card', 'own_goal')),
  minute integer check (minute between 0 and 130),
  related_player_id uuid references football.players(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint event_distinct_players check (related_player_id is null or related_player_id <> player_id)
);
create index match_events_match on football.match_events(match_id, minute);
alter table football.match_events enable row level security;
create policy "public reads published events" on football.match_events for select to anon using (exists (select 1 from football.matches m where m.id = match_id));
create policy "authenticated reads events" on football.match_events for select to authenticated using (true);
create policy "admins insert events" on football.match_events for insert to authenticated with check (football.is_admin());
create policy "admins update events" on football.match_events for update to authenticated using (football.is_admin()) with check (football.is_admin());
create policy "admins delete events" on football.match_events for delete to authenticated using (football.is_admin());

create table football.match_player_appearances (
  id uuid primary key default extensions.gen_random_uuid(),
  match_id uuid not null references football.matches(id) on delete cascade,
  player_id uuid not null references football.players(id) on delete restrict,
  team_id uuid not null references football.teams(id) on delete restrict,
  starter boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);
create index appearances_player on football.match_player_appearances(player_id);
alter table football.match_player_appearances enable row level security;
create policy "public reads published appearances" on football.match_player_appearances for select to anon using (exists (select 1 from football.matches m where m.id = match_id));
create policy "authenticated reads appearances" on football.match_player_appearances for select to authenticated using (true);
create policy "admins insert appearances" on football.match_player_appearances for insert to authenticated with check (football.is_admin());
create policy "admins update appearances" on football.match_player_appearances for update to authenticated using (football.is_admin()) with check (football.is_admin());
create policy "admins delete appearances" on football.match_player_appearances for delete to authenticated using (football.is_admin());

grant select on football.matches, football.match_events, football.match_player_appearances to anon;
grant select, insert, update, delete on football.matches, football.match_events, football.match_player_appearances to authenticated;
