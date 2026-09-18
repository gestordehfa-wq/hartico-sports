-- Datos exclusivamente ficticios para desarrollo local.
insert into racing.seasons (id, name, slug, year, status, start_date, end_date) values
  ('10000000-0000-4000-8000-000000000001', 'Season 1', 'season-1', 2027, 'active', '2026-10-01', '2027-03-31');

insert into racing.teams (id, name, short_name, code, country, country_code, primary_color, secondary_color) values
  ('20000000-0000-4000-8000-000000000001', 'Apex Racing', 'Apex', 'APX', 'Montelago', 'ML', '#265DAB', '#E7EDF5'),
  ('20000000-0000-4000-8000-000000000002', 'Velocity Motorsport', 'Velocity', 'VEL', 'Norland', 'NL', '#A33C32', '#F1D75A'),
  ('20000000-0000-4000-8000-000000000003', 'Orion GP', 'Orion', 'ORG', 'Costaverde', 'CV', '#315B48', '#D7E2DD');

insert into racing.drivers (id, display_name, nationality, country_code, racing_number, status) values
  ('30000000-0000-4000-8000-000000000001', 'Mara Véliz', 'Montelaguense', 'ML', 7, 'active'),
  ('30000000-0000-4000-8000-000000000002', 'Ivo Serra', 'Norlandés', 'NL', 18, 'active'),
  ('30000000-0000-4000-8000-000000000003', 'Nora Kade', 'Costaverdina', 'CV', 24, 'active'),
  ('30000000-0000-4000-8000-000000000004', 'Teo Arden', 'Montelaguense', 'ML', 41, 'active'),
  ('30000000-0000-4000-8000-000000000005', 'Lena Volta', 'Norlandesa', 'NL', 55, 'active'),
  ('30000000-0000-4000-8000-000000000006', 'Gael Faro', 'Costaverdino', 'CV', 63, 'active');

insert into racing.season_driver_entries (season_id, driver_id, team_id, racing_number, role, status) values
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 7, 'primary', 'active'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 18, 'primary', 'active'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 24, 'primary', 'active'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 41, 'primary', 'active'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003', 55, 'primary', 'active'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', 63, 'primary', 'active');

insert into racing.circuits (id, name, slug, short_name, country, country_code, city, length_km, default_laps) values
  ('40000000-0000-4000-8000-000000000001', 'Circuito Central', 'circuito-central', 'Central', 'Montelago', 'ML', 'Puerto Hartico', 4.210, 6),
  ('40000000-0000-4000-8000-000000000002', 'Autódromo del Norte', 'autodromo-del-norte', 'Norte', 'Norland', 'NL', 'Arden', 5.105, 4),
  ('40000000-0000-4000-8000-000000000003', 'Parque Costaverde', 'parque-costaverde', 'Costaverde', 'Costaverde', 'CV', 'Bahía Clara', 3.840, 8),
  ('40000000-0000-4000-8000-000000000004', 'Anillo Volta', 'anillo-volta', 'Volta', 'Montelago', 'ML', 'Sierra Alta', 4.680, 5);

insert into racing.grand_prix_events (season_id, circuit_id, name, slug, round_number, scheduled_date, status) values
  ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Gran Premio de Hartico', 'gp-hartico', 1, '2026-10-18', 'scheduled'),
  ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'Gran Premio del Norte', 'gp-norte', 2, '2026-11-08', 'scheduled'),
  ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'Gran Premio Costaverde', 'gp-costaverde', 3, '2027-01-17', 'scheduled'),
  ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'Gran Premio de Sierra Alta', 'gp-sierra-alta', 4, '2027-03-07', 'scheduled');
