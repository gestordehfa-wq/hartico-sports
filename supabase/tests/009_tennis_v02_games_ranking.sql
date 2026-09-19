-- Generated from apps/tennis/supabase/tests/003_games_scoring_ranking.sql by tooling/assemble-supabase.mjs. Do not edit this copy.
begin;
create extension if not exists pgtap with schema extensions;
select plan(46);

-- Fixtures transaccionales; se revierten con el rollback final.
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
('a0000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'v02-tennis-admin@test.local', '', now(), '{}', '{}', now(), now()),
('a0000000-0000-4000-8000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'v02-tennis-user@test.local', '', now(), '{}', '{}', now(), now());
insert into tennis.role_memberships(user_id, role) values ('a0000000-0000-4000-8000-0000000000c1', 'admin');
update tennis.seasons set status = 'draft' where status = 'active';
insert into tennis.seasons(id, name, slug, status, start_date, end_date) values
('10000000-0000-4000-8000-0000000000c1', 'T v0.2', 't-v02', 'active', '2041-01-01', '2041-12-31');
insert into tennis.players(id, display_name, nationality, country_code) values
('20000000-0000-4000-8000-0000000000c1', 'P1', 'Chile', 'CL'), ('20000000-0000-4000-8000-0000000000c2', 'P2', 'Chile', 'CL'),
('20000000-0000-4000-8000-0000000000c3', 'P3', 'Chile', 'CL'), ('20000000-0000-4000-8000-0000000000c4', 'P4', 'Chile', 'CL');
insert into tennis.tournaments(id, name, short_name, default_surface, category) values
('30000000-0000-4000-8000-0000000000c1', 'V02 Open', 'V2O', 'hard', 'major'),
('30000000-0000-4000-8000-0000000000c2', 'V02 Legacy', 'V2L', 'clay', 'standard');
insert into tennis.tournament_editions(id, tournament_id, season_id, surface, start_date, end_date, status, draw_size, best_of, scoring_format, games_best_of) values
('40000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-0000000000c1', '10000000-0000-4000-8000-0000000000c1', 'hard', '2041-03-01', '2041-03-05', 'active', 4, 3, 'games', 5);
insert into tennis.tournament_editions(id, tournament_id, season_id, surface, start_date, end_date, status, draw_size, best_of) values
('40000000-0000-4000-8000-0000000000c2', '30000000-0000-4000-8000-0000000000c2', '10000000-0000-4000-8000-0000000000c1', 'clay', '2041-04-01', '2041-04-05', 'active', 4, 3);
insert into tennis.tournament_entries(tournament_edition_id, player_id, entry_status) values
('40000000-0000-4000-8000-0000000000c1', '20000000-0000-4000-8000-0000000000c1', 'active'), ('40000000-0000-4000-8000-0000000000c1', '20000000-0000-4000-8000-0000000000c2', 'active'),
('40000000-0000-4000-8000-0000000000c1', '20000000-0000-4000-8000-0000000000c3', 'active'), ('40000000-0000-4000-8000-0000000000c1', '20000000-0000-4000-8000-0000000000c4', 'active'),
('40000000-0000-4000-8000-0000000000c2', '20000000-0000-4000-8000-0000000000c1', 'active'), ('40000000-0000-4000-8000-0000000000c2', '20000000-0000-4000-8000-0000000000c2', 'active');
-- La final se inserta primero: los semifinales enlazan a ella.
insert into tennis.matches(id, tournament_edition_id, round, round_order, match_number) values
('60000000-0000-4000-8000-0000000000c1', '40000000-0000-4000-8000-0000000000c1', 'final', 2, 1);
insert into tennis.matches(id, tournament_edition_id, round, round_order, match_number, player1_id, player2_id, next_match_id, next_slot) values
('60000000-0000-4000-8000-0000000000c2', '40000000-0000-4000-8000-0000000000c1', 'semifinal', 1, 1, '20000000-0000-4000-8000-0000000000c1', '20000000-0000-4000-8000-0000000000c2', '60000000-0000-4000-8000-0000000000c1', 1),
('60000000-0000-4000-8000-0000000000c3', '40000000-0000-4000-8000-0000000000c1', 'semifinal', 1, 2, '20000000-0000-4000-8000-0000000000c3', '20000000-0000-4000-8000-0000000000c4', '60000000-0000-4000-8000-0000000000c1', 2);
insert into tennis.matches(id, tournament_edition_id, round, round_order, match_number, player1_id, player2_id, best_of) values
('60000000-0000-4000-8000-0000000000c4', '40000000-0000-4000-8000-0000000000c2', 'semifinal', 1, 1, '20000000-0000-4000-8000-0000000000c1', '20000000-0000-4000-8000-0000000000c2', 3);

-- Restricciones de formato (rol de fixtures).
select is((select scoring_format || ':' || games_best_of from tennis.matches where id = '60000000-0000-4000-8000-0000000000c2'), 'games:5', 'el partido hereda el formato de juegos de su edición');
select is((select scoring_format from tennis.matches where id = '60000000-0000-4000-8000-0000000000c4'), 'sets', 'las ediciones v0.1 conservan el formato de sets');
select throws_ok($$insert into tennis.tournament_editions(tournament_id, season_id, surface, start_date, end_date, draw_size, scoring_format) values ('30000000-0000-4000-8000-0000000000c2', '10000000-0000-4000-8000-0000000000c1', 'hard', '2041-05-01', '2041-05-02', 4, 'games')$$, '23514', null, 'el formato de juegos exige games_best_of');
select throws_ok($$insert into tennis.tournament_editions(tournament_id, season_id, surface, start_date, end_date, draw_size, scoring_format, games_best_of) values ('30000000-0000-4000-8000-0000000000c2', '10000000-0000-4000-8000-0000000000c1', 'hard', '2041-05-01', '2041-05-02', 4, 'games', 6)$$, '23514', null, 'los juegos solo admiten mejor de 5 o 7');
select throws_ok($$update tennis.matches set player1_points = 50 where id = '60000000-0000-4000-8000-0000000000c2'$$, '23514', null, 'los puntos solo admiten 0, 15, 30, 40 o 45');
select throws_ok($$update tennis.matches set player1_games = 3, player2_games = 3 where id = '60000000-0000-4000-8000-0000000000c2'$$, '23514', null, 'ambos jugadores no pueden alcanzar el objetivo');
select throws_ok($$update tennis.matches set player1_games = 2 where id = '60000000-0000-4000-8000-0000000000c4'$$, '23514', null, 'un partido de sets no admite marcador de juegos');
select throws_ok($$update tennis.tournament_editions set games_best_of = 7 where id = '40000000-0000-4000-8000-0000000000c1'$$, '55006', null, 'el formato no cambia con el cuadro creado');
select throws_ok($$insert into tennis.match_sets(match_id, set_number, player1_score, player2_score) values ('60000000-0000-4000-8000-0000000000c2', 1, 6, 4)$$, 'P0001', 'games format matches do not use sets', 'un partido de juegos no usa sets');
select throws_ok($$insert into tennis.tournaments(name, short_name, default_surface, category) values ('Otro', 'O', 'hard', 'atp500')$$, '23503', null, 'la categoría debe existir en el catálogo configurable');
select is((select count(*) from tennis.ranking_point_rules where category = 'major'), 5::bigint, 'la migración crea cinco logros por categoría');
select is((select points from tennis.ranking_point_rules where category = 'major' and reached = 'champion'), (select points from tennis.tournament_point_rules where category = 'major' and round = 'final'), 'los puntos de campeón conservan los valores de v0.1');

set local role anon;
select ok((select count(*) from tennis.ranking_point_rules) > 0, 'anon lee las reglas de ranking');
select throws_ok($$insert into tennis.tournament_categories(code, name) values ('anon', 'Anon')$$, '42501', null, 'anon no escribe categorías');
select throws_ok($$select tennis.record_match_point('60000000-0000-4000-8000-0000000000c2', 1)$$, '42501', null, 'anon no registra puntos');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-0000000000c2', true);
select throws_ok($$select tennis.record_match_point('60000000-0000-4000-8000-0000000000c2', 1)$$, '42501', null, 'un usuario normal no registra puntos');
select throws_ok($$insert into tennis.ranking_point_rules(category, reached, points) values ('major', 'champion', 1)$$, '42501', null, 'un usuario normal no edita reglas de ranking');

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-0000000000c1', true);
select lives_ok($$insert into tennis.tournament_categories(code, name, sort_order) values ('exhibicion', 'Exhibición', 95)$$, 'admin crea una categoría');
select lives_ok($$insert into tennis.ranking_point_rules(category, reached, points) values ('exhibicion', 'champion', 50)$$, 'admin configura puntos para la nueva categoría');

-- Puntuación 0 → 15 → 30 → 40 → 45 → juego.
select lives_ok($$select tennis.record_match_point('60000000-0000-4000-8000-0000000000c2', 1)$$, 'admin registra un punto');
select is((select player1_points from tennis.matches where id = '60000000-0000-4000-8000-0000000000c2'), 15::smallint, 'el primer punto vale 15');
select lives_ok($$select tennis.record_match_point('60000000-0000-4000-8000-0000000000c2', 1) from generate_series(1, 3)$$, 'admin registra tres puntos más');
select is((select player1_points from tennis.matches where id = '60000000-0000-4000-8000-0000000000c2'), 45::smallint, 'la secuencia llega a 45 sin deuce');
select lives_ok($$select tennis.record_match_point('60000000-0000-4000-8000-0000000000c2', 1)$$, 'puntuar en 45 gana el juego');
select ok((select player1_games = 1 and player1_points = 0 and player2_points = 0 and status = 'in_progress' from tennis.matches where id = '60000000-0000-4000-8000-0000000000c2'), 'el juego se suma y los puntos se reinician');
select lives_ok($$select tennis.record_match_point('60000000-0000-4000-8000-0000000000c2', 2) from generate_series(1, 5)$$, 'el jugador 2 gana un juego');
select lives_ok($$select tennis.record_match_point('60000000-0000-4000-8000-0000000000c2', 1) from generate_series(1, 10)$$, 'el jugador 1 gana dos juegos más');
select ok((select player1_games = 3 and player2_games = 1 from tennis.matches where id = '60000000-0000-4000-8000-0000000000c2'), 'al mejor de 5 gana el primero en llegar a 3 juegos');
select throws_ok($$select tennis.record_match_point('60000000-0000-4000-8000-0000000000c2', 1)$$, 'P0001', 'match is decided; confirm the result', 'no se puntúa un partido decidido');
select throws_ok($$select tennis.set_match_score('60000000-0000-4000-8000-0000000000c3', 3, 3, 0, 0, false)$$, 'P0001', 'invalid games score', 'el marcador directo rechaza dos ganadores');
select throws_ok($$select tennis.set_match_score('60000000-0000-4000-8000-0000000000c3', 2, 1, 50, 0, false)$$, 'P0001', 'invalid game points', 'el marcador directo rechaza puntos inválidos');
select throws_ok($$select tennis.set_match_score('60000000-0000-4000-8000-0000000000c4', 2, 1, 0, 0, false)$$, 'P0001', 'match uses the legacy sets format', 'el marcador de juegos no toca partidos de sets');

-- Confirmación y avance en el cuadro.
select lives_ok($$select tennis.confirm_match_result('60000000-0000-4000-8000-0000000000c2')$$, 'admin confirma la semifinal por juegos');
select ok((select status = 'finished' and winner_id = '20000000-0000-4000-8000-0000000000c1' from tennis.matches where id = '60000000-0000-4000-8000-0000000000c2'), 'la semifinal queda finalizada con el ganador correcto');
select is((select player1_id from tennis.matches where id = '60000000-0000-4000-8000-0000000000c1'), '20000000-0000-4000-8000-0000000000c1'::uuid, 'el ganador avanza a la final');
select throws_ok($$update tennis.matches set player1_games = 0 where id = '60000000-0000-4000-8000-0000000000c2'$$, '55006', null, 'un resultado confirmado no se modifica');
select throws_ok($$delete from tennis.matches where id = '60000000-0000-4000-8000-0000000000c2'$$, '55006', null, 'un resultado confirmado no se elimina');
select throws_ok($$select tennis.set_match_score('60000000-0000-4000-8000-0000000000c2', 0, 3, 0, 0, false)$$, 'P0001', 'match score is locked', 'el marcador confirmado queda bloqueado');
select lives_ok($$select tennis.set_match_score('60000000-0000-4000-8000-0000000000c3', 1, 3, 0, 0, true)$$, 'resultado directo de un partido ya disputado');
select is((select player2_id from tennis.matches where id = '60000000-0000-4000-8000-0000000000c1'), '20000000-0000-4000-8000-0000000000c4'::uuid, 'el ganador del resultado directo avanza al slot 2');
select lives_ok($$select tennis.set_match_score('60000000-0000-4000-8000-0000000000c1', 3, 2, 0, 0, true)$$, 'admin confirma la final');
select is((select entry_status from tennis.tournament_entries where tournament_edition_id = '40000000-0000-4000-8000-0000000000c1' and player_id = '20000000-0000-4000-8000-0000000000c1'), 'champion', 'el campeón queda registrado');
select is((select status from tennis.tournament_editions where id = '40000000-0000-4000-8000-0000000000c1'), 'completed', 'la final completa la edición');

-- El flujo de sets de v0.1 sigue funcionando.
select lives_ok($$insert into tennis.match_sets(match_id, set_number, player1_score, player2_score) values ('60000000-0000-4000-8000-0000000000c4', 1, 6, 4), ('60000000-0000-4000-8000-0000000000c4', 2, 6, 3)$$, 'admin registra sets en una edición v0.1');
select lives_ok($$select tennis.confirm_match_result('60000000-0000-4000-8000-0000000000c4')$$, 'la confirmación por sets sigue disponible');
select is((select winner_id from tennis.matches where id = '60000000-0000-4000-8000-0000000000c4'), '20000000-0000-4000-8000-0000000000c1'::uuid, 'los sets determinan el ganador legado');

select * from finish();
reset role;
rollback;
