-- Football Lite v0.2: inscripción de equipos, fixture de liga, cuadros de copa,
-- Supercopa y campeones. Migración incremental: no elimina ni reescribe datos
-- de v0.1; solo relaja las columnas de equipo de `matches` (necesario para las
-- rondas de copa aún sin rival) y añade columnas/tablas nuevas.

alter table football.competitions
  add column legs smallint not null default 1 check (legs in (1, 2)),
  add column champion_team_id uuid references football.teams(id) on delete restrict,
  add column source_league_id uuid references football.competitions(id) on delete restrict,
  add column source_cup_id uuid references football.competitions(id) on delete restrict,
  add constraint competitions_supercup_sources check (type = 'supercup' or (source_league_id is null and source_cup_id is null));

comment on column football.competitions.legs is 'Liga: 1 = una vuelta, 2 = ida y vuelta.';
comment on column football.competitions.champion_team_id is 'Solo lo escriben close_league / advance_knockout_winner; queda protegido junto con los partidos.';

create table football.competition_teams (
  id uuid primary key default extensions.gen_random_uuid(),
  competition_id uuid not null references football.competitions(id) on delete cascade,
  team_id uuid not null references football.teams(id) on delete restrict,
  seed smallint check (seed > 0),
  created_at timestamptz not null default now(),
  unique (competition_id, team_id)
);
create unique index competition_teams_seed on football.competition_teams(competition_id, seed) where seed is not null;
alter table football.competition_teams enable row level security;

alter table football.matches
  alter column home_team_id drop not null,
  alter column away_team_id drop not null,
  add column stage text check (stage in ('round_of_16', 'quarterfinal', 'semifinal', 'final', 'supercup')),
  add column round_order smallint check (round_order between 1 and 4),
  add column match_number smallint check (match_number > 0),
  add column next_match_id uuid references football.matches(id) on delete restrict deferrable initially deferred,
  add column next_slot smallint check (next_slot in (1, 2)),
  add column winner_team_id uuid references football.teams(id) on delete restrict,
  add column tiebreak_note text check (tiebreak_note is null or length(trim(tiebreak_note)) between 1 and 500),
  add constraint matches_knockout_shape check (
    ((stage is null) = (match_number is null))
    and ((stage is null) = (round_order is null))
    and ((next_match_id is null) = (next_slot is null))
    and (stage is not null or (next_match_id is null and winner_team_id is null))
  ),
  add constraint matches_winner_is_participant check (winner_team_id is null or winner_team_id = home_team_id or winner_team_id = away_team_id),
  add constraint matches_finished_teams check (status <> 'finished' or (home_team_id is not null and away_team_id is not null));
create unique index matches_knockout_slot on football.matches(competition_id, stage, match_number) where stage is not null;

comment on column football.matches.tiebreak_note is
  'Mecanismo reglamentario de la asociación con el que el administrador definió al ganador de un empate eliminatorio. La base de datos no inventa penales ni sorteos.';

-- Integridad -----------------------------------------------------------------------------

create or replace function football.validate_competition_team()
returns trigger language plpgsql set search_path = '' as $$
declare
  competition_type text;
  target_competition uuid;
begin
  target_competition := case when tg_op = 'DELETE' then old.competition_id else new.competition_id end;
  select type into competition_type from football.competitions where id = target_competition;
  if tg_op = 'INSERT' and competition_type not in ('league', 'cup') then
    raise exception 'only leagues and cups accept team enrollments';
  end if;
  if exists (select 1 from football.matches where competition_id = target_competition) then
    raise exception 'enrollments are closed once the fixture exists' using errcode = '55006';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
revoke all on function football.validate_competition_team() from public, anon, authenticated;
create trigger competition_teams_validate before insert or delete on football.competition_teams
for each row execute function football.validate_competition_team();

create or replace function football.validate_match_structure()
returns trigger language plpgsql set search_path = '' as $$
declare
  competition_type text;
  teams_changed boolean := true;
begin
  select type into competition_type from football.competitions where id = new.competition_id;
  if competition_type = 'league' and new.stage is not null then
    raise exception 'league matches cannot belong to a knockout stage';
  end if;
  if tg_op = 'UPDATE' then
    teams_changed := new.home_team_id is distinct from old.home_team_id or new.away_team_id is distinct from old.away_team_id;
  end if;
  if competition_type in ('league', 'cup') and teams_changed
     and exists (select 1 from football.competition_teams where competition_id = new.competition_id) then
    if (new.home_team_id is not null and not exists (select 1 from football.competition_teams where competition_id = new.competition_id and team_id = new.home_team_id))
       or (new.away_team_id is not null and not exists (select 1 from football.competition_teams where competition_id = new.competition_id and team_id = new.away_team_id)) then
      raise exception 'both teams must be enrolled in the competition' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function football.validate_match_structure() from public, anon, authenticated;
create trigger matches_structure before insert or update on football.matches
for each row execute function football.validate_match_structure();

-- Un partido con ganador registrado, o de una competición ya con campeón, es historia:
-- ni resultado, ni equipos, ni ganador pueden cambiar (tampoco para el admin).
create or replace function football.protect_decided_matches()
returns trigger language plpgsql set search_path = '' as $$
declare
  locked boolean;
begin
  locked := old.winner_team_id is not null or exists (
    select 1 from football.competitions c where c.id = old.competition_id and c.champion_team_id is not null
  );
  if not locked then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'decided results cannot be deleted' using errcode = '55006';
  end if;
  if new.status is distinct from old.status
     or new.home_team_id is distinct from old.home_team_id
     or new.away_team_id is distinct from old.away_team_id
     or new.home_score is distinct from old.home_score
     or new.away_score is distinct from old.away_score
     or new.winner_team_id is distinct from old.winner_team_id
     or new.tiebreak_note is distinct from old.tiebreak_note
     or new.competition_id is distinct from old.competition_id then
    raise exception 'decided results cannot be modified' using errcode = '55006';
  end if;
  return new;
end;
$$;
revoke all on function football.protect_decided_matches() from public, anon, authenticated;
create trigger matches_protect_decided before update or delete on football.matches
for each row execute function football.protect_decided_matches();

-- Tabla de liga (uso interno de close_league) -----------------------------------------------

create or replace function football.league_table(target_competition_id uuid)
returns table (team_id uuid, played integer, goals_for integer, goals_against integer, points integer)
language sql stable set search_path = '' as $$
  with results as (
    select m.home_team_id as team_id, m.home_score as gf, m.away_score as ga
    from football.matches m where m.competition_id = target_competition_id and m.status = 'finished'
    union all
    select m.away_team_id, m.away_score, m.home_score
    from football.matches m where m.competition_id = target_competition_id and m.status = 'finished'
  )
  select r.team_id, count(*)::integer, sum(r.gf)::integer, sum(r.ga)::integer,
    sum(case when r.gf > r.ga then 3 when r.gf = r.ga then 1 else 0 end)::integer
  from results r
  group by r.team_id;
$$;
revoke all on function football.league_table(uuid) from public, anon, authenticated;

-- Avance de cuadros y campeones -----------------------------------------------------------------

create or replace function football.advance_knockout_winner(
  target_match_id uuid,
  p_tiebreak_winner_id uuid default null,
  p_tiebreak_note text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_match football.matches%rowtype;
  next_match football.matches%rowtype;
  competition football.competitions%rowtype;
  decided uuid;
begin
  if not football.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  select * into current_match from football.matches where id = target_match_id for update;
  if not found then raise exception 'match not found'; end if;
  if current_match.stage is null then raise exception 'match is not part of a knockout bracket'; end if;
  if current_match.winner_team_id is not null then raise exception 'winner already recorded' using errcode = '55006'; end if;
  if current_match.status <> 'finished' or current_match.home_score is null or current_match.away_score is null then
    raise exception 'match must be finished with a score';
  end if;
  if current_match.home_team_id is null or current_match.away_team_id is null then raise exception 'two teams required'; end if;

  if current_match.home_score > current_match.away_score then
    decided := current_match.home_team_id;
  elsif current_match.away_score > current_match.home_score then
    decided := current_match.away_team_id;
  else
    -- Empate eliminatorio: el administrador define al ganador según el reglamento de la asociación.
    if p_tiebreak_winner_id is null or p_tiebreak_winner_id not in (current_match.home_team_id, current_match.away_team_id) then
      raise exception 'tied knockout match requires the administrator to define the winner' using errcode = '23514';
    end if;
    if p_tiebreak_note is null or length(trim(p_tiebreak_note)) < 5 then
      raise exception 'tied knockout match requires the association tiebreak note' using errcode = '23514';
    end if;
    decided := p_tiebreak_winner_id;
  end if;

  select * into competition from football.competitions where id = current_match.competition_id for update;
  update football.matches
  set winner_team_id = decided,
      tiebreak_note = case when current_match.home_score = current_match.away_score then trim(p_tiebreak_note) end
  where id = target_match_id;

  if current_match.next_match_id is not null then
    select * into next_match from football.matches where id = current_match.next_match_id for update;
    if next_match.competition_id <> current_match.competition_id then raise exception 'cross-competition advancement'; end if;
    if current_match.next_slot = 1 then
      if next_match.home_team_id is not null and next_match.home_team_id <> decided then raise exception 'next slot already occupied'; end if;
      if next_match.away_team_id = decided then raise exception 'winner would be duplicated'; end if;
      update football.matches set home_team_id = decided where id = next_match.id;
    else
      if next_match.away_team_id is not null and next_match.away_team_id <> decided then raise exception 'next slot already occupied'; end if;
      if next_match.home_team_id = decided then raise exception 'winner would be duplicated'; end if;
      update football.matches set away_team_id = decided where id = next_match.id;
    end if;
  else
    update football.competitions set champion_team_id = decided, status = 'completed' where id = competition.id;
    if not exists (select 1 from football.awards where competition_id = competition.id and award_type = 'champion') then
      insert into football.awards (season_id, competition_id, award_type, team_id, title)
      values (competition.season_id, competition.id, 'champion', decided, 'Campeón · ' || competition.name);
    end if;
  end if;
end;
$$;
revoke all on function football.advance_knockout_winner(uuid, uuid, text) from public, anon;
grant execute on function football.advance_knockout_winner(uuid, uuid, text) to authenticated;

create or replace function football.close_league(
  target_competition_id uuid,
  p_champion_team_id uuid default null,
  p_note text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  competition football.competitions%rowtype;
  pending integer;
  tied_at_top integer;
  champion uuid;
begin
  if not football.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  select * into competition from football.competitions where id = target_competition_id for update;
  if not found then raise exception 'competition not found'; end if;
  if competition.type <> 'league' then raise exception 'only leagues can be closed with a standings champion'; end if;
  if competition.champion_team_id is not null then raise exception 'league already closed' using errcode = '55006'; end if;
  select count(*) into pending from football.matches where competition_id = target_competition_id and status not in ('finished', 'cancelled');
  if pending > 0 or not exists (select 1 from football.matches where competition_id = target_competition_id and status = 'finished') then
    raise exception 'every league match must be finished before closing the league';
  end if;

  select count(*) into tied_at_top
  from football.league_table(target_competition_id) t
  where (t.points, t.goals_for - t.goals_against, t.goals_for) = (
    select top.points, top.goals_for - top.goals_against, top.goals_for
    from football.league_table(target_competition_id) top
    order by top.points desc, top.goals_for - top.goals_against desc, top.goals_for desc
    limit 1
  );
  if tied_at_top = 1 then
    select t.team_id into champion from football.league_table(target_competition_id) t
    order by t.points desc, t.goals_for - t.goals_against desc, t.goals_for desc limit 1;
  else
    -- Empate en PTS, DG y GF en la cima: no se elige al azar ni por nombre.
    if p_champion_team_id is null or p_note is null or length(trim(p_note)) < 5 then
      raise exception 'tied at the top of the standings: the administrator must define the champion with the association rule' using errcode = '23514';
    end if;
    if not exists (
      select 1 from football.league_table(target_competition_id) t
      where t.team_id = p_champion_team_id
        and (t.points, t.goals_for - t.goals_against, t.goals_for) = (
          select top.points, top.goals_for - top.goals_against, top.goals_for
          from football.league_table(target_competition_id) top
          order by top.points desc, top.goals_for - top.goals_against desc, top.goals_for desc
          limit 1
        )
    ) then
      raise exception 'the chosen champion is not among the teams tied at the top' using errcode = '23514';
    end if;
    champion := p_champion_team_id;
  end if;

  update football.competitions set champion_team_id = champion, status = 'completed' where id = target_competition_id;
  if not exists (select 1 from football.awards where competition_id = target_competition_id and award_type = 'champion') then
    insert into football.awards (season_id, competition_id, award_type, team_id, title, description)
    values (competition.season_id, target_competition_id, 'champion', champion, 'Campeón · ' || competition.name,
      case when tied_at_top > 1 then trim(p_note) end);
  end if;
end;
$$;
revoke all on function football.close_league(uuid, uuid, text) from public, anon;
grant execute on function football.close_league(uuid, uuid, text) to authenticated;

create or replace function football.generate_supercup(
  target_competition_id uuid,
  p_league_id uuid,
  p_cup_id uuid,
  p_scheduled_at timestamptz,
  p_opponent_team_id uuid default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  supercup football.competitions%rowtype;
  league football.competitions%rowtype;
  cup football.competitions%rowtype;
  home uuid;
  away uuid;
begin
  if not football.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  select * into supercup from football.competitions where id = target_competition_id for update;
  if not found or supercup.type <> 'supercup' then raise exception 'target competition must be a supercup'; end if;
  if exists (select 1 from football.matches where competition_id = target_competition_id) then
    raise exception 'the supercup match already exists' using errcode = '55006';
  end if;
  select * into league from football.competitions where id = p_league_id;
  select * into cup from football.competitions where id = p_cup_id;
  if league.id is null or league.type <> 'league' or league.champion_team_id is null then raise exception 'the league champion is not registered'; end if;
  if cup.id is null or cup.type <> 'cup' or cup.champion_team_id is null then raise exception 'the cup champion is not registered'; end if;

  home := league.champion_team_id;
  away := cup.champion_team_id;
  if home = away then
    -- Un mismo equipo ganó Liga y Copa: el rival lo define el administrador según la norma de la asociación.
    if p_opponent_team_id is null or p_opponent_team_id = home then
      raise exception 'the same team won league and cup: the administrator must choose the opponent' using errcode = '23514';
    end if;
    if not exists (select 1 from football.teams where id = p_opponent_team_id and status = 'active') then
      raise exception 'the chosen opponent must be an active team' using errcode = '23514';
    end if;
    away := p_opponent_team_id;
  elsif p_opponent_team_id is not null then
    raise exception 'an opponent is only accepted when one team won both competitions' using errcode = '23514';
  end if;

  insert into football.matches (competition_id, season_id, home_team_id, away_team_id, scheduled_at, stage, round_order, match_number)
  values (supercup.id, supercup.season_id, home, away, p_scheduled_at, 'supercup', 1, 1);
  update football.competitions set source_league_id = league.id, source_cup_id = cup.id where id = supercup.id;
end;
$$;
revoke all on function football.generate_supercup(uuid, uuid, uuid, timestamptz, uuid) from public, anon;
grant execute on function football.generate_supercup(uuid, uuid, uuid, timestamptz, uuid) to authenticated;

-- La vista de posiciones toma los equipos inscritos (o, sin inscripciones, el plantel v0.1)
-- y descarta rondas de copa aún sin rival.
create or replace view football.league_standings with (security_invoker = true) as
with participants as (
  select ct.competition_id, ct.team_id from football.competition_teams ct
  union
  select c.id competition_id, r.team_id
  from football.competitions c join football.season_player_rosters r on r.season_id = c.season_id
  where c.type = 'league' and not exists (select 1 from football.competition_teams e where e.competition_id = c.id)
  union
  select competition_id, home_team_id from football.matches where home_team_id is not null
  union
  select competition_id, away_team_id from football.matches where away_team_id is not null
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

-- RLS, grants y auditoría ---------------------------------------------------------------------------

create policy "public reads published competition teams" on football.competition_teams for select to anon using (
  exists (select 1 from football.competitions c where c.id = competition_id and c.status in ('active', 'completed', 'archived'))
);
create policy "authenticated reads competition teams" on football.competition_teams for select to authenticated using (true);
create policy "admins insert competition teams" on football.competition_teams for insert to authenticated with check (football.is_admin());
create policy "admins update competition teams" on football.competition_teams for update to authenticated using (football.is_admin()) with check (football.is_admin());
create policy "admins delete competition teams" on football.competition_teams for delete to authenticated using (football.is_admin());
grant select on football.competition_teams to anon;
grant select, insert, update, delete on football.competition_teams to authenticated;

create trigger competition_teams_audit after insert or update or delete on football.competition_teams for each row execute function football.capture_audit();
