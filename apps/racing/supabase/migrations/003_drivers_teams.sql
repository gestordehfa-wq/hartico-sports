create table public.drivers (
  id uuid primary key default extensions.gen_random_uuid(),
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  real_name text check (real_name is null or length(trim(real_name)) between 1 and 140),
  nationality text not null check (length(trim(nationality)) between 2 and 80),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  racing_number smallint check (racing_number between 0 and 999),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https?://'),
  date_of_birth date,
  status text not null default 'active' check (status in ('active', 'inactive', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.drivers enable row level security;
create unique index drivers_active_number_idx on public.drivers (racing_number) where status = 'active' and racing_number is not null;
create trigger drivers_updated_at before update on public.drivers for each row execute function app_private.set_updated_at();

create table public.teams (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 120),
  short_name text not null check (length(trim(short_name)) between 1 and 60),
  code text not null unique check (code ~ '^[A-Z0-9]{2,6}$'),
  country text not null check (length(trim(country)) between 2 and 80),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  logo_url text check (logo_url is null or logo_url ~ '^https?://'),
  primary_color text check (primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text check (secondary_color is null or secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.teams enable row level security;
create trigger teams_updated_at before update on public.teams for each row execute function app_private.set_updated_at();
