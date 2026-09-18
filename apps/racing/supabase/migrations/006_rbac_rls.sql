grant select on public.seasons, public.drivers, public.teams, public.season_driver_entries, public.circuits, public.grand_prix_events, public.grand_prix_calendar to anon, authenticated;
grant insert, update, delete on public.seasons, public.drivers, public.teams, public.season_driver_entries, public.circuits, public.grand_prix_events to authenticated;

create policy seasons_public_read on public.seasons for select to anon, authenticated using (status in ('active', 'completed'));
create policy drivers_public_read on public.drivers for select to anon, authenticated using (true);
create policy teams_public_read on public.teams for select to anon, authenticated using (status <> 'archived');
create policy circuits_public_read on public.circuits for select to anon, authenticated using (status <> 'archived');
create policy entries_public_read on public.season_driver_entries for select to anon, authenticated using (
  exists (select 1 from public.seasons s where s.id = season_id and s.status in ('active', 'completed'))
  and exists (select 1 from public.teams t where t.id = team_id and t.status <> 'archived')
);
create policy grand_prix_public_read on public.grand_prix_events for select to anon, authenticated using (
  exists (select 1 from public.seasons s where s.id = season_id and s.status in ('active', 'completed'))
);

create policy profiles_own_read on public.profiles for select to authenticated using (id = auth.uid());
create policy role_memberships_own_read on public.role_memberships for select to authenticated using (user_id = auth.uid());

create policy seasons_admin_write on public.seasons for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy drivers_admin_write on public.drivers for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy teams_admin_write on public.teams for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy entries_admin_write on public.season_driver_entries for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy circuits_admin_write on public.circuits for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy grand_prix_admin_write on public.grand_prix_events for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());

comment on policy drivers_public_read on public.drivers is 'La identidad de piloto de v0.1 es pública; no almacena PII privada.';
