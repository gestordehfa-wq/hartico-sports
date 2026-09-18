-- Generated from apps/racing/supabase/migrations/002_seasons.sql by tooling/assemble-supabase.mjs. Do not edit this copy.
create table racing.seasons (
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
alter table racing.seasons enable row level security;
create unique index seasons_one_active_idx on racing.seasons ((status)) where status = 'active';
create trigger seasons_updated_at before update on racing.seasons for each row execute function racing.set_updated_at();
