create table public.seasons (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  year smallint check (year between 1900 and 2200),
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_date_order check (start_date <= end_date)
);
alter table public.seasons enable row level security;
create unique index seasons_one_active_idx on public.seasons ((status)) where status = 'active';
create trigger seasons_updated_at before update on public.seasons for each row execute function app_private.set_updated_at();
