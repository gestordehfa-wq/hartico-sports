begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into public.seasons(id, name, slug, status, start_date, end_date) values
('10000000-0000-4000-8000-000000000001', 'T1', 't1', 'active', '2030-01-01', '2030-12-31');
select throws_ok($$insert into public.seasons(name, slug, status, start_date, end_date) values ('T2', 't2', 'active', '2031-01-01', '2031-12-31')$$, '23505', null, 'solo una temporada activa');
select throws_ok($$insert into public.seasons(name, slug, start_date, end_date) values ('Mal', 'mal', '2030-12-31', '2030-01-01')$$, '23514', null, 'rango de temporada válido');

insert into public.players(id, display_name, nationality, country_code) values
('20000000-0000-4000-8000-000000000001', 'Uno', 'Chile', 'CL'),
('20000000-0000-4000-8000-000000000002', 'Dos', 'Chile', 'CL');
select throws_ok($$insert into public.players(display_name, nationality, country_code, handedness) values ('Mal', 'Chile', 'CL', 'both')$$, '23514', null, 'mano limitada');

insert into public.tournaments(id, name, short_name, default_surface, category) values
('30000000-0000-4000-8000-000000000001', 'Open', 'OP', 'clay', 'major');
select throws_ok($$insert into public.tournaments(name, short_name, default_surface, category) values ('Mal Open', 'MO', 'carpet', 'major')$$, '23514', null, 'superficie limitada');
select throws_ok($$insert into public.tournaments(name, short_name, default_surface, category) values ('Otro', 'O', 'hard', 'atp500')$$, '23514', null, 'categoría propia limitada');

insert into public.tournament_editions(id, tournament_id, season_id, surface, start_date, end_date, status, draw_size, best_of) values
('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'clay', '2030-03-01', '2030-03-05', 'registration', 4, 3);
select throws_ok($$insert into public.tournament_editions(tournament_id, season_id, surface, start_date, end_date, draw_size) values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'clay', '2030-03-01', '2030-03-05', 6)$$, '23514', null, 'draw solo 4/8/16');

insert into public.tournament_entries(id, tournament_edition_id, player_id, seed) values
('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 1);
select throws_ok($$insert into public.tournament_entries(tournament_edition_id, player_id, seed) values ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 2)$$, '23505', null, 'jugador no se duplica');
select throws_ok($$insert into public.tournament_entries(tournament_edition_id, player_id, seed) values ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 1)$$, '23505', null, 'seed no se duplica');
select throws_ok($$insert into public.tournament_entries(tournament_edition_id, player_id, seed) values ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 0)$$, '23514', null, 'seed positivo');
select throws_ok($$insert into public.tournament_entries(tournament_edition_id, player_id, seed) values ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 5)$$, 'P0001', 'seed outside draw size', 'seed dentro del cuadro');
insert into public.tournament_entries(tournament_edition_id, player_id, seed) values
('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 2);

insert into public.matches(id, tournament_edition_id, round, round_order, match_number, player1_id, player2_id, best_of) values
('60000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'semifinal', 1, 1, '20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 3);
select throws_ok($$insert into public.matches(tournament_edition_id, round, round_order, match_number, player1_id, player2_id) values ('40000000-0000-4000-8000-000000000001', 'semifinal', 1, 2, '20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001')$$, '23514', null, 'jugadores distintos');
select throws_ok($$update public.matches set winner_id = '20000000-0000-4000-8000-000000000001' where id = '60000000-0000-4000-8000-000000000001'$$, '23514', null, 'ganador exige estado final');
select throws_ok($$update public.matches set status = 'finished', winner_id = gen_random_uuid() where id = '60000000-0000-4000-8000-000000000001'$$, '23503', null, 'ganador debe existir');

insert into public.match_sets(match_id, set_number, player1_score, player2_score) values ('60000000-0000-4000-8000-000000000001', 1, 6, 4);
select throws_ok($$insert into public.match_sets(match_id, set_number, player1_score, player2_score) values ('60000000-0000-4000-8000-000000000001', 1, 6, 3)$$, '23505', null, 'set único por número');
select throws_ok($$insert into public.match_sets(match_id, set_number, player1_score, player2_score) values ('60000000-0000-4000-8000-000000000001', 2, 6, 6)$$, '23514', null, 'set no termina empatado');
select throws_ok($$insert into public.match_sets(match_id, set_number, player1_score, player2_score) values ('60000000-0000-4000-8000-000000000001', 2, -1, 6)$$, '23514', null, 'score no negativo');
select throws_ok($$insert into public.match_sets(match_id, set_number, player1_score, player2_score) values ('60000000-0000-4000-8000-000000000001', 4, 6, 2)$$, 'P0001', 'set exceeds match format', 'set respeta best_of');

select is((select points from public.tournament_point_rules where category = 'major' and round = 'final'), 1000, 'defaults de ranking disponibles');
select is((select count(*) from public.tournament_point_rules), 20::bigint, 'cinco categorías con cuatro logros');
select ok((select relrowsecurity from pg_class where oid = 'public.matches'::regclass), 'RLS activa en matches');
select ok((select relrowsecurity from pg_class where oid = 'public.awards'::regclass), 'RLS activa en awards');

select * from finish();
rollback;
