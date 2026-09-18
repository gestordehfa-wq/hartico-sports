create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  entity text not null,
  entity_id uuid,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  before_data jsonb,
  after_data jsonb,
  occurred_at timestamptz not null default now(),
  transaction_id bigint not null default txid_current()
);
create index audit_events_entity on public.audit_events(entity, entity_id, occurred_at desc);
alter table public.audit_events enable row level security;
create policy "admins read audit" on public.audit_events for select to authenticated using (app_private.is_admin());
grant select on public.audit_events to authenticated;

create or replace function app_private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function app_private.touch_updated_at() from public, anon, authenticated;

create or replace function app_private.capture_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare row_id uuid;
begin
  row_id := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into public.audit_events(actor_id, entity, entity_id, operation, before_data, after_data)
  values (auth.uid(), tg_table_name, row_id, tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
revoke all on function app_private.capture_audit() from public, anon, authenticated;

create trigger seasons_touch before update on public.seasons for each row execute function app_private.touch_updated_at();
create trigger competitions_touch before update on public.competitions for each row execute function app_private.touch_updated_at();
create trigger teams_touch before update on public.teams for each row execute function app_private.touch_updated_at();
create trigger players_touch before update on public.players for each row execute function app_private.touch_updated_at();
create trigger rosters_touch before update on public.season_player_rosters for each row execute function app_private.touch_updated_at();
create trigger matches_touch before update on public.matches for each row execute function app_private.touch_updated_at();

create trigger seasons_audit after insert or update or delete on public.seasons for each row execute function app_private.capture_audit();
create trigger competitions_audit after insert or update or delete on public.competitions for each row execute function app_private.capture_audit();
create trigger teams_audit after insert or update or delete on public.teams for each row execute function app_private.capture_audit();
create trigger players_audit after insert or update or delete on public.players for each row execute function app_private.capture_audit();
create trigger rosters_audit after insert or update or delete on public.season_player_rosters for each row execute function app_private.capture_audit();
create trigger matches_audit after insert or update or delete on public.matches for each row execute function app_private.capture_audit();
create trigger events_audit after insert or update or delete on public.match_events for each row execute function app_private.capture_audit();
create trigger appearances_audit after insert or update or delete on public.match_player_appearances for each row execute function app_private.capture_audit();
create trigger awards_audit after insert or update or delete on public.awards for each row execute function app_private.capture_audit();
