-- Prevent workspace managers from creating, promoting, or removing owner memberships.
-- Owner membership changes remain a platform-admin operation.

drop policy if exists organization_members_manager_insert on public.organization_members;
create policy organization_members_manager_insert on public.organization_members
    for insert to authenticated
    with check (public.is_org_manager(organization_id) and role <> 'owner');

drop policy if exists organization_members_manager_update on public.organization_members;
create policy organization_members_manager_update on public.organization_members
    for update to authenticated
    using (public.is_org_manager(organization_id) and role <> 'owner')
    with check (public.is_org_manager(organization_id) and role <> 'owner');

drop policy if exists organization_members_manager_delete on public.organization_members;
create policy organization_members_manager_delete on public.organization_members
    for delete to authenticated
    using (public.is_org_manager(organization_id) and role <> 'owner' and user_id <> auth.uid());
