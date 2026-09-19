-- Generated from apps/racing/supabase/migrations/008_qualifying_race_results.sql by tooling/assemble-supabase.mjs. Do not edit this copy.
-- Racing v0.2: clasificación (dos intentos), resultados de carrera con parada
-- obligatoria a pits, escala de puntos configurable y confirmación inmutable.
-- Migración incremental: no modifica objetos de v0.1.

create table racing.points_scale (
  id uuid primary key default extensions.gen_random_uuid(),
  season_id uuid not null references racing.seasons(id) on delete restrict,
  race_position smallint not null check (race_position between 1 and 50),
  points numeric(6,2) not null check (points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, race_position)
);
alter table racing.points_scale enable row level security;
create trigger points_scale_updated_at before update on racing.points_scale for each row execute function racing.set_updated_at();

-- Cada piloto dispone exactamente de dos intentos. Un intento válido exige
-- tiempo en milisegundos; uno no registrado no puede tenerlo; uno inválido
-- puede conservar el tiempo como referencia pero nunca cuenta como mejor tiempo.
create table racing.qualifying_results (
  id uuid primary key default extensions.gen_random_uuid(),
  grand_prix_id uuid not null references racing.grand_prix_events(id) on delete restrict,
  driver_id uuid not null references racing.drivers(id) on delete restrict,
  team_id uuid not null references racing.teams(id) on delete restrict,
  attempt_1_status text not null default 'not_recorded' check (attempt_1_status in ('valid', 'invalid', 'not_recorded')),
  attempt_1_ms integer check (attempt_1_ms is null or attempt_1_ms between 1 and 3600000),
  attempt_2_status text not null default 'not_recorded' check (attempt_2_status in ('valid', 'invalid', 'not_recorded')),
  attempt_2_ms integer check (attempt_2_ms is null or attempt_2_ms between 1 and 3600000),
  best_time_ms integer generated always as (
    case
      when attempt_1_status = 'valid' and attempt_2_status = 'valid' then least(attempt_1_ms, attempt_2_ms)
      when attempt_1_status = 'valid' then attempt_1_ms
      when attempt_2_status = 'valid' then attempt_2_ms
      else null
    end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grand_prix_id, driver_id),
  constraint qualifying_attempt_1_consistent check (
    (attempt_1_status = 'valid' and attempt_1_ms is not null)
    or (attempt_1_status = 'not_recorded' and attempt_1_ms is null)
    or attempt_1_status = 'invalid'
  ),
  constraint qualifying_attempt_2_consistent check (
    (attempt_2_status = 'valid' and attempt_2_ms is not null)
    or (attempt_2_status = 'not_recorded' and attempt_2_ms is null)
    or attempt_2_status = 'invalid'
  )
);
alter table racing.qualifying_results enable row level security;
create index qualifying_results_grid_idx on racing.qualifying_results (grand_prix_id, best_time_ms);
create trigger qualifying_results_updated_at before update on racing.qualifying_results for each row execute function racing.set_updated_at();

-- team_id conserva la escudería representada en ese Gran Premio para que una
-- transferencia posterior no reescriba resultados históricos.
create table racing.race_results (
  id uuid primary key default extensions.gen_random_uuid(),
  grand_prix_id uuid not null references racing.grand_prix_events(id) on delete restrict,
  driver_id uuid not null references racing.drivers(id) on delete restrict,
  team_id uuid not null references racing.teams(id) on delete restrict,
  grid_position smallint check (grid_position is null or grid_position between 1 and 99),
  status text not null check (status in ('finished', 'dnf', 'dns', 'dsq')),
  final_position smallint check (final_position is null or final_position between 1 and 99),
  laps_completed smallint not null default 0 check (laps_completed between 0 and 8),
  total_time_ms bigint check (total_time_ms is null or total_time_ms > 0),
  pit_stop_completed boolean not null default false,
  pit_stop_lap smallint check (pit_stop_lap is null or pit_stop_lap between 1 and 8),
  pit_resolution_note text check (pit_resolution_note is null or length(trim(pit_resolution_note)) between 1 and 500),
  points numeric(6,2) check (points is null or points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grand_prix_id, driver_id),
  constraint race_results_position_rule check ((status = 'finished') = (final_position is not null)),
  constraint race_results_time_rule check (total_time_ms is null or status = 'finished'),
  constraint race_results_finished_laps_rule check (status <> 'finished' or laps_completed >= 1),
  constraint race_results_dns_rule check (status <> 'dns' or (laps_completed = 0 and not pit_stop_completed)),
  constraint race_results_pit_lap_rule check (pit_stop_completed = (pit_stop_lap is not null))
);
alter table racing.race_results enable row level security;
create index race_results_standings_idx on racing.race_results (grand_prix_id, final_position);
create index race_results_team_idx on racing.race_results (team_id);
create trigger race_results_updated_at before update on racing.race_results for each row execute function racing.set_updated_at();

comment on column racing.race_results.pit_resolution_note is
  'Resolución administrativa según el reglamento de la asociación cuando un piloto que finaliza omite la parada obligatoria. La base de datos no inventa sanciones.';
comment on column racing.race_results.points is
  'Puntos congelados al confirmar; cambios posteriores de points_scale no reescriben resultados confirmados.';

create table racing.grand_prix_result_confirmations (
  id uuid primary key default extensions.gen_random_uuid(),
  grand_prix_id uuid not null unique references racing.grand_prix_events(id) on delete restrict,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz not null default now()
);
alter table racing.grand_prix_result_confirmations enable row level security;

create table racing.result_history (
  id bigint generated always as identity primary key,
  grand_prix_id uuid not null references racing.grand_prix_events(id) on delete restrict,
  action text not null check (action in ('confirmed', 'reopened')),
  actor_id uuid references auth.users(id) on delete set null,
  reason text,
  results_snapshot jsonb not null,
  occurred_at timestamptz not null default now()
);
alter table racing.result_history enable row level security;
create index result_history_grand_prix_idx on racing.result_history (grand_prix_id, occurred_at desc);

-- Integridad ------------------------------------------------------------------

create or replace function racing.driver_represents_team(p_grand_prix_id uuid, p_driver_id uuid, p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from racing.grand_prix_events gp
    join racing.season_driver_entries e on e.season_id = gp.season_id
    where gp.id = p_grand_prix_id and e.driver_id = p_driver_id and e.team_id = p_team_id
  );
$$;
revoke all on function racing.driver_represents_team(uuid, uuid, uuid) from public, anon, authenticated;

create or replace function racing.validate_result_row()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_laps smallint;
begin
  if not racing.driver_represents_team(new.grand_prix_id, new.driver_id, new.team_id) then
    raise exception 'El piloto no tiene participación con esa escudería en la temporada del Gran Premio' using errcode = '23514';
  end if;

  if tg_table_name = 'race_results' then
    select coalesce(gp.race_laps, c.default_laps) into v_laps
    from racing.grand_prix_events gp
    join racing.circuits c on c.id = gp.circuit_id
    where gp.id = new.grand_prix_id;
    if new.laps_completed > v_laps then
      raise exception 'Las vueltas completadas (%) superan las vueltas de carrera (%)', new.laps_completed, v_laps using errcode = '23514';
    end if;
    if new.pit_stop_lap is not null and new.pit_stop_lap > v_laps then
      raise exception 'La vuelta de parada (%) supera las vueltas de carrera (%)', new.pit_stop_lap, v_laps using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function racing.validate_result_row() from public, anon, authenticated;

create trigger qualifying_results_validate before insert or update of grand_prix_id, driver_id, team_id
  on racing.qualifying_results for each row execute function racing.validate_result_row();
create trigger race_results_validate before insert or update of grand_prix_id, driver_id, team_id, laps_completed, pit_stop_lap
  on racing.race_results for each row execute function racing.validate_result_row();

create or replace function racing.reject_confirmed_result_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op <> 'INSERT' then
    if exists (select 1 from racing.grand_prix_result_confirmations c where c.grand_prix_id = old.grand_prix_id) then
      raise exception 'Los resultados confirmados no pueden modificarse; reábrelos con una resolución administrativa' using errcode = '55006';
    end if;
  end if;
  if tg_op <> 'DELETE' then
    if exists (select 1 from racing.grand_prix_result_confirmations c where c.grand_prix_id = new.grand_prix_id) then
      raise exception 'Los resultados confirmados no pueden modificarse; reábrelos con una resolución administrativa' using errcode = '55006';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
revoke all on function racing.reject_confirmed_result_change() from public, anon, authenticated;

create trigger qualifying_results_lock before insert or update or delete on racing.qualifying_results for each row execute function racing.reject_confirmed_result_change();
create trigger race_results_lock before insert or update or delete on racing.race_results for each row execute function racing.reject_confirmed_result_change();

create or replace function racing.reject_history_change()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'El historial de resultados es append-only' using errcode = '55006';
end;
$$;
revoke all on function racing.reject_history_change() from public, anon, authenticated;
create trigger result_history_append_only before update or delete on racing.result_history for each row execute function racing.reject_history_change();

-- Confirmación y reapertura -----------------------------------------------------

create or replace function racing.confirm_grand_prix_results(p_grand_prix_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_season uuid;
  v_finished integer;
  v_max integer;
  v_distinct integer;
  v_pending_pit integer;
begin
  if not racing.is_admin() then
    raise exception 'Se requiere membresía administrativa de Racing' using errcode = '42501';
  end if;

  select gp.season_id into v_season
  from racing.grand_prix_events gp
  where gp.id = p_grand_prix_id
  for update;
  if not found then
    raise exception 'El Gran Premio no existe' using errcode = 'P0002';
  end if;
  if exists (select 1 from racing.grand_prix_result_confirmations c where c.grand_prix_id = p_grand_prix_id) then
    raise exception 'Los resultados ya están confirmados' using errcode = '55006';
  end if;

  select count(*), coalesce(max(r.final_position), 0), count(distinct r.final_position)
  into v_finished, v_max, v_distinct
  from racing.race_results r
  where r.grand_prix_id = p_grand_prix_id and r.status = 'finished';
  if v_finished = 0 then
    raise exception 'No hay pilotos clasificados como finished' using errcode = '23514';
  end if;
  if v_max <> v_finished or v_distinct <> v_finished then
    raise exception 'Las posiciones finales deben ser únicas y consecutivas desde 1' using errcode = '23514';
  end if;

  select count(*) into v_pending_pit
  from racing.race_results r
  where r.grand_prix_id = p_grand_prix_id and r.status = 'finished'
    and not r.pit_stop_completed and r.pit_resolution_note is null;
  if v_pending_pit > 0 then
    raise exception '% piloto(s) finalizaron sin parada obligatoria y sin resolución administrativa', v_pending_pit using errcode = '23514';
  end if;

  update racing.race_results r
  set points = coalesce((
    select s.points from racing.points_scale s
    where s.season_id = v_season and s.race_position = r.final_position
  ), 0)
  where r.grand_prix_id = p_grand_prix_id;

  insert into racing.grand_prix_result_confirmations (grand_prix_id, confirmed_by)
  values (p_grand_prix_id, auth.uid());

  insert into racing.result_history (grand_prix_id, action, actor_id, results_snapshot)
  values (p_grand_prix_id, 'confirmed', auth.uid(), jsonb_build_object(
    'race', (select coalesce(jsonb_agg(to_jsonb(r) order by r.final_position nulls last, r.driver_id), '[]'::jsonb)
             from racing.race_results r where r.grand_prix_id = p_grand_prix_id),
    'qualifying', (select coalesce(jsonb_agg(to_jsonb(q) order by q.best_time_ms nulls last, q.driver_id), '[]'::jsonb)
                   from racing.qualifying_results q where q.grand_prix_id = p_grand_prix_id)
  ));

  update racing.grand_prix_events set status = 'completed' where id = p_grand_prix_id;
end;
$$;
revoke all on function racing.confirm_grand_prix_results(uuid) from public, anon, authenticated;
grant execute on function racing.confirm_grand_prix_results(uuid) to authenticated;

create or replace function racing.reopen_grand_prix_results(p_grand_prix_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not racing.is_admin() then
    raise exception 'Se requiere membresía administrativa de Racing' using errcode = '42501';
  end if;
  if p_reason is null or length(trim(p_reason)) < 10 then
    raise exception 'La reapertura exige una razón administrativa de al menos 10 caracteres' using errcode = '23514';
  end if;
  perform 1 from racing.grand_prix_events gp where gp.id = p_grand_prix_id for update;
  if not exists (select 1 from racing.grand_prix_result_confirmations c where c.grand_prix_id = p_grand_prix_id) then
    raise exception 'Los resultados no están confirmados' using errcode = '55006';
  end if;

  insert into racing.result_history (grand_prix_id, action, actor_id, reason, results_snapshot)
  values (p_grand_prix_id, 'reopened', auth.uid(), trim(p_reason), jsonb_build_object(
    'race', (select coalesce(jsonb_agg(to_jsonb(r) order by r.final_position nulls last, r.driver_id), '[]'::jsonb)
             from racing.race_results r where r.grand_prix_id = p_grand_prix_id)
  ));

  delete from racing.grand_prix_result_confirmations where grand_prix_id = p_grand_prix_id;
  update racing.race_results set points = null where grand_prix_id = p_grand_prix_id;
  update racing.grand_prix_events set status = 'active' where id = p_grand_prix_id;
end;
$$;
revoke all on function racing.reopen_grand_prix_results(uuid, text) from public, anon, authenticated;
grant execute on function racing.reopen_grand_prix_results(uuid, text) to authenticated;

-- RLS y grants --------------------------------------------------------------------

grant select on racing.points_scale, racing.qualifying_results, racing.race_results, racing.grand_prix_result_confirmations to anon, authenticated;
grant insert, update, delete on racing.points_scale, racing.qualifying_results, racing.race_results to authenticated;
grant select on racing.result_history to authenticated;

create policy points_scale_public_read on racing.points_scale for select to anon, authenticated using (
  exists (select 1 from racing.seasons s where s.id = points_scale.season_id and s.status in ('active', 'completed'))
);
create policy qualifying_results_public_read on racing.qualifying_results for select to anon, authenticated using (
  exists (select 1 from racing.grand_prix_events gp where gp.id = qualifying_results.grand_prix_id)
);
-- Los resultados de carrera solo son públicos una vez confirmados.
create policy race_results_public_read on racing.race_results for select to anon, authenticated using (
  exists (select 1 from racing.grand_prix_result_confirmations c where c.grand_prix_id = race_results.grand_prix_id)
  and exists (select 1 from racing.grand_prix_events gp where gp.id = race_results.grand_prix_id)
);
create policy confirmations_public_read on racing.grand_prix_result_confirmations for select to anon, authenticated using (
  exists (select 1 from racing.grand_prix_events gp where gp.id = grand_prix_result_confirmations.grand_prix_id)
);
create policy result_history_admin_read on racing.result_history for select to authenticated using (racing.is_admin());

create policy points_scale_admin_write on racing.points_scale for all to authenticated using (racing.is_admin()) with check (racing.is_admin());
create policy qualifying_results_admin_write on racing.qualifying_results for all to authenticated using (racing.is_admin()) with check (racing.is_admin());
create policy race_results_admin_write on racing.race_results for all to authenticated using (racing.is_admin()) with check (racing.is_admin());
create policy confirmations_admin_read on racing.grand_prix_result_confirmations for select to authenticated using (racing.is_admin());

create trigger audit_points_scale after insert or update or delete on racing.points_scale for each row execute function racing.audit_row_change();
create trigger audit_qualifying_results after insert or update or delete on racing.qualifying_results for each row execute function racing.audit_row_change();
create trigger audit_race_results after insert or update or delete on racing.race_results for each row execute function racing.audit_row_change();
create trigger audit_result_confirmations after insert or update or delete on racing.grand_prix_result_confirmations for each row execute function racing.audit_row_change();

comment on table racing.result_history is 'Historial append-only de confirmaciones y reaperturas; sin grants de escritura para clientes.';
comment on table racing.grand_prix_result_confirmations is 'Una fila bloquea clasificación y carrera del Gran Premio; solo se escribe vía confirm/reopen.';
