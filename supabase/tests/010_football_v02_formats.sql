-- Generated from apps/football-lite/supabase/tests/003_competition_formats.sql by tooling/assemble-supabase.mjs. Do not edit this copy.
begin;
create extension if not exists pgtap with schema extensions;
select plan(46);

-- Fixtures transaccionales; se revierten con el rollback final.
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
('a0000000-0000-4000-8000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'v02-football-admin@test.local', '', now(), '{}', '{}', now(), now()),
('a0000000-0000-4000-8000-0000000000d2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'v02-football-user@test.local', '', now(), '{}', '{}', now(), now());
insert into football.role_memberships(user_id, role) values ('a0000000-0000-4000-8000-0000000000d1', 'admin');
update football.seasons set status = 'draft' where status = 'active';
insert into football.seasons(id, name, slug, status, start_date, end_date) values
('10000000-0000-4000-8000-0000000000d1', 'F v0.2', 'f-v02', 'active', '2042-01-01', '2042-12-31');
insert into football.teams(id, name, short_name, code, country, country_code) values
('20000000-0000-4000-8000-0000000000d1', 'Team One', 'One', 'FD1', 'Chile', 'CL'),
('20000000-0000-4000-8000-0000000000d2', 'Team Two', 'Two', 'FD2', 'Chile', 'CL'),
('20000000-0000-4000-8000-0000000000d3', 'Team Three', 'Three', 'FD3', 'Chile', 'CL'),
('20000000-0000-4000-8000-0000000000d4', 'Team Four', 'Four', 'FD4', 'Chile', 'CL'),
('20000000-0000-4000-8000-0000000000d5', 'Team Five', 'Five', 'FD5', 'Chile', 'CL');
insert into football.competitions(id, season_id, name, short_name, type, status, champion_team_id) values
('30000000-0000-4000-8000-0000000000d1', '10000000-0000-4000-8000-0000000000d1', 'Liga v02', 'LV2', 'league', 'active', null),
('30000000-0000-4000-8000-0000000000d2', '10000000-0000-4000-8000-0000000000d1', 'Copa v02', 'CV2', 'cup', 'active', null),
('30000000-0000-4000-8000-0000000000d3', '10000000-0000-4000-8000-0000000000d1', 'Supercopa v02', 'SV2', 'supercup', 'active', null),
('30000000-0000-4000-8000-0000000000d4', '10000000-0000-4000-8000-0000000000d1', 'Liga empate', 'LEM', 'league', 'active', null),
('30000000-0000-4000-8000-0000000000d5', '10000000-0000-4000-8000-0000000000d1', 'Copa doblete', 'CDB', 'cup', 'completed', '20000000-0000-4000-8000-0000000000d1'),
('30000000-0000-4000-8000-0000000000d6', '10000000-0000-4000-8000-0000000000d1', 'Supercopa doblete', 'SDB', 'supercup', 'active', null);
insert into football.matches(id, competition_id, season_id, home_team_id, away_team_id, matchday, scheduled_at, status, home_score, away_score) values
('60000000-0000-4000-8000-0000000000d1', '30000000-0000-4000-8000-0000000000d4', '10000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d2', 1, '2042-03-01T15:00:00Z', 'finished', 1, 1);

set local role anon;
select is((select count(*) from football.competition_teams), 0::bigint, 'anon lee inscripciones publicadas (aún vacías)');
select throws_ok($$insert into football.competition_teams(competition_id, team_id) values ('30000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1')$$, '42501', null, 'anon no inscribe equipos');
select throws_ok($$select football.close_league('30000000-0000-4000-8000-0000000000d4')$$, '42501', null, 'anon no cierra ligas');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-0000000000d2', true);
select throws_ok($$select football.close_league('30000000-0000-4000-8000-0000000000d4')$$, '42501', null, 'un usuario normal no cierra ligas');
select throws_ok($$select football.advance_knockout_winner('60000000-0000-4000-8000-0000000000d1')$$, '42501', null, 'un usuario normal no avanza ganadores');

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-0000000000d1', true);

-- Inscripción de equipos.
select lives_ok($$insert into football.competition_teams(competition_id, team_id, seed) values
  ('30000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1', 1),
  ('30000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d2', 2),
  ('30000000-0000-4000-8000-0000000000d2', '20000000-0000-4000-8000-0000000000d1', 1),
  ('30000000-0000-4000-8000-0000000000d2', '20000000-0000-4000-8000-0000000000d2', 2),
  ('30000000-0000-4000-8000-0000000000d2', '20000000-0000-4000-8000-0000000000d3', 3),
  ('30000000-0000-4000-8000-0000000000d2', '20000000-0000-4000-8000-0000000000d4', 4)$$, 'admin inscribe equipos en liga y copa');
select throws_ok($$insert into football.competition_teams(competition_id, team_id) values ('30000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1')$$, '23505', null, 'un equipo no se inscribe dos veces');
select throws_ok($$insert into football.competition_teams(competition_id, team_id) values ('30000000-0000-4000-8000-0000000000d3', '20000000-0000-4000-8000-0000000000d1')$$, 'P0001', 'only leagues and cups accept team enrollments', 'la Supercopa no admite inscripciones');
select throws_ok($$insert into football.matches(competition_id, season_id, home_team_id, away_team_id, matchday, scheduled_at) values ('30000000-0000-4000-8000-0000000000d1', '10000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d5', 1, '2042-03-01T15:00:00Z')$$, '23514', null, 'el fixture solo admite equipos inscritos');
select throws_ok($$insert into football.matches(competition_id, season_id, home_team_id, away_team_id, scheduled_at, stage) values ('30000000-0000-4000-8000-0000000000d2', '10000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d2', '2042-03-01T15:00:00Z', 'final')$$, '23514', null, 'una ronda de copa exige número y orden');
select throws_ok($$insert into football.matches(competition_id, season_id, home_team_id, away_team_id, matchday, scheduled_at, status, home_score, away_score) values ('30000000-0000-4000-8000-0000000000d1', '10000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1', null, 1, '2042-03-01T15:00:00Z', 'finished', 1, 0)$$, '23514', null, 'un partido finalizado exige ambos equipos');

-- Liga: partidos, clasificación y campeón.
select lives_ok($$insert into football.matches(id, competition_id, season_id, home_team_id, away_team_id, matchday, scheduled_at, status, home_score, away_score) values
  ('60000000-0000-4000-8000-0000000000d2', '30000000-0000-4000-8000-0000000000d1', '10000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d2', 1, '2042-03-08T15:00:00Z', 'finished', 2, 0)$$, 'admin registra un partido de liga');
select throws_ok($$insert into football.competition_teams(competition_id, team_id) values ('30000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d3')$$, '55006', null, 'las inscripciones se cierran al existir el fixture');
select lives_ok($$select football.close_league('30000000-0000-4000-8000-0000000000d1')$$, 'admin cierra la liga y el campeón sale de la clasificación');
select is((select champion_team_id from football.competitions where id = '30000000-0000-4000-8000-0000000000d1'), '20000000-0000-4000-8000-0000000000d1'::uuid, 'el campeón de liga queda registrado');
select is((select count(*) from football.awards where competition_id = '30000000-0000-4000-8000-0000000000d1' and award_type = 'champion'), 1::bigint, 'el campeón genera su premio');
select throws_ok($$update football.matches set home_score = 0 where id = '60000000-0000-4000-8000-0000000000d2'$$, '55006', null, 'una liga cerrada no admite cambiar resultados');
select throws_ok($$select football.close_league('30000000-0000-4000-8000-0000000000d4', null, null)$$, '23514', null, 'un empate en la cima exige decisión del administrador');
select throws_ok($$select football.close_league('30000000-0000-4000-8000-0000000000d4', '20000000-0000-4000-8000-0000000000d3', 'Definido por reglamento')$$, '23514', null, 'el campeón elegido debe estar empatado en la cima');
select lives_ok($$select football.close_league('30000000-0000-4000-8000-0000000000d4', '20000000-0000-4000-8000-0000000000d2', 'Definido por reglamento de la asociación')$$, 'el administrador define el campeón empatado');

-- Copa: cuadro de 4, empate eliminatorio y campeón.
select lives_ok($$insert into football.matches(id, competition_id, season_id, home_team_id, away_team_id, scheduled_at, status, home_score, away_score, stage, round_order, match_number, next_match_id, next_slot) values
  ('60000000-0000-4000-8000-0000000000e1', '30000000-0000-4000-8000-0000000000d2', '10000000-0000-4000-8000-0000000000d1', null, null, '2042-04-10T15:00:00Z', 'scheduled', null, null, 'final', 2, 1, null, null),
  ('60000000-0000-4000-8000-0000000000e2', '30000000-0000-4000-8000-0000000000d2', '10000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d2', '2042-04-01T15:00:00Z', 'finished', 1, 1, 'semifinal', 1, 1, '60000000-0000-4000-8000-0000000000e1', 1),
  ('60000000-0000-4000-8000-0000000000e3', '30000000-0000-4000-8000-0000000000d2', '10000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d3', '20000000-0000-4000-8000-0000000000d4', '2042-04-01T18:00:00Z', 'finished', 2, 0, 'semifinal', 1, 2, '60000000-0000-4000-8000-0000000000e1', 2)$$, 'admin crea el cuadro de copa con rondas enlazadas');
select throws_ok($$select football.advance_knockout_winner('60000000-0000-4000-8000-0000000000e2')$$, '23514', null, 'un empate eliminatorio no se resuelve automáticamente');
select throws_ok($$select football.advance_knockout_winner('60000000-0000-4000-8000-0000000000e2', '20000000-0000-4000-8000-0000000000d3', 'Definido por reglamento')$$, '23514', null, 'el ganador del empate debe ser uno de los participantes');
select throws_ok($$select football.advance_knockout_winner('60000000-0000-4000-8000-0000000000e2', '20000000-0000-4000-8000-0000000000d2', '')$$, '23514', null, 'el empate exige registrar el mecanismo reglamentario');
select lives_ok($$select football.advance_knockout_winner('60000000-0000-4000-8000-0000000000e2', '20000000-0000-4000-8000-0000000000d2', 'Definido por reglamento de la asociación')$$, 'el administrador define al ganador del empate');
select is((select home_team_id from football.matches where id = '60000000-0000-4000-8000-0000000000e1'), '20000000-0000-4000-8000-0000000000d2'::uuid, 'el ganador avanza al slot local de la final');
select ok((select winner_team_id = '20000000-0000-4000-8000-0000000000d2' and tiebreak_note is not null from football.matches where id = '60000000-0000-4000-8000-0000000000e2'), 'el mecanismo reglamentario queda registrado');
select throws_ok($$update football.matches set home_score = 0 where id = '60000000-0000-4000-8000-0000000000e2'$$, '55006', null, 'un partido con ganador registrado no se modifica');
select lives_ok($$select football.advance_knockout_winner('60000000-0000-4000-8000-0000000000e3')$$, 'un resultado sin empate avanza solo');
select is((select away_team_id from football.matches where id = '60000000-0000-4000-8000-0000000000e1'), '20000000-0000-4000-8000-0000000000d3'::uuid, 'el otro ganador avanza al slot visitante');
select throws_ok($$select football.advance_knockout_winner('60000000-0000-4000-8000-0000000000e1')$$, 'P0001', 'match must be finished with a score', 'la final sin resultado no avanza');
select lives_ok($$update football.matches set status = 'finished', home_score = 0, away_score = 1 where id = '60000000-0000-4000-8000-0000000000e1'$$, 'admin registra el resultado de la final');
select lives_ok($$select football.advance_knockout_winner('60000000-0000-4000-8000-0000000000e1')$$, 'la final define al campeón de copa');
select ok((select champion_team_id = '20000000-0000-4000-8000-0000000000d3' and status = 'completed' from football.competitions where id = '30000000-0000-4000-8000-0000000000d2'), 'el campeón de copa queda registrado y la competición completada');

-- Supercopa: campeones registrados y rival elegido cuando hay doblete.
select lives_ok($$select football.generate_supercup('30000000-0000-4000-8000-0000000000d3', '30000000-0000-4000-8000-0000000000d1', '30000000-0000-4000-8000-0000000000d2', '2042-05-01T15:00:00Z')$$, 'admin genera la Supercopa con los campeones registrados');
select ok((select home_team_id = '20000000-0000-4000-8000-0000000000d1' and away_team_id = '20000000-0000-4000-8000-0000000000d3' and stage = 'supercup' from football.matches where competition_id = '30000000-0000-4000-8000-0000000000d3'), 'la Supercopa enfrenta al campeón de liga y al de copa');
select throws_ok($$select football.generate_supercup('30000000-0000-4000-8000-0000000000d3', '30000000-0000-4000-8000-0000000000d1', '30000000-0000-4000-8000-0000000000d2', '2042-05-01T15:00:00Z')$$, '55006', null, 'la Supercopa no se genera dos veces');
select throws_ok($$select football.generate_supercup('30000000-0000-4000-8000-0000000000d6', '30000000-0000-4000-8000-0000000000d1', '30000000-0000-4000-8000-0000000000d5', '2042-05-01T15:00:00Z')$$, '23514', null, 'con doblete el rival no se elige automáticamente');
select throws_ok($$select football.generate_supercup('30000000-0000-4000-8000-0000000000d6', '30000000-0000-4000-8000-0000000000d1', '30000000-0000-4000-8000-0000000000d5', '2042-05-01T15:00:00Z', '20000000-0000-4000-8000-0000000000d1')$$, '23514', null, 'el rival no puede ser el propio doblete');
select lives_ok($$select football.generate_supercup('30000000-0000-4000-8000-0000000000d6', '30000000-0000-4000-8000-0000000000d1', '30000000-0000-4000-8000-0000000000d5', '2042-05-01T15:00:00Z', '20000000-0000-4000-8000-0000000000d4')$$, 'el administrador elige el rival del doblete');
select is((select away_team_id from football.matches where competition_id = '30000000-0000-4000-8000-0000000000d6'), '20000000-0000-4000-8000-0000000000d4'::uuid, 'la Supercopa usa el rival elegido');
select lives_ok($$update football.matches set status = 'finished', home_score = 2, away_score = 1 where competition_id = '30000000-0000-4000-8000-0000000000d3'$$, 'admin registra el resultado de la Supercopa');
select lives_ok($$select football.advance_knockout_winner((select id from football.matches where competition_id = '30000000-0000-4000-8000-0000000000d3'))$$, 'la Supercopa define ganador e historial');
select ok((select champion_team_id = '20000000-0000-4000-8000-0000000000d1' and source_league_id is not null and source_cup_id is not null from football.competitions where id = '30000000-0000-4000-8000-0000000000d3'), 'la Supercopa conserva campeón y competiciones de origen');

set local role anon;
select ok((select count(*) from football.competition_teams) > 0, 'anon lee inscripciones publicadas');
select is((select count(*) from football.matches where competition_id = '30000000-0000-4000-8000-0000000000d2' and stage = 'final'), 1::bigint, 'anon lee el cuadro público');
reset role;

select * from finish();
reset role;
rollback;
