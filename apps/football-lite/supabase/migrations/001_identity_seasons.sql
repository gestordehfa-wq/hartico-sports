create schema if not exists app_private;

create table public.role_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role = 'admin'),
  created_at timestamptz not null default now()
);
alter table public.role_memberships enable row level security;

create or replace function app_private.is_admin(actor uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.role_memberships
    where user_id = actor and role = 'admin'
  );
$$;
revoke all on function app_private.is_admin(uuid) from public, anon;
grant execute on function app_private.is_admin(uuid) to authenticated;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(app_private.is_admin(auth.uid()), false); $$;
revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated;

create policy "admins read memberships" on public.role_memberships
for select to authenticated using (app_private.is_admin());

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_date_range check (end_date >= start_date)
);
create unique index seasons_one_active on public.seasons ((status)) where status = 'active';
alter table public.seasons enable row level security;
create policy "public reads published seasons" on public.seasons for select to anon using (status in ('active', 'completed', 'archived'));
create policy "authenticated reads seasons" on public.seasons for select to authenticated using (true);
create policy "admins insert seasons" on public.seasons for insert to authenticated with check (app_private.is_admin());
create policy "admins update seasons" on public.seasons for update to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy "admins delete seasons" on public.seasons for delete to authenticated using (app_private.is_admin());

grant select on public.seasons to anon;
grant select, insert, update, delete on public.seasons to authenticated;
grant select on public.role_memberships to authenticated;
