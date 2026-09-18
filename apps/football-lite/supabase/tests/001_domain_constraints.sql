begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_table('public', 'seasons', 'seasons existe');
select has_table('public', 'competitions', 'competitions existe');
select has_table('public', 'teams', 'teams existe');
select has_table('public', 'players', 'players existe');
select has_table('public', 'season_player_rosters', 'plantillas existe');
select has_table('public', 'matches', 'matches existe');
select has_table('public', 'match_events', 'eventos existe');
select has_table('public', 'match_player_appearances', 'apariciones existe');
select has_table('public', 'awards', 'awards existe');

insert into public.seasons(id, name, slug, status, start_date, end_date)
values ('10000000-0000-4000-8000-000000000001', 'Temporada válida', 'temporada-valida', 'active', '2030-01-01', '2030-12-31');
select throws_ok($$insert into public.seasons(name, slug, status, start_date, end_date) values ('Otra activa', 'otra-activa', 'active', '2031-01-01', '2031-12-31')$$, '23505', null, 'solo una temporada activa');

insert into public.competitions(id, season_id, name, short_name, type, status)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Liga', 'LIG', 'league', 'active');
insert into public.teams(id, name, short_name, code, country, country_code) values
('30000000-0000-4000-8000-000000000001', 'Equipo Uno', 'Uno', 'UNO', 'Chile', 'CL'),
('30000000-0000-4000-8000-000000000002', 'Equipo Dos', 'Dos', 'DOS', 'Chile', 'CL');
select throws_ok($$insert into public.matches(competition_id, season_id, home_team_id, away_team_id, scheduled_at) values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', now())$$, '23514', null, 'un equipo no juega contra sí mismo');
select throws_ok($$insert into public.matches(competition_id, season_id, home_team_id, away_team_id, scheduled_at, status) values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', now(), 'finished')$$, '23514', null, 'un finalizado exige marcador');

select * from finish();
rollback;
