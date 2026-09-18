-- Generated from apps/racing/supabase/migrations/006_rbac_rls.sql by tooling/assemble-supabase.mjs. Do not edit this copy.
grant select on racing.seasons, racing.drivers, racing.teams, racing.season_driver_entries, racing.circuits, racing.grand_prix_events, racing.grand_prix_calendar to anon, authenticated;
grant insert, update, delete on racing.seasons, racing.drivers, racing.teams, racing.season_driver_entries, racing.circuits, racing.grand_prix_events to authenticated;

create policy seasons_public_read on racing.seasons for select to anon, authenticated using (status in ('active', 'completed'));
create policy drivers_public_read on racing.drivers for select to anon, authenticated using (true);
create policy teams_public_read on racing.teams for select to anon, authenticated using (status <> 'archived');
create policy circuits_public_read on racing.circuits for select to anon, authenticated using (status <> 'archived');
create policy entries_public_read on racing.season_driver_entries for select to anon, authenticated using (
  exists (select 1 from racing.seasons s where s.id = season_id and s.status in ('active', 'completed'))
  and exists (select 1 from racing.teams t where t.id = team_id and t.status <> 'archived')
);
create policy grand_prix_public_read on racing.grand_prix_events for select to anon, authenticated using (
  exists (select 1 from racing.seasons s where s.id = season_id and s.status in ('active', 'completed'))
);

create policy role_memberships_own_read on racing.role_memberships for select to authenticated using (user_id = auth.uid());

create policy seasons_admin_write on racing.seasons for all to authenticated using (racing.is_admin()) with check (racing.is_admin());
create policy drivers_admin_write on racing.drivers for all to authenticated using (racing.is_admin()) with check (racing.is_admin());
create policy teams_admin_write on racing.teams for all to authenticated using (racing.is_admin()) with check (racing.is_admin());
create policy entries_admin_write on racing.season_driver_entries for all to authenticated using (racing.is_admin()) with check (racing.is_admin());
create policy circuits_admin_write on racing.circuits for all to authenticated using (racing.is_admin()) with check (racing.is_admin());
create policy grand_prix_admin_write on racing.grand_prix_events for all to authenticated using (racing.is_admin()) with check (racing.is_admin());

comment on policy drivers_public_read on racing.drivers is 'La identidad de piloto de v0.1 es pública; no almacena PII privada.';
