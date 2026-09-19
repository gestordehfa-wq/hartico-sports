begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_table('football', 'seasons', 'seasons existe en football');
select has_table('football', 'competitions', 'competitions existe en football');
select has_table('football', 'teams', 'teams existe en football');
select has_table('football', 'players', 'players existe en football');
select has_table('football', 'season_player_rosters', 'plantillas existe en football');
select has_table('football', 'matches', 'matches existe en football');
select has_table('football', 'match_events', 'eventos existe en football');
select has_table('football', 'match_player_appearances', 'apariciones existe en football');
select has_table('football', 'awards', 'awards existe en football');

-- Neutraliza temporalmente cualquier temporada activa preexistente (p. ej.
-- datos de smoke testing en Cloud); se revierte con el rollback final.
update football.seasons set status = 'draft' where status = 'active';
insert into football.seasons(id, name, slug, status, start_date, end_date)
values ('10000000-0000-4000-8000-000000000001', 'Temporada válida', 'temporada-valida', 'active', '2030-01-01', '2030-12-31');
select throws_ok($$insert into football.seasons(name, slug, status, start_date, end_date) values ('Otra activa', 'otra-activa', 'active', '2031-01-01', '2031-12-31')$$, '23505', null, 'solo una temporada activa');

insert into football.competitions(id, season_id, name, short_name, type, status)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Liga', 'LIG', 'league', 'active');
insert into football.teams(id, name, short_name, code, country, country_code) values
('30000000-0000-4000-8000-000000000001', 'Equipo Uno', 'Uno', 'UNO', 'Chile', 'CL'),
('30000000-0000-4000-8000-000000000002', 'Equipo Dos', 'Dos', 'DOS', 'Chile', 'CL');
select throws_ok($$insert into football.matches(competition_id, season_id, home_team_id, away_team_id, scheduled_at) values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', now())$$, '23514', null, 'un equipo no juega contra sí mismo');
select throws_ok($$insert into football.matches(competition_id, season_id, home_team_id, away_team_id, scheduled_at, status) values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', now(), 'finished')$$, '23514', null, 'un finalizado exige marcador');

select * from finish();
rollback;
