create table public.season_driver_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  driver_id uuid not null references public.drivers(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  racing_number smallint check (racing_number between 0 and 999),
  role text not null default 'primary' check (role in ('primary', 'reserve', 'substitute')),
  status text not null default 'active' check (status in ('active', 'withdrawn', 'completed')),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint season_driver_entries_date_order check (start_date is null or end_date is null or start_date <= end_date),
  constraint season_driver_entries_no_overlap exclude using gist (
    season_id with =,
    driver_id with =,
    daterange(coalesce(start_date, '-infinity'::date), coalesce(end_date, 'infinity'::date), '[]') with &&
  )
);
alter table public.season_driver_entries enable row level security;
create index season_driver_entries_season_idx on public.season_driver_entries (season_id, team_id);
create trigger season_driver_entries_updated_at before update on public.season_driver_entries for each row execute function app_private.set_updated_at();

comment on constraint season_driver_entries_no_overlap on public.season_driver_entries is
  'Permite cambios de escudería no solapados y conserva el historial efectivo por fechas.';
