begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local', '', now(), '{}', '{}', now(), now()),
  ('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user@test.local', '', now(), '{}', '{}', now(), now());
insert into public.role_memberships (user_id, role) values ('a0000000-0000-4000-8000-000000000001', 'admin');
insert into public.seasons (id, name, slug, status, start_date, end_date) values ('11000000-0000-4000-8000-000000000001', 'Draft test', 'draft-test', 'draft', '2028-01-01', '2028-12-31');

set local role anon;
select is((select count(*) from public.seasons where id = '11000000-0000-4000-8000-000000000001'), 0::bigint, 'anon no lee borradores');
select is((select count(*) from public.seasons where status = 'active'), 1::bigint, 'anon lee temporada activa');
select throws_ok($$insert into public.drivers (display_name, nationality, country_code) values ('Anon write', 'Test', 'TT')$$, '42501', null, 'anon no puede escribir');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(public.current_user_is_admin(), false, 'usuario normal no es admin');
select throws_ok($$insert into public.drivers (display_name, nationality, country_code) values ('User write', 'Test', 'TT')$$, '42501', null, 'usuario normal no puede escribir');

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
select is(public.current_user_is_admin(), true, 'membresía admin se reconoce');
select lives_ok($$insert into public.drivers (id, display_name, nationality, country_code) values ('31000000-0000-4000-8000-000000000001', 'Admin write', 'Test', 'TT')$$, 'admin puede escribir');
select is((select count(*) from public.audit_events where entity = 'drivers' and entity_id = '31000000-0000-4000-8000-000000000001'), 1::bigint, 'la escritura admin genera auditoría');

select * from finish();
rollback;
