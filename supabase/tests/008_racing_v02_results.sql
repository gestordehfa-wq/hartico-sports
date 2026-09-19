-- Generated from apps/racing/supabase/tests/003_qualifying_race_results.sql by tooling/assemble-supabase.mjs. Do not edit this copy.
begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

-- Fixtures transaccionales; se revierten con el rollback final.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'v02-admin@test.local', '', now(), '{}', '{}', now(), now()),
  ('a0000000-0000-4000-8000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'v02-user@test.local', '', now(), '{}', '{}', now(), now());
insert into racing.role_memberships (user_id, role) values ('a0000000-0000-4000-8000-0000000000a1', 'admin');
update racing.seasons set status = 'draft' where status = 'active';
insert into racing.seasons (id, name, slug, status, start_date, end_date)
values ('10000000-0000-4000-8000-0000000000b1', 'v0.2 fixture', 'v02-fixture', 'active', '2040-01-01', '2040-12-31');
insert into racing.teams (id, name, short_name, code, country, country_code) values
  ('20000000-0000-4000-8000-0000000000b1', 'V02 Team One', 'One', 'V21', 'Testland', 'TT'),
  ('20000000-0000-4000-8000-0000000000b2', 'V02 Team Two', 'Two', 'V22', 'Testland', 'TT');
insert into racing.drivers (id, display_name, nationality, country_code) values
  ('30000000-0000-4000-8000-0000000000b1', 'V02 Driver One', 'Testland', 'TT'),
  ('30000000-0000-4000-8000-0000000000b2', 'V02 Driver Two', 'Testland', 'TT'),
  ('30000000-0000-4000-8000-0000000000b3', 'V02 Driver Three', 'Testland', 'TT');
insert into racing.season_driver_entries (season_id, driver_id, team_id) values
  ('10000000-0000-4000-8000-0000000000b1', '30000000-0000-4000-8000-0000000000b1', '20000000-0000-4000-8000-0000000000b1'),
  ('10000000-0000-4000-8000-0000000000b1', '30000000-0000-4000-8000-0000000000b2', '20000000-0000-4000-8000-0000000000b1'),
  ('10000000-0000-4000-8000-0000000000b1', '30000000-0000-4000-8000-0000000000b3', '20000000-0000-4000-8000-0000000000b2');
insert into racing.circuits (id, name, slug, country, country_code, default_laps)
values ('40000000-0000-4000-8000-0000000000b1', 'V02 Circuit', 'v02-circuit', 'Testland', 'TT', 6);
insert into racing.grand_prix_events (id, season_id, circuit_id, name, slug, round_number, scheduled_date) values
  ('60000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-0000000000b1', '40000000-0000-4000-8000-0000000000b1', 'V02 GP One', 'v02-gp-one', 1, '2040-03-01'),
  ('60000000-0000-4000-8000-0000000000b2', '10000000-0000-4000-8000-0000000000b1', '40000000-0000-4000-8000-0000000000b1', 'V02 GP Two', 'v02-gp-two', 2, '2040-04-01');
-- Resultado en borrador de un segundo Gran Premio: nunca debe ser público.
insert into racing.race_results (grand_prix_id, driver_id, team_id, status, final_position, laps_completed, pit_stop_completed, pit_stop_lap) values
  ('60000000-0000-4000-8000-0000000000b2', '30000000-0000-4000-8000-0000000000b1', '20000000-0000-4000-8000-0000000000b1', 'finished', 1, 6, true, 3);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-0000000000a1', true);

-- Clasificación: dos intentos, mejor tiempo válido calculado.
select lives_ok($$insert into racing.qualifying_results (grand_prix_id, driver_id, team_id, attempt_1_status, attempt_1_ms, attempt_2_status, attempt_2_ms) values ('60000000-0000-4000-8000-0000000000b1', '30000000-0000-4000-8000-0000000000b1', '20000000-0000-4000-8000-0000000000b1', 'valid', 83000, 'valid', 82500)$$, 'admin registra dos intentos válidos');
select is((select best_time_ms from racing.qualifying_results where driver_id = '30000000-0000-4000-8000-0000000000b1'), 82500, 'el mejor tiempo es el menor intento válido');
select lives_ok($$insert into racing.qualifying_results (grand_prix_id, driver_id, team_id, attempt_1_status, attempt_1_ms, attempt_2_status, attempt_2_ms) values ('60000000-0000-4000-8000-0000000000b1', '30000000-0000-4000-8000-0000000000b2', '20000000-0000-4000-8000-0000000000b1', 'valid', 84000, 'invalid', 80000)$$, 'admin registra un intento inválido con tiempo de referencia');
select is((select best_time_ms from racing.qualifying_results where driver_id = '30000000-0000-4000-8000-0000000000b2'), 84000, 'un intento inválido nunca cuenta como mejor tiempo');
select lives_ok($$insert into racing.qualifying_results (grand_prix_id, driver_id, team_id) values ('60000000-0000-4000-8000-0000000000b1', '30000000-0000-4000-8000-0000000000b3', '20000000-0000-4000-8000-0000000000b2')$$, 'ambos intentos pueden quedar no registrados');
select is((select best_time_ms from racing.qualifying_results where driver_id = '30000000-0000-4000-8000-0000000000b3'), null::integer, 'sin intentos válidos no hay mejor tiempo');
select throws_ok($$insert into racing.qualifying_results (grand_prix_id, driver_id, team_id, attempt_1_status) values ('60000000-0000-4000-8000-0000000000b2', '30000000-0000-4000-8000-0000000000b3', '20000000-0000-4000-8000-0000000000b2', 'valid')$$, '23514', null, 'un intento válido exige tiempo');
select throws_ok($$insert into racing.qualifying_results (grand_prix_id, driver_id, team_id, attempt_1_status, attempt_1_ms) values ('60000000-0000-4000-8000-0000000000b2', '30000000-0000-4000-8000-0000000000b3', '20000000-0000-4000-8000-0000000000b2', 'not_recorded', 80000)$$, '23514', null, 'un intento no registrado no puede tener tiempo');
select throws_ok($$insert into racing.qualifying_results (grand_prix_id, driver_id, team_id) values ('60000000-0000-4000-8000-0000000000b2', '30000000-0000-4000-8000-0000000000b1', '20000000-0000-4000-8000-0000000000b2')$$, '23514', null, 'la escudería debe coincidir con la participación del piloto');

-- Carrera: reglas de estado, vueltas y pits.
select throws_ok($$insert into racing.race_results (grand_prix_id, driver_id, team_id, status, laps_completed) values ('60000000-0000-4000-8000-0000000000b1', '30000000-0000-4000-8000-0000000000b3', '20000000-0000-4000-8000-0000000000b2', 'dns', 2)$$, '23514', null, 'un DNS no completa vueltas');
select throws_ok($$insert into racing.race_results (grand_prix_id, driver_id, team_id, status, final_position, laps_completed, pit_stop_completed) values ('60000000-0000-4000-8000-0000000000b1', '30000000-0000-4000-8000-0000000000b3', '20000000-0000-4000-8000-0000000000b2', 'finished', 1, 6, true)$$, '23514', null, 'la parada cumplida exige vuelta de parada');
select throws_ok($$insert into racing.race_results (grand_prix_id, driver_id, team_id, status, laps_completed) values ('60000000-0000-4000-8000-0000000000b1', '30000000-0000-4000-8000-0000000000b3', '20000000-0000-4000-8000-0000000000b2', 'dnf', 7)$$, '23514', null, 'las vueltas no pueden superar las del circuito');
select throws_ok($$insert into racing.race_results (grand_prix_id, driver_id, team_id, status, final_position, laps_completed) values ('60000000-0000-4000-8000-0000000000b1', '30000000-0000-4000-8000-0000000000b3', '20000000-0000-4000-8000-0000000000b2', 'dnf', 1, 2)$$, '23514', null, 'solo finished tiene posición final');
select lives_ok($$insert into racing.race_results (grand_prix_id, driver_id, team_id, grid_position, status, final_position, laps_completed, total_time_ms, pit_stop_completed, pit_stop_lap) values
  ('60000000-0000-4000-8000-0000000000b1', '30000000-0000-4000-8000-0000000000b1', '20000000-0000-4000-8000-0000000000b1', 1, 'finished', 1, 6, 500000, true, 3),
  ('60000000-0000-4000-8000-0000000000b1', '30000000-0000-4000-8000-0000000000b2', '20000000-0000-4000-8000-0000000000b1', 2, 'finished', 2, 6, 510000, false, null),
  ('60000000-0000-4000-8000-0000000000b1', '30000000-0000-4000-8000-0000000000b3', '20000000-0000-4000-8000-0000000000b2', 3, 'dnf', null, 2, null, false, null)$$, 'admin registra la carrera en borrador');
select throws_ok($$select racing.confirm_grand_prix_results('60000000-0000-4000-8000-0000000000b1')$$, '23514', null, 'no se confirma con un finalista sin pit ni resolución administrativa');
select lives_ok($$update racing.race_results set pit_resolution_note = 'Resolución administrativa registrada según reglamento' where driver_id = '30000000-0000-4000-8000-0000000000b2' and grand_prix_id = '60000000-0000-4000-8000-0000000000b1'$$, 'admin registra la resolución del incumplimiento');
select lives_ok($$insert into racing.points_scale (season_id, race_position, points) values ('10000000-0000-4000-8000-0000000000b1', 1, 25), ('10000000-0000-4000-8000-0000000000b1', 2, 18)$$, 'admin configura puntos por posición');
select lives_ok($$select racing.confirm_grand_prix_results('60000000-0000-4000-8000-0000000000b1')$$, 'admin confirma resultados');
select is((select points from racing.race_results where driver_id = '30000000-0000-4000-8000-0000000000b1' and grand_prix_id = '60000000-0000-4000-8000-0000000000b1'), 25.00::numeric, 'la confirmación congela los puntos del ganador');
select is((select points from racing.race_results where driver_id = '30000000-0000-4000-8000-0000000000b3' and grand_prix_id = '60000000-0000-4000-8000-0000000000b1'), 0.00::numeric, 'un DNF confirma con cero puntos');
select is((select status from racing.grand_prix_events where id = '60000000-0000-4000-8000-0000000000b1'), 'completed', 'el Gran Premio queda completado');

-- Inmutabilidad tras confirmar.
select throws_ok($$update racing.race_results set final_position = 2 where driver_id = '30000000-0000-4000-8000-0000000000b1' and grand_prix_id = '60000000-0000-4000-8000-0000000000b1'$$, '55006', null, 'el admin no edita resultados confirmados');
select throws_ok($$delete from racing.race_results where grand_prix_id = '60000000-0000-4000-8000-0000000000b1'$$, '55006', null, 'el admin no elimina resultados confirmados');
select throws_ok($$update racing.qualifying_results set attempt_1_ms = 70000 where grand_prix_id = '60000000-0000-4000-8000-0000000000b1'$$, '55006', null, 'la clasificación también queda congelada');
select throws_ok($$select racing.confirm_grand_prix_results('60000000-0000-4000-8000-0000000000b1')$$, '55006', null, 'no se confirma dos veces');
select is((select count(*) from racing.result_history where grand_prix_id = '60000000-0000-4000-8000-0000000000b1' and action = 'confirmed'), 1::bigint, 'la confirmación queda en el historial');
select throws_ok($$update racing.result_history set reason = 'tampered'$$, '42501', null, 'el historial no admite escritura de clientes');
select throws_ok($$insert into racing.grand_prix_result_confirmations (grand_prix_id) values ('60000000-0000-4000-8000-0000000000b2')$$, '42501', null, 'las confirmaciones no se escriben directamente');
select throws_ok($$select racing.reopen_grand_prix_results('60000000-0000-4000-8000-0000000000b1', 'corto')$$, '23514', null, 'la reapertura exige razón administrativa');

reset role;
set local role anon;
select is((select count(*) from racing.race_results), 3::bigint, 'anon solo ve resultados confirmados');
select is((select count(*) from racing.qualifying_results), 3::bigint, 'anon lee la clasificación publicada');
select throws_ok($$insert into racing.race_results (grand_prix_id, driver_id, team_id, status) values ('60000000-0000-4000-8000-0000000000b2', '30000000-0000-4000-8000-0000000000b3', '20000000-0000-4000-8000-0000000000b2', 'dns')$$, '42501', null, 'anon no escribe resultados');
select throws_ok($$select racing.confirm_grand_prix_results('60000000-0000-4000-8000-0000000000b2')$$, '42501', null, 'anon no confirma resultados');
select throws_ok($$select count(*) from racing.result_history$$, '42501', null, 'anon no lee el historial');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-0000000000a2', true);
select throws_ok($$select racing.confirm_grand_prix_results('60000000-0000-4000-8000-0000000000b2')$$, '42501', null, 'un usuario normal no confirma resultados');
select throws_ok($$insert into racing.points_scale (season_id, race_position, points) values ('10000000-0000-4000-8000-0000000000b1', 3, 15)$$, '42501', null, 'un usuario normal no configura puntos');

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-0000000000a1', true);
select lives_ok($$select racing.reopen_grand_prix_results('60000000-0000-4000-8000-0000000000b1', 'Corrección administrativa aprobada por la asociación')$$, 'admin reabre con resolución escrita');
select is((select count(*) from racing.result_history where grand_prix_id = '60000000-0000-4000-8000-0000000000b1'), 2::bigint, 'la reapertura queda en el historial');
select is((select count(*) from racing.race_results where grand_prix_id = '60000000-0000-4000-8000-0000000000b1' and points is null), 3::bigint, 'reabrir limpia los puntos congelados');
select lives_ok($$update racing.race_results set laps_completed = 3 where driver_id = '30000000-0000-4000-8000-0000000000b3' and grand_prix_id = '60000000-0000-4000-8000-0000000000b1'$$, 'tras reabrir el admin puede corregir');

select * from finish();
reset role;
rollback;
