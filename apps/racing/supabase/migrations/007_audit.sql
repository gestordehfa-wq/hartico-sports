create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  entity text not null,
  entity_id uuid,
  occurred_at timestamptz not null default now(),
  before_data jsonb,
  after_data jsonb,
  transaction_id bigint not null default txid_current()
);
alter table public.audit_events enable row level security;
create index audit_events_entity_idx on public.audit_events (entity, entity_id, occurred_at desc);
create index audit_events_actor_idx on public.audit_events (actor_id, occurred_at desc);
grant select on public.audit_events to authenticated;

create policy audit_events_admin_read on public.audit_events for select to authenticated using (app_private.is_admin());

create or replace function app_private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  old_data jsonb;
  new_data jsonb;
  changed_id uuid;
begin
  if tg_op = 'INSERT' then
    new_data := to_jsonb(new);
    changed_id := new.id;
  elsif tg_op = 'UPDATE' then
    old_data := to_jsonb(old);
    new_data := to_jsonb(new);
    changed_id := new.id;
  else
    old_data := to_jsonb(old);
    changed_id := old.id;
  end if;

  insert into public.audit_events (actor_id, action, entity, entity_id, before_data, after_data)
  values (auth.uid(), tg_op, tg_table_name, changed_id, old_data, new_data);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
revoke all on function app_private.audit_row_change() from public, anon, authenticated;

create trigger audit_seasons after insert or update or delete on public.seasons for each row execute function app_private.audit_row_change();
create trigger audit_drivers after insert or update or delete on public.drivers for each row execute function app_private.audit_row_change();
create trigger audit_teams after insert or update or delete on public.teams for each row execute function app_private.audit_row_change();
create trigger audit_entries after insert or update or delete on public.season_driver_entries for each row execute function app_private.audit_row_change();
create trigger audit_circuits after insert or update or delete on public.circuits for each row execute function app_private.audit_row_change();
create trigger audit_grand_prix after insert or update or delete on public.grand_prix_events for each row execute function app_private.audit_row_change();

comment on table public.audit_events is 'Bitácora append-only: sin grants INSERT/UPDATE/DELETE para clientes; solo escriben triggers propietarios.';
