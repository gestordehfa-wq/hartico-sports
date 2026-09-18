-- Generated from apps/football-lite/supabase/migrations/004_awards_projections.sql by tooling/assemble-supabase.mjs. Do not edit this copy.
create table football.awards (
  id uuid primary key default extensions.gen_random_uuid(),
  season_id uuid not null references football.seasons(id) on delete restrict,
  competition_id uuid references football.competitions(id) on delete restrict,
  award_type text not null check (award_type in ('champion', 'top_scorer', 'top_assister', 'best_player')),
  player_id uuid references football.players(id) on delete restrict,
  team_id uuid references football.teams(id) on delete restrict,
  title text not null check (length(trim(title)) between 1 and 160),
  description text,
  created_at timestamptz not null default now(),
  constraint awards_recipient check (player_id is not null or team_id is not null)
);
create index awards_season on football.awards(season_id);
alter table football.awards enable row level security;
create policy "public reads published awards" on football.awards for select to anon using (exists (select 1 from football.seasons s where s.id = season_id and s.status in ('active', 'completed', 'archived')));
create policy "authenticated reads awards" on football.awards for select to authenticated using (true);
create policy "admins insert awards" on football.awards for insert to authenticated with check (football.is_admin());
create policy "admins update awards" on football.awards for update to authenticated using (football.is_admin()) with check (football.is_admin());
create policy "admins delete awards" on football.awards for delete to authenticated using (football.is_admin());
grant select on football.awards to anon;
grant select, insert, update, delete on football.awards to authenticated;

create view football.league_standings with (security_invoker = true) as
with participants as (
  select c.id competition_id, r.team_id
  from football.competitions c join football.season_player_rosters r on r.season_id = c.season_id
  where c.type = 'league'
  union
  select competition_id, home_team_id from football.matches
  union
  select competition_id, away_team_id from football.matches
), results as (
  select competition_id, home_team_id team_id, home_score goals_for, away_score goals_against
  from football.matches where status = 'finished'
  union all
  select competition_id, away_team_id, away_score, home_score
  from football.matches where status = 'finished'
)
select p.competition_id, p.team_id,
  count(r.team_id)::integer played,
  count(*) filter (where r.goals_for > r.goals_against)::integer won,
  count(*) filter (where r.goals_for = r.goals_against)::integer drawn,
  count(*) filter (where r.goals_for < r.goals_against)::integer lost,
  coalesce(sum(r.goals_for), 0)::integer goals_for,
  coalesce(sum(r.goals_against), 0)::integer goals_against,
  coalesce(sum(r.goals_for - r.goals_against), 0)::integer goal_difference,
  coalesce(sum(case when r.goals_for > r.goals_against then 3 when r.goals_for = r.goals_against then 1 else 0 end), 0)::integer points
from participants p left join results r on r.competition_id = p.competition_id and r.team_id = p.team_id
group by p.competition_id, p.team_id;

create view football.player_statistics with (security_invoker = true) as
with goals as (
  select m.season_id, e.player_id, count(*)::integer goals from football.match_events e join football.matches m on m.id = e.match_id
  where e.event_type = 'goal' and m.status = 'finished' group by m.season_id, e.player_id
), assist_rows as (
  select m.season_id, e.match_id, e.player_id, e.minute from football.match_events e join football.matches m on m.id = e.match_id where e.event_type = 'assist' and m.status = 'finished'
  union
  select m.season_id, e.match_id, e.related_player_id, e.minute from football.match_events e join football.matches m on m.id = e.match_id where e.event_type = 'goal' and e.related_player_id is not null and m.status = 'finished'
), assists as (
  select season_id, player_id, count(*)::integer assists from assist_rows group by season_id, player_id
), cards as (
  select m.season_id, e.player_id, count(*) filter (where e.event_type = 'yellow_card')::integer yellow_cards,
    count(*) filter (where e.event_type = 'red_card')::integer red_cards
  from football.match_events e join football.matches m on m.id = e.match_id where m.status = 'finished' group by m.season_id, e.player_id
), apps as (
  select m.season_id, a.player_id, count(*)::integer appearances from football.match_player_appearances a join football.matches m on m.id = a.match_id where m.status = 'finished' group by m.season_id, a.player_id
), player_seasons as (
  select season_id, player_id from football.season_player_rosters union select season_id, player_id from apps
)
select ps.season_id, ps.player_id, coalesce(ap.appearances, 0) appearances, coalesce(g.goals, 0) goals,
  coalesce(a.assists, 0) assists, coalesce(c.yellow_cards, 0) yellow_cards, coalesce(c.red_cards, 0) red_cards
from player_seasons ps left join apps ap using (season_id, player_id) left join goals g using (season_id, player_id)
left join assists a using (season_id, player_id) left join cards c using (season_id, player_id);

create view football.team_statistics with (security_invoker = true) as
select season_id, team_id, count(*)::integer matches, sum(goals_for)::integer goals_for, sum(goals_against)::integer goals_against
from (
  select season_id, home_team_id team_id, home_score goals_for, away_score goals_against from football.matches where status = 'finished'
  union all
  select season_id, away_team_id, away_score, home_score from football.matches where status = 'finished'
) rows group by season_id, team_id;

grant select on football.league_standings, football.player_statistics, football.team_statistics to anon, authenticated;
