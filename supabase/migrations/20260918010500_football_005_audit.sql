-- Generated from apps/football-lite/supabase/migrations/005_audit.sql by tooling/assemble-supabase.mjs. Do not edit this copy.
create table football.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  entity text not null,
  entity_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  before_data jsonb,
  after_data jsonb,
  occurred_at timestamptz not null default now(),
  transaction_id bigint not null default txid_current()
);
create index audit_events_entity on football.audit_events(entity, entity_id, occurred_at desc);
alter table football.audit_events enable row level security;
create policy "admins read audit" on football.audit_events for select to authenticated using (football.is_admin());
grant select on football.audit_events to authenticated;

create or replace function football.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function football.touch_updated_at() from public, anon, authenticated;

create or replace function football.capture_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare row_id uuid;
begin
  row_id := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into football.audit_events(actor_id, entity, entity_id, action, before_data, after_data)
  values (auth.uid(), tg_table_name, row_id, tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
revoke all on function football.capture_audit() from public, anon, authenticated;

create trigger seasons_touch before update on football.seasons for each row execute function football.touch_updated_at();
create trigger competitions_touch before update on football.competitions for each row execute function football.touch_updated_at();
create trigger teams_touch before update on football.teams for each row execute function football.touch_updated_at();
create trigger players_touch before update on football.players for each row execute function football.touch_updated_at();
create trigger rosters_touch before update on football.season_player_rosters for each row execute function football.touch_updated_at();
create trigger matches_touch before update on football.matches for each row execute function football.touch_updated_at();

create trigger seasons_audit after insert or update or delete on football.seasons for each row execute function football.capture_audit();
create trigger competitions_audit after insert or update or delete on football.competitions for each row execute function football.capture_audit();
create trigger teams_audit after insert or update or delete on football.teams for each row execute function football.capture_audit();
create trigger players_audit after insert or update or delete on football.players for each row execute function football.capture_audit();
create trigger rosters_audit after insert or update or delete on football.season_player_rosters for each row execute function football.capture_audit();
create trigger matches_audit after insert or update or delete on football.matches for each row execute function football.capture_audit();
create trigger events_audit after insert or update or delete on football.match_events for each row execute function football.capture_audit();
create trigger appearances_audit after insert or update or delete on football.match_player_appearances for each row execute function football.capture_audit();
create trigger awards_audit after insert or update or delete on football.awards for each row execute function football.capture_audit();
