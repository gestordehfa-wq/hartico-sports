begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

select lives_ok($$insert into public.seasons (name, slug, status, start_date, end_date) values ('Test', 'test', 'draft', '2027-01-01', '2027-12-31')$$, 'acepta una temporada válida');
select throws_ok($$insert into public.seasons (name, slug, status, start_date, end_date) values ('Bad', 'bad', 'draft', '2027-12-31', '2027-01-01')$$, '23514', null, 'rechaza fechas de temporada invertidas');
select throws_ok($$insert into public.seasons (name, slug, status, start_date, end_date) values ('Active 2', 'active-2', 'active', '2028-01-01', '2028-12-31')$$, '23505', null, 'impide una segunda temporada activa');

select throws_ok($$insert into public.circuits (name, slug, country, country_code, default_laps) values ('Too short', 'too-short', 'Testland', 'TT', 3)$$, '23514', null, 'rechaza menos de cuatro vueltas');
select throws_ok($$insert into public.circuits (name, slug, country, country_code, default_laps) values ('Too long', 'too-long', 'Testland', 'TT', 9)$$, '23514', null, 'rechaza más de ocho vueltas');

select throws_ok($$insert into public.grand_prix_events (season_id, circuit_id, name, slug, round_number, scheduled_date) values ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Round duplicate', 'round-duplicate', 1, '2027-01-01')$$, '23505', null, 'la ronda es única por temporada');
select throws_ok($$insert into public.grand_prix_events (season_id, circuit_id, name, slug, round_number, scheduled_date) values ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Round zero', 'round-zero', 0, '2027-01-01')$$, '23514', null, 'la ronda debe ser positiva');
select throws_ok($$insert into public.grand_prix_events (season_id, circuit_id, name, slug, round_number, scheduled_date, race_laps) values ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Bad laps', 'bad-laps', 99, '2027-01-01', 12)$$, '23514', null, 'el override de vueltas respeta 4 a 8');

select is((select effective_race_laps from public.grand_prix_calendar where slug = 'gp-hartico'), 6::smallint, 'el Gran Premio hereda vueltas del circuito');
select throws_ok($$insert into public.season_driver_entries (season_id, driver_id, team_id, start_date, end_date) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '2027-01-01', '2027-03-01')$$, '23P01', null, 'rechaza participaciones solapadas');
select throws_ok($$insert into public.season_driver_entries (season_id, driver_id, team_id, start_date, end_date) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '2027-03-01', '2027-01-01')$$, '23514', null, 'rechaza fechas de participación invertidas');

select * from finish();
rollback;
