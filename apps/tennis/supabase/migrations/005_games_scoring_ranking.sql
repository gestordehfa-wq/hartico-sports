-- Tennis v0.2: partidos al mejor de 5/7 juegos con puntuación 0-15-30-40-45,
-- categorías y puntos de ranking configurables y avance de cuadro para el nuevo
-- formato. Migración incremental: el modelo v0.1 basado en sets sigue vigente
-- (`scoring_format = 'sets'`) y ninguna fila existente se reinterpreta.

-- Categorías configurables --------------------------------------------------------

create table tennis.tournament_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,31}$'),
  name text not null check (length(trim(name)) between 1 and 60),
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table tennis.tournament_categories enable row level security;

insert into tennis.tournament_categories (code, name, sort_order) values
  ('major', 'Major', 10),
  ('masters', 'Masters', 20),
  ('finals', 'Finals', 30),
  ('standard', 'Standard', 40),
  ('custom', 'Personalizada', 90);

-- La lista fija de v0.1 pasa a ser el catálogo configurable anterior; las cinco
-- categorías existentes se conservan, por lo que ninguna fila queda inválida.
do $$
declare
  legacy record;
begin
  for legacy in
    select con.conname
    from pg_catalog.pg_constraint con
    where con.conrelid = 'tennis.tournaments'::regclass
      and con.contype = 'c'
      and pg_catalog.pg_get_constraintdef(con.oid) like '%category%'
  loop
    execute format('alter table tennis.tournaments drop constraint %I', legacy.conname);
  end loop;
end $$;
alter table tennis.tournaments
  add constraint tournaments_category_fkey foreign key (category) references tennis.tournament_categories(code) on update cascade;

-- Puntos de ranking por categoría y ronda alcanzada ---------------------------------

create table tennis.ranking_point_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  category text not null references tennis.tournament_categories(code) on update cascade on delete cascade,
  reached text not null check (reached in ('champion', 'final', 'semifinal', 'quarterfinal', 'round_of_16')),
  points integer not null check (points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, reached)
);
alter table tennis.ranking_point_rules enable row level security;

-- Migra los valores vigentes de tournament_point_rules conservando la semántica de
-- v0.1 (campeón = "final", finalista = "semifinal", semifinalista = "quarterfinal",
-- cuartofinalista y eliminados en octavos = "round_of_16").
insert into tennis.ranking_point_rules (category, reached, points)
select r.category, m.reached, r.points
from tennis.tournament_point_rules r
join (values
  ('final', 'champion'),
  ('semifinal', 'final'),
  ('quarterfinal', 'semifinal'),
  ('round_of_16', 'quarterfinal'),
  ('round_of_16', 'round_of_16')
) as m(legacy_round, reached) on m.legacy_round = r.round;

comment on table tennis.ranking_point_rules is
  'Puntos por ronda alcanzada. Ranking de 52 semanas: solo ediciones completed con end_date dentro de los 364 días previos a la fecha de corte. Inspirado en el ATP, sin reglas ATP reales.';

-- Formato de juegos por edición y partido -------------------------------------------

alter table tennis.tournament_editions
  add column scoring_format text not null default 'sets' check (scoring_format in ('sets', 'games')),
  add column games_best_of smallint check (games_best_of in (5, 7)),
  add constraint tournament_editions_scoring_consistent check ((scoring_format = 'games') = (games_best_of is not null));

comment on column tennis.tournament_editions.best_of is
  'Legado v0.1: mejor de N sets. Solo aplica cuando scoring_format = ''sets''; el formato de juegos usa games_best_of.';

alter table tennis.matches
  add column scoring_format text not null default 'sets' check (scoring_format in ('sets', 'games')),
  add column games_best_of smallint check (games_best_of in (5, 7)),
  add column player1_games smallint not null default 0 check (player1_games between 0 and 4),
  add column player2_games smallint not null default 0 check (player2_games between 0 and 4),
  add column player1_points smallint not null default 0 check (player1_points in (0, 15, 30, 40, 45)),
  add column player2_points smallint not null default 0 check (player2_points in (0, 15, 30, 40, 45)),
  add constraint matches_scoring_consistent check ((scoring_format = 'games') = (games_best_of is not null)),
  add constraint matches_games_within_target check (
    games_best_of is null or (
      player1_games <= games_best_of / 2 + 1
      and player2_games <= games_best_of / 2 + 1
      and not (player1_games = games_best_of / 2 + 1 and player2_games = games_best_of / 2 + 1)
    )
  ),
  add constraint matches_sets_format_has_no_games check (
    scoring_format = 'games'
    or (player1_games = 0 and player2_games = 0 and player1_points = 0 and player2_points = 0)
  );

comment on column tennis.matches.player1_points is
  'Regla propia de Hartico Tennis: 0 → 15 → 30 → 40 → 45 → juego. Sin deuce ni ventajas: quien puntúa estando en 45 gana el juego.';

create or replace function tennis.apply_edition_scoring_format()
returns trigger language plpgsql set search_path = '' as $$
declare
  edition tennis.tournament_editions%rowtype;
begin
  select * into edition from tennis.tournament_editions where id = new.tournament_edition_id;
  if not found then
    return new;
  end if;
  new.scoring_format := edition.scoring_format;
  new.games_best_of := edition.games_best_of;
  return new;
end;
$$;
revoke all on function tennis.apply_edition_scoring_format() from public, anon, authenticated;
create trigger matches_scoring_format before insert on tennis.matches
for each row execute function tennis.apply_edition_scoring_format();

create or replace function tennis.lock_edition_scoring_format()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.scoring_format is distinct from old.scoring_format or new.games_best_of is distinct from old.games_best_of)
     and exists (select 1 from tennis.matches where tournament_edition_id = old.id) then
    raise exception 'scoring format cannot change after the draw exists' using errcode = '55006';
  end if;
  return new;
end;
$$;
revoke all on function tennis.lock_edition_scoring_format() from public, anon, authenticated;
create trigger tournament_editions_scoring_lock before update on tennis.tournament_editions
for each row execute function tennis.lock_edition_scoring_format();

-- Un resultado confirmado en formato de juegos no se modifica ni se elimina.
create or replace function tennis.protect_confirmed_games_match()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.scoring_format = 'games' and old.status = 'finished' then
      raise exception 'confirmed games results cannot be deleted' using errcode = '55006';
    end if;
    return old;
  end if;
  if old.scoring_format = 'games' and old.status = 'finished' and (
    new.status is distinct from old.status
    or new.winner_id is distinct from old.winner_id
    or new.player1_id is distinct from old.player1_id
    or new.player2_id is distinct from old.player2_id
    or new.player1_games is distinct from old.player1_games
    or new.player2_games is distinct from old.player2_games
    or new.player1_points is distinct from old.player1_points
    or new.player2_points is distinct from old.player2_points
  ) then
    raise exception 'confirmed games results cannot be modified' using errcode = '55006';
  end if;
  return new;
end;
$$;
revoke all on function tennis.protect_confirmed_games_match() from public, anon, authenticated;
create trigger matches_confirmed_games_guard before update or delete on tennis.matches
for each row execute function tennis.protect_confirmed_games_match();

-- El formato de juegos no usa la tabla de sets.
create or replace function tennis.validate_match_set()
returns trigger language plpgsql set search_path = '' as $$
declare
  maximum_sets integer;
  match_format text;
begin
  select best_of, scoring_format into maximum_sets, match_format from tennis.matches where id = new.match_id;
  if match_format = 'games' then raise exception 'games format matches do not use sets'; end if;
  if new.set_number > maximum_sets then raise exception 'set exceeds match format'; end if;
  return new;
end;
$$;

-- Marcador en juegos --------------------------------------------------------------------

create or replace function tennis.set_match_score(
  target_match_id uuid,
  p1_games integer,
  p2_games integer,
  p1_points integer default 0,
  p2_points integer default 0,
  confirm_result boolean default false
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_match tennis.matches%rowtype;
  needed integer;
begin
  if not tennis.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  select * into current_match from tennis.matches where id = target_match_id for update;
  if not found then raise exception 'match not found'; end if;
  if current_match.scoring_format <> 'games' then raise exception 'match uses the legacy sets format'; end if;
  if current_match.status not in ('scheduled', 'in_progress') then raise exception 'match score is locked'; end if;
  if current_match.player1_id is null or current_match.player2_id is null then raise exception 'two players required'; end if;
  needed := current_match.games_best_of / 2 + 1;
  if p1_games not between 0 and needed or p2_games not between 0 and needed or (p1_games = needed and p2_games = needed) then
    raise exception 'invalid games score';
  end if;
  if p1_points not in (0, 15, 30, 40, 45) or p2_points not in (0, 15, 30, 40, 45) then raise exception 'invalid game points'; end if;
  if (p1_games = needed or p2_games = needed) and (p1_points <> 0 or p2_points <> 0) then
    raise exception 'points must be reset once a player reaches the target';
  end if;
  update tennis.matches
  set player1_games = p1_games, player2_games = p2_games, player1_points = p1_points, player2_points = p2_points, status = 'in_progress'
  where id = target_match_id;
  if confirm_result then perform tennis.confirm_match_result(target_match_id); end if;
end;
$$;
revoke all on function tennis.set_match_score(uuid, integer, integer, integer, integer, boolean) from public, anon;
grant execute on function tennis.set_match_score(uuid, integer, integer, integer, integer, boolean) to authenticated;

create or replace function tennis.record_match_point(target_match_id uuid, scorer_slot integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_match tennis.matches%rowtype;
  needed integer;
  games1 integer;
  games2 integer;
  points1 integer;
  points2 integer;
  scorer_points integer;
begin
  if not tennis.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if scorer_slot not in (1, 2) then raise exception 'scorer slot must be 1 or 2'; end if;
  select * into current_match from tennis.matches where id = target_match_id for update;
  if not found then raise exception 'match not found'; end if;
  if current_match.scoring_format <> 'games' then raise exception 'match uses the legacy sets format'; end if;
  if current_match.status not in ('scheduled', 'in_progress') then raise exception 'match score is locked'; end if;
  if current_match.player1_id is null or current_match.player2_id is null then raise exception 'two players required'; end if;
  needed := current_match.games_best_of / 2 + 1;
  games1 := current_match.player1_games;
  games2 := current_match.player2_games;
  if greatest(games1, games2) >= needed then raise exception 'match is decided; confirm the result'; end if;
  points1 := current_match.player1_points;
  points2 := current_match.player2_points;
  scorer_points := case when scorer_slot = 1 then points1 else points2 end;
  if scorer_points = 45 then
    -- Regla propia: quien puntúa estando en 45 gana el juego; sin deuce.
    points1 := 0;
    points2 := 0;
    if scorer_slot = 1 then games1 := games1 + 1; else games2 := games2 + 1; end if;
  else
    scorer_points := case scorer_points when 0 then 15 when 15 then 30 when 30 then 40 else 45 end;
    if scorer_slot = 1 then points1 := scorer_points; else points2 := scorer_points; end if;
  end if;
  update tennis.matches
  set player1_games = games1, player2_games = games2, player1_points = points1, player2_points = points2, status = 'in_progress'
  where id = target_match_id;
end;
$$;
revoke all on function tennis.record_match_point(uuid, integer) from public, anon;
grant execute on function tennis.record_match_point(uuid, integer) to authenticated;

-- Confirmación: mismo flujo transaccional de v0.1 con rama para juegos y cierre de edición.
create or replace function tennis.confirm_match_result(target_match_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_match tennis.matches%rowtype;
  next_match tennis.matches%rowtype;
  player1_sets integer;
  player2_sets integer;
  needed integer;
  decided_winner uuid;
  decided_loser uuid;
begin
  if not tennis.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  select * into current_match from tennis.matches where id = target_match_id for update;
  if not found then raise exception 'match not found'; end if;
  if current_match.status not in ('scheduled', 'in_progress', 'walkover', 'retired') then raise exception 'match is not confirmable'; end if;
  if current_match.player1_id is null or current_match.player2_id is null or current_match.player1_id = current_match.player2_id then raise exception 'two distinct players required'; end if;
  if current_match.status in ('walkover', 'retired') then
    decided_winner := current_match.winner_id;
    if decided_winner is null then raise exception 'walkover or retirement requires an explicit winner'; end if;
    decided_loser := case when decided_winner = current_match.player1_id then current_match.player2_id else current_match.player1_id end;
  elsif current_match.scoring_format = 'games' then
    needed := (current_match.games_best_of / 2) + 1;
    if greatest(current_match.player1_games, current_match.player2_games) <> needed or least(current_match.player1_games, current_match.player2_games) >= needed then raise exception 'games do not determine a valid winner'; end if;
    if current_match.player1_games > current_match.player2_games then decided_winner := current_match.player1_id; decided_loser := current_match.player2_id; else decided_winner := current_match.player2_id; decided_loser := current_match.player1_id; end if;
    update tennis.matches set winner_id = decided_winner, status = 'finished', player1_points = 0, player2_points = 0 where id = target_match_id;
  else
    if exists (select 1 from tennis.match_sets where match_id = target_match_id and (player1_score < 0 or player2_score < 0 or player1_score = player2_score)) then raise exception 'invalid set score'; end if;
    if (select count(*) from tennis.match_sets where match_id = target_match_id) > current_match.best_of then raise exception 'too many sets'; end if;
    if exists (select 1 from generate_series(1, (select count(*)::integer from tennis.match_sets where match_id = target_match_id)) expected where not exists (select 1 from tennis.match_sets s where s.match_id = target_match_id and s.set_number = expected)) then raise exception 'sets must be consecutive'; end if;
    select count(*) filter (where player1_score > player2_score), count(*) filter (where player2_score > player1_score) into player1_sets, player2_sets from tennis.match_sets where match_id = target_match_id;
    needed := (current_match.best_of / 2) + 1;
    if greatest(player1_sets, player2_sets) <> needed or least(player1_sets, player2_sets) >= needed then raise exception 'sets do not determine a valid winner'; end if;
    if player1_sets > player2_sets then decided_winner := current_match.player1_id; decided_loser := current_match.player2_id; else decided_winner := current_match.player2_id; decided_loser := current_match.player1_id; end if;
    update tennis.matches set winner_id = decided_winner, status = 'finished' where id = target_match_id;
  end if;
  update tennis.tournament_entries set entry_status = 'eliminated' where tournament_edition_id = current_match.tournament_edition_id and player_id = decided_loser;
  if current_match.round = 'final' then
    update tennis.tournament_entries set entry_status = 'champion' where tournament_edition_id = current_match.tournament_edition_id and player_id = decided_winner;
    -- La edición completada habilita el ranking de 52 semanas.
    update tennis.tournament_editions set status = 'completed' where id = current_match.tournament_edition_id and status <> 'completed';
  elsif current_match.next_match_id is not null then
    select * into next_match from tennis.matches where id = current_match.next_match_id for update;
    if next_match.tournament_edition_id <> current_match.tournament_edition_id then raise exception 'cross-edition advancement'; end if;
    if (current_match.next_slot = 1 and next_match.player1_id is not null and next_match.player1_id <> decided_winner) or (current_match.next_slot = 2 and next_match.player2_id is not null and next_match.player2_id <> decided_winner) then raise exception 'next slot already occupied'; end if;
    if (current_match.next_slot = 1 and next_match.player2_id = decided_winner) or (current_match.next_slot = 2 and next_match.player1_id = decided_winner) then raise exception 'winner would be duplicated'; end if;
    update tennis.matches set player1_id = case when current_match.next_slot = 1 then decided_winner else player1_id end, player2_id = case when current_match.next_slot = 2 then decided_winner else player2_id end where id = next_match.id;
  end if;
end;
$$;

-- RLS, grants, updated_at y auditoría ------------------------------------------------------

create policy "public reads categories" on tennis.tournament_categories for select to anon using (true);
create policy "public reads ranking rules" on tennis.ranking_point_rules for select to anon using (true);
create policy "authenticated reads categories" on tennis.tournament_categories for select to authenticated using (true);
create policy "authenticated reads ranking rules" on tennis.ranking_point_rules for select to authenticated using (true);
create policy "admins manage categories" on tennis.tournament_categories for all to authenticated using (tennis.is_admin()) with check (tennis.is_admin());
create policy "admins manage ranking rules" on tennis.ranking_point_rules for all to authenticated using (tennis.is_admin()) with check (tennis.is_admin());

grant select on tennis.tournament_categories, tennis.ranking_point_rules to anon;
grant select, insert, update, delete on tennis.tournament_categories, tennis.ranking_point_rules to authenticated;

create trigger tournament_categories_touch before update on tennis.tournament_categories for each row execute function tennis.touch_updated_at();
create trigger ranking_point_rules_touch before update on tennis.ranking_point_rules for each row execute function tennis.touch_updated_at();
create trigger tournament_categories_audit after insert or update or delete on tennis.tournament_categories for each row execute function tennis.capture_audit();
create trigger ranking_point_rules_audit after insert or update or delete on tennis.ranking_point_rules for each row execute function tennis.capture_audit();
