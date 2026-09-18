-- Generated from apps/tennis/supabase/tests/002_rls_audit.sql by tooling/assemble-supabase.mjs. Do not edit this copy.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@tennis.test', '', now(), '{}', '{}', now(), now()),
('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user@tennis.test', '', now(), '{}', '{}', now(), now());
insert into tennis.role_memberships(user_id, role) values ('a0000000-0000-4000-8000-000000000001', 'admin');
insert into tennis.seasons(id, name, slug, status, start_date, end_date) values
('11000000-0000-4000-8000-000000000001', 'Pública', 'publica', 'active', '2030-01-01', '2030-12-31'),
('11000000-0000-4000-8000-000000000002', 'Borrador', 'borrador', 'draft', '2031-01-01', '2031-12-31');
insert into tennis.players(id, display_name, nationality, country_code) values ('21000000-0000-4000-8000-000000000001', 'Jugador', 'Chile', 'CL');
insert into tennis.tournaments(id, name, short_name, default_surface, category) values ('31000000-0000-4000-8000-000000000001', 'Open público', 'OP', 'hard', 'standard');
insert into tennis.tournament_editions(id, tournament_id, season_id, surface, start_date, end_date, status, draw_size) values ('41000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'hard', '2030-03-01', '2030-03-05', 'active', 4);

set local role anon;
select is((select count(*) from tennis.seasons), 1::bigint, 'anon solo lee temporadas publicadas');
select is((select count(*) from tennis.tournament_editions), 1::bigint, 'anon lee ediciones publicadas');
select is((select count(*) from tennis.tournament_point_rules), 20::bigint, 'anon lee reglas de ranking');
select throws_ok($$insert into tennis.players(display_name, nationality, country_code) values ('Intruso', 'Chile', 'CL')$$, '42501', null, 'anon no escribe');
select throws_ok($$select count(*) from tennis.audit_events$$, '42501', null, 'anon no lee auditoría');
select throws_ok($$select tennis.generate_tournament_draw('41000000-0000-4000-8000-000000000001')$$, '42501', null, 'anon no ejecuta generación');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
select is(tennis.current_user_is_admin(), false, 'authenticated normal no es admin');
select is((select count(*) from tennis.seasons), 2::bigint, 'authenticated lee borradores');
select throws_ok($$insert into tennis.players(display_name, nationality, country_code) values ('No autorizado', 'Chile', 'CL')$$, '42501', null, 'authenticated normal no escribe');
select throws_ok($$insert into tennis.role_memberships(user_id, role) values ('a0000000-0000-4000-8000-000000000002', 'admin')$$, '42501', null, 'usuario no se autopromueve');
select throws_ok($$select count(*) from tennis.audit_events$$, '42501', null, 'usuario normal no lee auditoría');
select throws_ok($$select tennis.generate_tournament_draw('41000000-0000-4000-8000-000000000001')$$, '42501', null, 'usuario normal no genera cuadro');

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
select is(tennis.current_user_is_admin(), true, 'admin reconocido');
select lives_ok($$insert into tennis.players(id, display_name, nationality, country_code) values ('21000000-0000-4000-8000-000000000002', 'Admin Player', 'Chile', 'CL')$$, 'admin crea');
select lives_ok($$update tennis.players set display_name = 'Editado' where id = '21000000-0000-4000-8000-000000000002'$$, 'admin edita');
select ok((select actor_id = 'a0000000-0000-4000-8000-000000000001' and action = 'INSERT' and after_data ->> 'display_name' = 'Admin Player' from tennis.audit_events where entity = 'players' and entity_id = '21000000-0000-4000-8000-000000000002' and action = 'INSERT'), 'insert auditado');
select ok((select before_data ->> 'display_name' = 'Admin Player' and after_data ->> 'display_name' = 'Editado' from tennis.audit_events where entity = 'players' and entity_id = '21000000-0000-4000-8000-000000000002' and action = 'UPDATE'), 'update conserva before/after');
select throws_ok($$insert into tennis.audit_events(action, entity) values ('INSERT', 'forged')$$, '42501', null, 'admin no falsifica auditoría');

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
select is(tennis.current_user_is_admin(), false, 'cambio de actor aísla privilegios');
select throws_ok($$delete from tennis.players where id = '21000000-0000-4000-8000-000000000001'$$, '42501', null, 'usuario normal no hereda privilegios');

select * from finish();
reset role;
rollback;
