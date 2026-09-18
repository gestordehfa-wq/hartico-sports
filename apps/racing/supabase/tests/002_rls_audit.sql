begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local', '', now(), '{}', '{}', now(), now()),
  ('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user@test.local', '', now(), '{}', '{}', now(), now());
insert into public.role_memberships (user_id, role) values ('a0000000-0000-4000-8000-000000000001', 'admin');
insert into public.seasons (id, name, slug, status, start_date, end_date)
values ('10000000-0000-4000-8000-000000000001', 'Public fixture', 'public-fixture', 'active', '2027-01-01', '2027-12-31');
insert into public.drivers (id, display_name, nationality, country_code)
values ('30000000-0000-4000-8000-000000000001', 'Public Driver', 'Testland', 'TT');
insert into public.teams (id, name, short_name, code, country, country_code)
values ('20000000-0000-4000-8000-000000000001', 'Public Team', 'Public', 'PUB', 'Testland', 'TT');
insert into public.circuits (id, name, slug, country, country_code, default_laps)
values ('40000000-0000-4000-8000-000000000001', 'Public Circuit', 'public-circuit', 'Testland', 'TT', 6);
insert into public.grand_prix_events (id, season_id, circuit_id, name, slug, round_number, scheduled_date)
values ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Public Grand Prix', 'public-grand-prix', 1, '2027-03-01');
insert into public.seasons (id, name, slug, status, start_date, end_date) values ('11000000-0000-4000-8000-000000000001', 'Draft test', 'draft-test', 'draft', '2028-01-01', '2028-12-31');

set local role anon;
select is((select count(*) from public.seasons where id = '11000000-0000-4000-8000-000000000001'), 0::bigint, 'anon no lee borradores');
select is((select count(*) from public.seasons where status = 'active'), 1::bigint, 'anon lee temporada activa');
select is((select count(*) from public.drivers), 1::bigint, 'anon lee el catálogo público de pilotos');
select is((select count(*) from public.grand_prix_calendar), 1::bigint, 'anon lee el calendario público derivado');
select throws_ok($$insert into public.drivers (display_name, nationality, country_code) values ('Anon write', 'Test', 'TT')$$, '42501', null, 'anon no puede escribir');
select throws_ok($$select count(*) from public.audit_events$$, '42501', null, 'anon no puede leer auditoría');
select throws_ok($$select count(*) from public.profiles$$, '42501', null, 'anon no puede leer perfiles');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(public.current_user_is_admin(), false, 'usuario normal no es admin');
select is((select count(*) from public.seasons where status = 'active'), 1::bigint, 'usuario normal conserva lectura pública');
select throws_ok($$insert into public.drivers (display_name, nationality, country_code) values ('User write', 'Test', 'TT')$$, '42501', null, 'usuario normal no puede escribir');
select throws_ok($$insert into public.role_memberships (user_id, role) values ('a0000000-0000-4000-8000-000000000002', 'admin')$$, '42501', null, 'usuario normal no puede promoverse a admin');
select throws_ok($$insert into public.audit_events (action, entity) values ('INSERT', 'forged')$$, '42501', null, 'usuario normal no puede insertar auditoría');

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
select is(public.current_user_is_admin(), true, 'membresía admin se reconoce');

select lives_ok($$insert into public.seasons (id, name, slug, status, start_date, end_date) values ('12000000-0000-4000-8000-000000000001', 'Integration Season', 'integration-season', 'draft', '2029-01-01', '2029-12-31')$$, 'admin crea una temporada');
select is((select name from public.seasons where id = '12000000-0000-4000-8000-000000000001'), 'Integration Season', 'admin lee la temporada creada');
select lives_ok($$update public.seasons set name = 'Integration Season Updated' where id = '12000000-0000-4000-8000-000000000001'$$, 'admin modifica una temporada');
select is((select name from public.seasons where id = '12000000-0000-4000-8000-000000000001'), 'Integration Season Updated', 'admin lee la temporada modificada');

select lives_ok($$insert into public.drivers (id, display_name, nationality, country_code, racing_number) values ('31000000-0000-4000-8000-000000000001', 'Admin Driver', 'Testland', 'TT', 101)$$, 'admin crea un piloto');
select lives_ok($$update public.drivers set display_name = 'Admin Driver Updated' where id = '31000000-0000-4000-8000-000000000001'$$, 'admin modifica un piloto');
select is((select display_name from public.drivers where id = '31000000-0000-4000-8000-000000000001'), 'Admin Driver Updated', 'admin lee el piloto modificado');

select lives_ok($$insert into public.teams (id, name, short_name, code, country, country_code) values ('21000000-0000-4000-8000-000000000001', 'Admin Team', 'Admin', 'ADM', 'Testland', 'TT')$$, 'admin crea una escudería');
select lives_ok($$insert into public.season_driver_entries (id, season_id, driver_id, team_id, start_date, end_date) values ('51000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '2029-01-01', '2029-12-31')$$, 'admin asigna piloto, escudería y temporada');
select lives_ok($$insert into public.circuits (id, name, slug, country, country_code, default_laps) values ('41000000-0000-4000-8000-000000000001', 'Admin Circuit', 'admin-circuit', 'Testland', 'TT', 5)$$, 'admin crea un circuito válido');
select lives_ok($$insert into public.grand_prix_events (id, season_id, circuit_id, name, slug, round_number, scheduled_date, race_laps) values ('61000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', 'Admin Grand Prix', 'admin-grand-prix', 1, '2029-03-01', 8)$$, 'admin crea una ronda');
select is((select effective_race_laps from public.grand_prix_calendar where id = '61000000-0000-4000-8000-000000000001'), 8::smallint, 'admin lee la ronda desde el calendario derivado');

select ok((select actor_id = 'a0000000-0000-4000-8000-000000000001' and action = 'INSERT' and occurred_at is not null and before_data is null and after_data ->> 'name' = 'Integration Season' from public.audit_events where entity = 'seasons' and entity_id = '12000000-0000-4000-8000-000000000001' and action = 'INSERT'), 'auditoría de insert captura entidad, id, actor, timestamp y after');
select ok((select actor_id = 'a0000000-0000-4000-8000-000000000001' and occurred_at is not null and before_data ->> 'name' = 'Integration Season' and after_data ->> 'name' = 'Integration Season Updated' from public.audit_events where entity = 'seasons' and entity_id = '12000000-0000-4000-8000-000000000001' and action = 'UPDATE'), 'auditoría de update captura before y after');

select lives_ok($$insert into public.drivers (id, display_name, nationality, country_code) values ('31000000-0000-4000-8000-000000000002', 'Disposable Driver', 'Testland', 'TT')$$, 'admin crea un piloto eliminable');
select lives_ok($$delete from public.drivers where id = '31000000-0000-4000-8000-000000000002'$$, 'admin elimina un piloto sin referencias');
select ok((select actor_id = 'a0000000-0000-4000-8000-000000000001' and occurred_at is not null and before_data ->> 'display_name' = 'Disposable Driver' and after_data is null from public.audit_events where entity = 'drivers' and entity_id = '31000000-0000-4000-8000-000000000002' and action = 'DELETE'), 'auditoría de delete conserva actor, timestamp y before');

select throws_ok($$insert into public.audit_events (action, entity) values ('INSERT', 'forged-by-admin')$$, '42501', null, 'admin no puede insertar auditoría manualmente');
select throws_ok($$update public.audit_events set entity = 'tampered' where entity_id = '12000000-0000-4000-8000-000000000001'$$, '42501', null, 'admin no puede modificar el historial de auditoría');

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
select is(public.current_user_is_admin(), false, 'cambiar a usuario normal elimina capacidades admin');
select throws_ok($$insert into public.teams (name, short_name, code, country, country_code) values ('User Team', 'User', 'USR', 'Testland', 'TT')$$, '42501', null, 'usuario normal sigue sin CRUD tras operaciones admin');
select is((select count(*) from public.seasons where id = '12000000-0000-4000-8000-000000000001'), 0::bigint, 'usuario normal no ve la temporada draft del admin');

select * from finish();
reset role;
rollback;
