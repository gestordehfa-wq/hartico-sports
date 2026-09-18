create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.role_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role = 'admin'),
  created_at timestamptz not null default now()
);
alter table public.role_memberships enable row level security;

create or replace function app_private.is_admin(actor_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select actor_id is not null and exists (
    select 1 from public.role_memberships
    where user_id = actor_id and role = 'admin'
  );
$$;
revoke all on function app_private.is_admin(uuid) from public, anon, authenticated;
grant execute on function app_private.is_admin(uuid) to authenticated;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$ select app_private.is_admin(auth.uid()); $$;
revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function app_private.set_updated_at() from public, anon, authenticated;

comment on table public.role_memberships is 'Membresías mínimas administradas fuera de la API pública; v0.1 solo admite admin.';
