-- Generated from apps/tennis/supabase/migrations/004_audit.sql by tooling/assemble-supabase.mjs. Do not edit this copy.
create table tennis.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  entity text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  occurred_at timestamptz not null default now(),
  transaction_id bigint not null default txid_current()
);
create index audit_events_entity on tennis.audit_events(entity, entity_id, occurred_at desc);
alter table tennis.audit_events enable row level security;
create policy "admins read audit" on tennis.audit_events for select to authenticated using (tennis.is_admin());
grant select on tennis.audit_events to authenticated;

create or replace function tennis.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
revoke all on function tennis.touch_updated_at() from public, anon, authenticated;
create or replace function tennis.capture_audit() returns trigger language plpgsql security definer set search_path = '' as $$
declare row_id uuid;
begin
  row_id := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into tennis.audit_events(actor_id, action, entity, entity_id, before_data, after_data) values (auth.uid(), tg_op, tg_table_name, row_id, case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end, case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  if tg_op = 'DELETE' then return old; end if; return new;
end; $$;
revoke all on function tennis.capture_audit() from public, anon, authenticated;

do $$ declare table_name text; begin
  foreach table_name in array array['seasons','players','tournaments','tournament_editions','matches','match_sets','tournament_point_rules'] loop
    execute format('create trigger %I_touch before update on tennis.%I for each row execute function tennis.touch_updated_at()', table_name, table_name);
  end loop;
  foreach table_name in array array['seasons','players','tournaments','tournament_editions','tournament_entries','matches','match_sets','tournament_point_rules','awards'] loop
    execute format('create trigger %I_audit after insert or update or delete on tennis.%I for each row execute function tennis.capture_audit()', table_name, table_name);
  end loop;
end $$;
