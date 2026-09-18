-- Generated from apps/tennis/supabase/migrations/002_competition.sql by tooling/assemble-supabase.mjs. Do not edit this copy.
create table tennis.tournament_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  tournament_edition_id uuid not null references tennis.tournament_editions(id) on delete cascade,
  player_id uuid not null references tennis.players(id) on delete restrict,
  seed integer check (seed > 0),
  entry_status text not null default 'registered' check (entry_status in ('registered', 'active', 'withdrawn', 'eliminated', 'champion')),
  created_at timestamptz not null default now(),
  unique (tournament_edition_id, player_id)
);
create unique index tournament_entries_unique_seed on tennis.tournament_entries(tournament_edition_id, seed) where seed is not null;

create table tennis.matches (
  id uuid primary key default extensions.gen_random_uuid(),
  tournament_edition_id uuid not null references tennis.tournament_editions(id) on delete cascade,
  round text not null check (round in ('round_of_16', 'quarterfinal', 'semifinal', 'final')),
  round_order integer not null check (round_order between 1 and 4),
  match_number integer not null check (match_number > 0),
  player1_id uuid references tennis.players(id) on delete restrict,
  player2_id uuid references tennis.players(id) on delete restrict,
  scheduled_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'finished', 'walkover', 'retired', 'cancelled')),
  winner_id uuid references tennis.players(id) on delete restrict,
  next_match_id uuid references tennis.matches(id) on delete restrict deferrable initially deferred,
  next_slot smallint check (next_slot in (1, 2)),
  best_of integer not null default 3 check (best_of in (1, 3, 5)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_edition_id, round, match_number),
  constraint matches_distinct_players check (player1_id is null or player2_id is null or player1_id <> player2_id),
  constraint matches_winner_is_participant check (winner_id is null or winner_id = player1_id or winner_id = player2_id),
  constraint matches_result_status check ((status in ('finished', 'walkover', 'retired')) = (winner_id is not null)),
  constraint matches_next_pair check ((next_match_id is null) = (next_slot is null))
);

create table tennis.match_sets (
  id uuid primary key default extensions.gen_random_uuid(),
  match_id uuid not null references tennis.matches(id) on delete cascade,
  set_number integer not null check (set_number between 1 and 5),
  player1_score integer not null check (player1_score >= 0),
  player2_score integer not null check (player2_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, set_number),
  constraint match_sets_no_draw check (player1_score <> player2_score)
);

create table tennis.tournament_point_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  category text not null check (category in ('major', 'masters', 'standard', 'finals', 'custom')),
  round text not null check (round in ('round_of_16', 'quarterfinal', 'semifinal', 'final')),
  points integer not null check (points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, round)
);

create table tennis.awards (
  id uuid primary key default extensions.gen_random_uuid(),
  season_id uuid not null references tennis.seasons(id) on delete cascade,
  tournament_edition_id uuid,
  player_id uuid not null references tennis.players(id) on delete restrict,
  award_type text not null check (award_type in ('season_mvp', 'best_player', 'revelation', 'tournament_mvp')),
  title text not null check (length(trim(title)) between 1 and 120),
  description text,
  created_at timestamptz not null default now(),
  constraint awards_edition_season foreign key (tournament_edition_id, season_id)
    references tennis.tournament_editions(id, season_id) on delete cascade
);

insert into tennis.tournament_point_rules(category, round, points) values
('major', 'final', 1000), ('major', 'semifinal', 600), ('major', 'quarterfinal', 360), ('major', 'round_of_16', 0),
('masters', 'final', 500), ('masters', 'semifinal', 300), ('masters', 'quarterfinal', 180), ('masters', 'round_of_16', 0),
('standard', 'final', 250), ('standard', 'semifinal', 150), ('standard', 'quarterfinal', 90), ('standard', 'round_of_16', 0),
('finals', 'final', 750), ('finals', 'semifinal', 450), ('finals', 'quarterfinal', 270), ('finals', 'round_of_16', 0),
('custom', 'final', 0), ('custom', 'semifinal', 0), ('custom', 'quarterfinal', 0), ('custom', 'round_of_16', 0);

alter table tennis.tournament_entries enable row level security;
alter table tennis.matches enable row level security;
alter table tennis.match_sets enable row level security;
alter table tennis.tournament_point_rules enable row level security;
alter table tennis.awards enable row level security;

create policy "public reads entries" on tennis.tournament_entries for select to anon using (exists (select 1 from tennis.tournament_editions e where e.id = tournament_edition_id and e.status in ('active', 'completed')));
create policy "public reads matches" on tennis.matches for select to anon using (exists (select 1 from tennis.tournament_editions e where e.id = tournament_edition_id and e.status in ('active', 'completed')));
create policy "public reads sets" on tennis.match_sets for select to anon using (exists (select 1 from tennis.matches m join tennis.tournament_editions e on e.id = m.tournament_edition_id where m.id = match_id and e.status in ('active', 'completed')));
create policy "public reads point rules" on tennis.tournament_point_rules for select to anon using (true);
create policy "public reads awards" on tennis.awards for select to anon using (exists (select 1 from tennis.seasons s where s.id = season_id and s.status in ('active', 'completed', 'archived')));

create policy "authenticated reads entries" on tennis.tournament_entries for select to authenticated using (true);
create policy "authenticated reads matches" on tennis.matches for select to authenticated using (true);
create policy "authenticated reads sets" on tennis.match_sets for select to authenticated using (true);
create policy "authenticated reads point rules" on tennis.tournament_point_rules for select to authenticated using (true);
create policy "authenticated reads awards" on tennis.awards for select to authenticated using (true);

create policy "admins manage entries" on tennis.tournament_entries for all to authenticated using (tennis.is_admin()) with check (tennis.is_admin());
create policy "admins manage matches" on tennis.matches for all to authenticated using (tennis.is_admin()) with check (tennis.is_admin());
create policy "admins manage sets" on tennis.match_sets for all to authenticated using (tennis.is_admin()) with check (tennis.is_admin());
create policy "admins manage point rules" on tennis.tournament_point_rules for all to authenticated using (tennis.is_admin()) with check (tennis.is_admin());
create policy "admins manage awards" on tennis.awards for all to authenticated using (tennis.is_admin()) with check (tennis.is_admin());

grant select on tennis.tournament_entries, tennis.matches, tennis.match_sets, tennis.tournament_point_rules, tennis.awards to anon;
grant select, insert, update, delete on tennis.tournament_entries, tennis.matches, tennis.match_sets, tennis.tournament_point_rules, tennis.awards to authenticated;
