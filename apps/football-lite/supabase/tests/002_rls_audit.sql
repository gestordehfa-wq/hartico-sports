begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@football.test', '', now(), '{}', '{}', now(), now()),
('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user@football.test', '', now(), '{}', '{}', now(), now());
insert into football.role_memberships(user_id, role) values ('a0000000-0000-4000-8000-000000000001', 'admin');
-- Neutraliza temporalmente cualquier temporada activa preexistente (p. ej.
-- datos de smoke testing en Cloud); se revierte con el rollback final.
update football.seasons set status = 'draft' where status = 'active';
insert into football.seasons(id, name, slug, status, start_date, end_date) values
('11000000-0000-4000-8000-000000000001', 'Publicada', 'publicada', 'active', '2030-01-01', '2030-12-31'),
('11000000-0000-4000-8000-000000000002', 'Borrador', 'borrador', 'draft', '2031-01-01', '2031-12-31');
insert into football.competitions(id, season_id, name, short_name, type, status) values
('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'Liga pública', 'LP', 'league', 'active');
insert into football.teams(id, name, short_name, code, country, country_code) values
('31000000-0000-4000-8000-000000000001', 'Local', 'Local', 'LOC', 'Chile', 'CL'),
('31000000-0000-4000-8000-000000000002', 'Visita', 'Visita', 'VIS', 'Chile', 'CL');
insert into football.players(id, display_name, nationality, country_code, position) values
('41000000-0000-4000-8000-000000000001', 'Delantero', 'Chile', 'CL', 'ATK');
insert into football.matches(id, competition_id, season_id, home_team_id, away_team_id, scheduled_at, status, home_score, away_score) values
('51000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000002', now(), 'finished', 1, 0);
insert into football.match_player_appearances(match_id, player_id, team_id, starter) values ('51000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', true);
insert into football.match_events(match_id, player_id, team_id, event_type, minute) values ('51000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 'goal', 20);

set local role anon;
select is((select count(*) from football.seasons), 1::bigint, 'anon solo lee temporadas publicadas');
select is((select count(*) from football.matches), 1::bigint, 'anon lee partidos publicados');
select is((select points from football.league_standings where team_id = '31000000-0000-4000-8000-000000000001'), 3, 'anon lee clasificación derivada');
select throws_ok($$insert into football.teams(name, short_name, code, country, country_code) values ('Intruso', 'Intruso', 'INT', 'Chile', 'CL')$$, '42501', null, 'anon no escribe');
select throws_ok($$select count(*) from football.audit_events$$, '42501', null, 'anon no lee auditoría');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
select is(football.current_user_is_admin(), false, 'authenticated normal no es admin');
select is((select count(*) from football.seasons where id in ('11000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002')), 2::bigint, 'authenticated puede leer borradores');
select throws_ok($$insert into football.players(display_name, nationality, country_code, position) values ('No autorizado', 'Chile', 'CL', 'MED')$$, '42501', null, 'authenticated normal no escribe');
select throws_ok($$insert into football.role_memberships(user_id, role) values ('a0000000-0000-4000-8000-000000000002', 'admin')$$, '42501', null, 'usuario no se autopromueve');
select is((select count(*) from football.audit_events), 0::bigint, 'usuario normal no ve auditoría');

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
select is(football.current_user_is_admin(), true, 'admin reconocido');
select lives_ok($$insert into football.teams(id, name, short_name, code, country, country_code) values ('31000000-0000-4000-8000-000000000003', 'Admin FC', 'Admin', 'ADM', 'Chile', 'CL')$$, 'admin crea');
select lives_ok($$update football.teams set short_name = 'Admin editado' where id = '31000000-0000-4000-8000-000000000003'$$, 'admin edita');
select is((select short_name from football.teams where id = '31000000-0000-4000-8000-000000000003'), 'Admin editado', 'edición persistida');
select ok((select actor_id = 'a0000000-0000-4000-8000-000000000001' and action = 'INSERT' and after_data ->> 'name' = 'Admin FC' from football.audit_events where entity = 'teams' and entity_id = '31000000-0000-4000-8000-000000000003' and action = 'INSERT'), 'insert auditado');
select ok((select before_data ->> 'short_name' = 'Admin' and after_data ->> 'short_name' = 'Admin editado' from football.audit_events where entity = 'teams' and entity_id = '31000000-0000-4000-8000-000000000003' and action = 'UPDATE'), 'update conserva before y after');
select throws_ok($$insert into football.audit_events(entity, action) values ('forged', 'INSERT')$$, '42501', null, 'admin no falsifica auditoría');
select lives_ok($$delete from football.teams where id = '31000000-0000-4000-8000-000000000003'$$, 'admin elimina sin referencias');
select ok((select before_data ->> 'name' = 'Admin FC' and after_data is null from football.audit_events where entity = 'teams' and entity_id = '31000000-0000-4000-8000-000000000003' and action = 'DELETE'), 'delete auditado');

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
select is(football.current_user_is_admin(), false, 'cambio de actor aísla privilegios');
select is_empty($$delete from football.players where id = '41000000-0000-4000-8000-000000000001' returning id$$, 'usuario normal no hereda privilegios de borrado');

select * from finish();
reset role;
rollback;
