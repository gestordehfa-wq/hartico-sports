begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
('b0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'racing-admin@test.local', '', now(), '{}', '{}', now(), now()),
('b0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'football-admin@test.local', '', now(), '{}', '{}', now(), now()),
('b0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tennis-admin@test.local', '', now(), '{}', '{}', now(), now()),
('b0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'normal@test.local', '', now(), '{}', '{}', now(), now());

insert into racing.role_memberships(user_id, role) values ('b0000000-0000-4000-8000-000000000001', 'admin');
insert into football.role_memberships(user_id, role) values ('b0000000-0000-4000-8000-000000000002', 'admin');
insert into tennis.role_memberships(user_id, role) values ('b0000000-0000-4000-8000-000000000003', 'admin');

insert into racing.seasons(id, name, slug, status, start_date, end_date) values ('b1000000-0000-4000-8000-000000000001', 'Racing pública', 'racing-publica', 'active', '2035-01-01', '2035-12-31');
insert into football.seasons(id, name, slug, status, start_date, end_date) values ('b2000000-0000-4000-8000-000000000001', 'Football pública', 'football-publica', 'active', '2035-01-01', '2035-12-31');
insert into tennis.seasons(id, name, slug, status, start_date, end_date) values ('b3000000-0000-4000-8000-000000000001', 'Tennis pública', 'tennis-publica', 'active', '2035-01-01', '2035-12-31');

set local role anon;
select is((select count(*) from racing.seasons), 1::bigint, 'anon lee Racing publicado');
select is((select count(*) from football.seasons), 1::bigint, 'anon lee Football publicado');
select is((select count(*) from tennis.seasons), 1::bigint, 'anon lee Tennis publicado');
select throws_ok($$insert into racing.seasons(name, slug, start_date, end_date) values ('No', 'anon-racing', '2036-01-01', '2036-12-31')$$, '42501', null, 'anon no escribe Racing');
select throws_ok($$insert into football.seasons(name, slug, start_date, end_date) values ('No', 'anon-football', '2036-01-01', '2036-12-31')$$, '42501', null, 'anon no escribe Football');
select throws_ok($$insert into tennis.seasons(name, slug, start_date, end_date) values ('No', 'anon-tennis', '2036-01-01', '2036-12-31')$$, '42501', null, 'anon no escribe Tennis');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000004', true);
select is(racing.current_user_is_admin(), false, 'usuario normal no es admin Racing');
select is(football.current_user_is_admin(), false, 'usuario normal no es admin Football');
select is(tennis.current_user_is_admin(), false, 'usuario normal no es admin Tennis');
select throws_ok($$insert into racing.seasons(name, slug, start_date, end_date) values ('No', 'normal-racing', '2036-01-01', '2036-12-31')$$, '42501', null, 'usuario normal no escribe Racing');
select throws_ok($$insert into football.seasons(name, slug, start_date, end_date) values ('No', 'normal-football', '2036-01-01', '2036-12-31')$$, '42501', null, 'usuario normal no escribe Football');
select throws_ok($$insert into tennis.seasons(name, slug, start_date, end_date) values ('No', 'normal-tennis', '2036-01-01', '2036-12-31')$$, '42501', null, 'usuario normal no escribe Tennis');

select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);
select is(racing.current_user_is_admin(), true, 'admin Racing reconocido en Racing');
select is(football.current_user_is_admin(), false, 'admin Racing no es admin Football');
select is(tennis.current_user_is_admin(), false, 'admin Racing no es admin Tennis');
select lives_ok($$insert into racing.seasons(name, slug, start_date, end_date) values ('Racing draft', 'racing-draft', '2036-01-01', '2036-12-31')$$, 'admin Racing escribe Racing');
select throws_ok($$insert into football.seasons(name, slug, start_date, end_date) values ('No', 'racing-in-football', '2036-01-01', '2036-12-31')$$, '42501', null, 'admin Racing no escribe Football');
select throws_ok($$insert into tennis.seasons(name, slug, start_date, end_date) values ('No', 'racing-in-tennis', '2036-01-01', '2036-12-31')$$, '42501', null, 'admin Racing no escribe Tennis');

select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000002', true);
select is(racing.current_user_is_admin(), false, 'admin Football no es admin Racing');
select is(football.current_user_is_admin(), true, 'admin Football reconocido en Football');
select is(tennis.current_user_is_admin(), false, 'admin Football no es admin Tennis');
select throws_ok($$insert into racing.seasons(name, slug, start_date, end_date) values ('No', 'football-in-racing', '2037-01-01', '2037-12-31')$$, '42501', null, 'admin Football no escribe Racing');
select lives_ok($$insert into football.seasons(name, slug, start_date, end_date) values ('Football draft', 'football-draft', '2037-01-01', '2037-12-31')$$, 'admin Football escribe Football');
select throws_ok($$insert into tennis.seasons(name, slug, start_date, end_date) values ('No', 'football-in-tennis', '2037-01-01', '2037-12-31')$$, '42501', null, 'admin Football no escribe Tennis');

select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000003', true);
select is(racing.current_user_is_admin(), false, 'admin Tennis no es admin Racing');
select is(football.current_user_is_admin(), false, 'admin Tennis no es admin Football');
select is(tennis.current_user_is_admin(), true, 'admin Tennis reconocido en Tennis');
select throws_ok($$insert into racing.seasons(name, slug, start_date, end_date) values ('No', 'tennis-in-racing', '2038-01-01', '2038-12-31')$$, '42501', null, 'admin Tennis no escribe Racing');
select throws_ok($$insert into football.seasons(name, slug, start_date, end_date) values ('No', 'tennis-in-football', '2038-01-01', '2038-12-31')$$, '42501', null, 'admin Tennis no escribe Football');
select lives_ok($$insert into tennis.seasons(name, slug, start_date, end_date) values ('Tennis draft', 'tennis-draft', '2038-01-01', '2038-12-31')$$, 'admin Tennis escribe Tennis');

select * from finish();
reset role;
rollback;
