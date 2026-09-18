create or replace function app_private.validate_entry_seed()
returns trigger language plpgsql set search_path = '' as $$
declare size integer;
begin
  if new.seed is null then return new; end if;
  select draw_size into size from public.tournament_editions where id = new.tournament_edition_id;
  if new.seed > size then raise exception 'seed outside draw size'; end if;
  return new;
end;
$$;
revoke all on function app_private.validate_entry_seed() from public, anon, authenticated;
create trigger tournament_entries_seed before insert or update on public.tournament_entries
for each row execute function app_private.validate_entry_seed();

create or replace function app_private.validate_match_integrity()
returns trigger language plpgsql set search_path = '' as $$
declare target public.matches%rowtype;
begin
  if new.player1_id is not null and not exists (select 1 from public.tournament_entries where tournament_edition_id = new.tournament_edition_id and player_id = new.player1_id and entry_status in ('registered', 'active')) then raise exception 'player1 is not an active edition entry'; end if;
  if new.player2_id is not null and not exists (select 1 from public.tournament_entries where tournament_edition_id = new.tournament_edition_id and player_id = new.player2_id and entry_status in ('registered', 'active')) then raise exception 'player2 is not an active edition entry'; end if;
  if new.next_match_id is not null then
    select * into target from public.matches where id = new.next_match_id;
    if not found or target.tournament_edition_id <> new.tournament_edition_id or target.round_order <> new.round_order + 1 then raise exception 'invalid next match link'; end if;
  end if;
  return new;
end;
$$;
revoke all on function app_private.validate_match_integrity() from public, anon, authenticated;
create trigger matches_integrity before insert or update on public.matches
for each row execute function app_private.validate_match_integrity();

create or replace function app_private.validate_match_set()
returns trigger language plpgsql set search_path = '' as $$
declare maximum_sets integer;
begin
  select best_of into maximum_sets from public.matches where id = new.match_id;
  if new.set_number > maximum_sets then raise exception 'set exceeds match format'; end if;
  return new;
end;
$$;
revoke all on function app_private.validate_match_set() from public, anon, authenticated;
create trigger match_sets_format before insert or update on public.match_sets
for each row execute function app_private.validate_match_set();

create or replace function public.generate_tournament_draw(target_edition_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  edition public.tournament_editions%rowtype;
  entry_count integer;
  round_count integer;
  level integer;
  match_count integer;
  match_index integer;
  round_name text;
  slots uuid[];
  remaining uuid[];
  remaining_index integer := 1;
  item record;
  target_slot integer;
begin
  if not app_private.is_admin(auth.uid()) then raise exception 'admin required' using errcode = '42501'; end if;
  select * into edition from public.tournament_editions where id = target_edition_id for update;
  if not found then raise exception 'edition not found'; end if;
  if edition.status not in ('draft', 'registration') then raise exception 'draw can only be generated before edition starts'; end if;
  if exists (select 1 from public.matches where tournament_edition_id = target_edition_id) then raise exception 'draw already exists'; end if;
  select count(*) into entry_count from public.tournament_entries where tournament_edition_id = target_edition_id and entry_status in ('registered', 'active');
  if entry_count <> edition.draw_size then raise exception 'expected % entries, found %', edition.draw_size, entry_count; end if;
  if exists (select 1 from public.tournament_entries where tournament_edition_id = target_edition_id and seed is not null and seed > edition.draw_size) then raise exception 'seed outside draw'; end if;

  slots := array_fill(null::uuid, array[edition.draw_size]);
  for item in select player_id, seed from public.tournament_entries where tournament_edition_id = target_edition_id and entry_status in ('registered', 'active') and seed is not null order by seed loop
    target_slot := case edition.draw_size
      when 4 then (array[1,4,3,2])[item.seed]
      when 8 then (array[1,8,5,4,3,6,7,2])[item.seed]
      when 16 then (array[1,16,9,8,5,12,13,4,3,14,11,6,7,10,15,2])[item.seed]
    end;
    slots[target_slot] := item.player_id;
  end loop;
  select array_agg(player_id order by player_id) into remaining from public.tournament_entries where tournament_edition_id = target_edition_id and entry_status in ('registered', 'active') and seed is null;
  for target_slot in 1..edition.draw_size loop
    if slots[target_slot] is null then slots[target_slot] := remaining[remaining_index]; remaining_index := remaining_index + 1; end if;
  end loop;

  round_count := case edition.draw_size when 4 then 2 when 8 then 3 when 16 then 4 end;
  for level in 1..round_count loop
    match_count := edition.draw_size / power(2, level)::integer;
    round_name := case match_count when 8 then 'round_of_16' when 4 then 'quarterfinal' when 2 then 'semifinal' when 1 then 'final' end;
    for match_index in 1..match_count loop
      insert into public.matches(tournament_edition_id, round, round_order, match_number, player1_id, player2_id, best_of)
      values (target_edition_id, round_name, level, match_index,
        case when level = 1 then slots[match_index * 2 - 1] end,
        case when level = 1 then slots[match_index * 2] end,
        edition.best_of);
    end loop;
  end loop;
  update public.matches source set next_match_id = target.id, next_slot = case when source.match_number % 2 = 1 then 1 else 2 end
  from public.matches target where source.tournament_edition_id = target_edition_id and target.tournament_edition_id = target_edition_id
    and target.round_order = source.round_order + 1 and target.match_number = ((source.match_number + 1) / 2)
    and source.round_order < round_count;
  update public.tournament_entries set entry_status = 'active' where tournament_edition_id = target_edition_id and entry_status = 'registered';
end;
$$;
revoke all on function public.generate_tournament_draw(uuid) from public, anon;
grant execute on function public.generate_tournament_draw(uuid) to authenticated;

create or replace function public.confirm_match_result(target_match_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_match public.matches%rowtype;
  next_match public.matches%rowtype;
  player1_sets integer;
  player2_sets integer;
  needed integer;
  decided_winner uuid;
  decided_loser uuid;
begin
  if not app_private.is_admin(auth.uid()) then raise exception 'admin required' using errcode = '42501'; end if;
  select * into current_match from public.matches where id = target_match_id for update;
  if not found then raise exception 'match not found'; end if;
  if current_match.status not in ('scheduled', 'in_progress', 'walkover', 'retired') then raise exception 'match is not confirmable'; end if;
  if current_match.player1_id is null or current_match.player2_id is null or current_match.player1_id = current_match.player2_id then raise exception 'two distinct players required'; end if;
  if current_match.status in ('walkover', 'retired') then
    decided_winner := current_match.winner_id;
    if decided_winner is null then raise exception 'walkover or retirement requires an explicit winner'; end if;
    decided_loser := case when decided_winner = current_match.player1_id then current_match.player2_id else current_match.player1_id end;
  else
    if exists (select 1 from public.match_sets where match_id = target_match_id and (player1_score < 0 or player2_score < 0 or player1_score = player2_score)) then raise exception 'invalid set score'; end if;
    if (select count(*) from public.match_sets where match_id = target_match_id) > current_match.best_of then raise exception 'too many sets'; end if;
    if exists (select 1 from generate_series(1, (select count(*)::integer from public.match_sets where match_id = target_match_id)) expected where not exists (select 1 from public.match_sets s where s.match_id = target_match_id and s.set_number = expected)) then raise exception 'sets must be consecutive'; end if;
    select count(*) filter (where player1_score > player2_score), count(*) filter (where player2_score > player1_score) into player1_sets, player2_sets from public.match_sets where match_id = target_match_id;
    needed := (current_match.best_of / 2) + 1;
    if greatest(player1_sets, player2_sets) <> needed or least(player1_sets, player2_sets) >= needed then raise exception 'sets do not determine a valid winner'; end if;
    if player1_sets > player2_sets then decided_winner := current_match.player1_id; decided_loser := current_match.player2_id; else decided_winner := current_match.player2_id; decided_loser := current_match.player1_id; end if;
    update public.matches set winner_id = decided_winner, status = 'finished' where id = target_match_id;
  end if;
  update public.tournament_entries set entry_status = 'eliminated' where tournament_edition_id = current_match.tournament_edition_id and player_id = decided_loser;
  if current_match.round = 'final' then
    update public.tournament_entries set entry_status = 'champion' where tournament_edition_id = current_match.tournament_edition_id and player_id = decided_winner;
  elsif current_match.next_match_id is not null then
    select * into next_match from public.matches where id = current_match.next_match_id for update;
    if next_match.tournament_edition_id <> current_match.tournament_edition_id then raise exception 'cross-edition advancement'; end if;
    if (current_match.next_slot = 1 and next_match.player1_id is not null and next_match.player1_id <> decided_winner) or (current_match.next_slot = 2 and next_match.player2_id is not null and next_match.player2_id <> decided_winner) then raise exception 'next slot already occupied'; end if;
    if (current_match.next_slot = 1 and next_match.player2_id = decided_winner) or (current_match.next_slot = 2 and next_match.player1_id = decided_winner) then raise exception 'winner would be duplicated'; end if;
    update public.matches set player1_id = case when current_match.next_slot = 1 then decided_winner else player1_id end, player2_id = case when current_match.next_slot = 2 then decided_winner else player2_id end where id = next_match.id;
  end if;
end;
$$;
revoke all on function public.confirm_match_result(uuid) from public, anon;
grant execute on function public.confirm_match_result(uuid) to authenticated;
