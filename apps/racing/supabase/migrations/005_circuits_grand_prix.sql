create table public.circuits (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 140),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  short_name text check (short_name is null or length(trim(short_name)) between 1 and 60),
  country text not null check (length(trim(country)) between 2 and 80),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  city text,
  image_url text check (image_url is null or image_url ~ '^https?://'),
  length_km numeric(7,3) check (length_km is null or length_km > 0),
  default_laps smallint not null check (default_laps between 4 and 8),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.circuits enable row level security;
create trigger circuits_updated_at before update on public.circuits for each row execute function app_private.set_updated_at();

create table public.grand_prix_events (
  id uuid primary key default extensions.gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  circuit_id uuid not null references public.circuits(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 140),
  slug text not null,
  round_number smallint not null check (round_number > 0),
  scheduled_date date not null,
  race_laps smallint check (race_laps is null or race_laps between 4 and 8),
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'completed', 'cancelled', 'postponed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, round_number),
  unique (season_id, slug)
);
alter table public.grand_prix_events enable row level security;
create index grand_prix_events_calendar_idx on public.grand_prix_events (season_id, scheduled_date, round_number);
create trigger grand_prix_events_updated_at before update on public.grand_prix_events for each row execute function app_private.set_updated_at();

create view public.grand_prix_calendar
with (security_invoker = true)
as
select gp.*, coalesce(gp.race_laps, c.default_laps) as effective_race_laps
from public.grand_prix_events gp
join public.circuits c on c.id = gp.circuit_id;

comment on column public.grand_prix_events.race_laps is 'Override opcional; la carrera futura usa este valor o circuits.default_laps, siempre entre 4 y 8.';
