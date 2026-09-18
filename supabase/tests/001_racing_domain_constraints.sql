-- Generated from apps/racing/supabase/tests/001_domain_constraints.sql by tooling/assemble-supabase.mjs. Do not edit this copy.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- Fixtures transaccionales: el test no depende de seed.sql y puede ejecutarse
-- sobre un proyecto Cloud recién migrado sin dejar datos ficticios.
insert into racing.seasons (id, name, slug, status, start_date, end_date)
values ('10000000-0000-4000-8000-000000000001', 'Active fixture', 'active-fixture', 'active', '2027-01-01', '2027-12-31');
insert into racing.teams (id, name, short_name, code, country, country_code) values
  ('20000000-0000-4000-8000-000000000001', 'Fixture Team One', 'One', 'FT1', 'Testland', 'TT'),
  ('20000000-0000-4000-8000-000000000002', 'Fixture Team Two', 'Two', 'FT2', 'Testland', 'TT');
insert into racing.drivers (id, display_name, nationality, country_code) values
  ('30000000-0000-4000-8000-000000000001', 'Fixture Driver One', 'Testland', 'TT'),
  ('30000000-0000-4000-8000-000000000002', 'Fixture Driver Two', 'Testland', 'TT'),
  ('30000000-0000-4000-8000-000000000003', 'Fixture Driver Three', 'Testland', 'TT');
insert into racing.circuits (id, name, slug, country, country_code, default_laps)
values ('40000000-0000-4000-8000-000000000001', 'Fixture Circuit', 'fixture-circuit', 'Testland', 'TT', 6);
insert into racing.grand_prix_events (season_id, circuit_id, name, slug, round_number, scheduled_date)
values ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Fixture Grand Prix', 'gp-hartico', 1, '2027-02-01');
insert into racing.season_driver_entries (season_id, driver_id, team_id, start_date, end_date)
values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '2027-02-01', '2027-02-28');

select lives_ok($$insert into racing.seasons (id, name, slug, status, start_date, end_date) values ('12000000-0000-4000-8000-000000000001', 'Test', 'test', 'draft', '2027-01-01', '2027-12-31')$$, 'acepta una temporada válida');
select throws_ok($$insert into racing.seasons (name, slug, status, start_date, end_date) values ('Bad status', 'bad-status', 'published', '2027-01-01', '2027-12-31')$$, '23514', null, 'rechaza estados de temporada fuera del vocabulario');
select throws_ok($$insert into racing.seasons (name, slug, status, start_date, end_date) values ('Bad', 'bad', 'draft', '2027-12-31', '2027-01-01')$$, '23514', null, 'rechaza fechas de temporada invertidas');
select throws_ok($$insert into racing.seasons (name, slug, status, start_date, end_date) values ('Active 2', 'active-2', 'active', '2028-01-01', '2028-12-31')$$, '23505', null, 'impide una segunda temporada activa');

select throws_ok($$insert into racing.circuits (name, slug, country, country_code, default_laps) values ('Too short', 'too-short', 'Testland', 'TT', 3)$$, '23514', null, 'rechaza menos de cuatro vueltas');
select throws_ok($$insert into racing.circuits (name, slug, country, country_code, default_laps) values ('Too long', 'too-long', 'Testland', 'TT', 9)$$, '23514', null, 'rechaza más de ocho vueltas');

select throws_ok($$insert into racing.grand_prix_events (season_id, circuit_id, name, slug, round_number, scheduled_date) values ('ffffffff-ffff-4fff-8fff-ffffffffffff', '40000000-0000-4000-8000-000000000001', 'Unknown season', 'unknown-season', 90, '2027-01-01')$$, '23503', null, 'un Gran Premio requiere una temporada existente');
select throws_ok($$insert into racing.grand_prix_events (season_id, circuit_id, name, slug, round_number, scheduled_date) values ('10000000-0000-4000-8000-000000000001', 'ffffffff-ffff-4fff-8fff-ffffffffffff', 'Unknown circuit', 'unknown-circuit', 91, '2027-01-01')$$, '23503', null, 'un Gran Premio requiere un circuito existente');
select throws_ok($$insert into racing.grand_prix_events (season_id, circuit_id, name, slug, round_number, scheduled_date) values ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Round duplicate', 'round-duplicate', 1, '2027-01-01')$$, '23505', null, 'la ronda es única por temporada');
select throws_ok($$insert into racing.grand_prix_events (season_id, circuit_id, name, slug, round_number, scheduled_date) values ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Round zero', 'round-zero', 0, '2027-01-01')$$, '23514', null, 'la ronda debe ser positiva');
select throws_ok($$insert into racing.grand_prix_events (season_id, circuit_id, name, slug, round_number, scheduled_date, race_laps) values ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Too few laps', 'too-few-laps', 92, '2027-01-01', 3)$$, '23514', null, 'el override rechaza menos de cuatro vueltas');
select throws_ok($$insert into racing.grand_prix_events (season_id, circuit_id, name, slug, round_number, scheduled_date, race_laps) values ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Too many laps', 'too-many-laps', 93, '2027-01-01', 9)$$, '23514', null, 'el override rechaza más de ocho vueltas');

select is((select effective_race_laps from racing.grand_prix_calendar where slug = 'gp-hartico'), 6::smallint, 'el Gran Premio hereda vueltas del circuito');
select lives_ok($$insert into racing.grand_prix_events (season_id, circuit_id, name, slug, round_number, scheduled_date, race_laps) values ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Override valid', 'override-valid', 94, '2027-01-02', 8)$$, 'acepta un override de vueltas válido');
select is((select effective_race_laps from racing.grand_prix_calendar where slug = 'override-valid'), 8::smallint, 'el calendario aplica el override de vueltas');

select throws_ok($$insert into racing.season_driver_entries (season_id, driver_id, team_id) values ('ffffffff-ffff-4fff-8fff-ffffffffffff', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001')$$, '23503', null, 'una participación requiere una temporada existente');
select throws_ok($$insert into racing.season_driver_entries (season_id, driver_id, team_id) values ('12000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'ffffffff-ffff-4fff-8fff-ffffffffffff')$$, '23503', null, 'una participación requiere una escudería existente');
select lives_ok($$insert into racing.season_driver_entries (season_id, driver_id, team_id, start_date, end_date) values ('12000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '2027-01-01', '2027-01-31'), ('12000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '2027-02-01', '2027-02-28')$$, 'permite cambios de escudería con períodos no solapados');
select throws_ok($$insert into racing.season_driver_entries (season_id, driver_id, team_id, start_date, end_date) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '2027-01-01', '2027-03-01')$$, '23P01', null, 'rechaza participaciones solapadas');
select throws_ok($$insert into racing.season_driver_entries (season_id, driver_id, team_id, start_date, end_date) values ('12000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '2027-03-01', '2027-01-01')$$, '23514', null, 'rechaza fechas de participación invertidas');

select * from finish();
rollback;
