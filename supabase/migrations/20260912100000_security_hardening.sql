-- Security hardening for tenant scope, suspended workspaces and payment integrity.

create or replace function public.tenant_is_person(target_person_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1
        from public.people p
        join public.organizations o on o.id = p.organization_id
        where p.id = target_person_id
          and p.user_id = auth.uid()
          and o.status not in ('suspended', 'archived')
    );
$$;

create or replace function public.tenant_has_tenancy(target_tenancy_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1
        from public.tenancy_parties tp
        join public.people p on p.id = tp.person_id
        join public.tenancies t on t.id = tp.tenancy_id
        join public.organizations o on o.id = t.organization_id
        where tp.tenancy_id = target_tenancy_id
          and p.user_id = auth.uid()
          and o.status not in ('suspended', 'archived')
    );
$$;

create or replace function public.tenant_can_use_property(
    requested_property_id uuid,
    requested_space_id uuid default null
)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1
        from public.spaces s
        join public.tenancies t on t.space_id = s.id
        join public.tenancy_parties tp on tp.tenancy_id = t.id
        join public.people p on p.id = tp.person_id
        join public.organizations o on o.id = t.organization_id
        where s.property_id = requested_property_id
          and (requested_space_id is null or s.id = requested_space_id)
          and p.user_id = auth.uid()
          and o.status not in ('suspended', 'archived')
    );
$$;

grant execute on function public.tenant_can_use_property(uuid, uuid) to authenticated;

drop policy if exists people_self_select on public.people;
create policy people_self_select on public.people
    for select to authenticated using (public.tenant_is_person(id));

drop policy if exists people_self_update on public.people;
create policy people_self_update on public.people
    for update to authenticated using (public.tenant_is_person(id)) with check (public.tenant_is_person(id));

drop policy if exists organizations_tenant_select on public.organizations;
create policy organizations_tenant_select on public.organizations
    for select to authenticated using (
        status not in ('suspended', 'archived')
        and exists (select 1 from public.people p where p.organization_id = public.organizations.id and p.user_id = auth.uid())
    );

drop policy if exists maintenance_requests_tenant_insert on public.maintenance_requests;
create policy maintenance_requests_tenant_insert on public.maintenance_requests
    for insert to authenticated with check (
        public.tenant_is_person(reporter_person_id)
        and public.tenant_can_use_property(property_id, space_id)
        and organization_id = (select p.organization_id from public.people p where p.id = reporter_person_id)
    );

create or replace function public.prevent_tenant_identity_scope_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if old.user_id = auth.uid() and (
        new.user_id is distinct from old.user_id
        or new.organization_id is distinct from old.organization_id
        or new.person_type is distinct from old.person_type
    ) then
        raise exception 'Tenant identity scope cannot be changed by the tenant';
    end if;
    return new;
end;
$$;

drop trigger if exists prevent_tenant_identity_scope_changes on public.people;
create trigger prevent_tenant_identity_scope_changes
before update on public.people
for each row execute function public.prevent_tenant_identity_scope_changes();

create policy property_expenses_platform_select on public.property_expenses
    for select to authenticated using (public.is_platform_staff());
create policy property_expenses_platform_write on public.property_expenses
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
