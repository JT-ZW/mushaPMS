-- Reporting foundations and tenant portal access.

alter table public.people
    add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists people_user_id_unique_idx
    on public.people(user_id)
    where user_id is not null;

create table if not exists public.property_expenses (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    property_id uuid not null references public.properties(id) on delete cascade,
    space_id uuid references public.spaces(id) on delete set null,
    vendor_id uuid references public.maintenance_vendors(id) on delete set null,
    category text not null default 'other' check (category in ('rates', 'insurance', 'utilities', 'security', 'cleaning', 'staff', 'repairs', 'contractor', 'management_fee', 'other')),
    description text not null,
    amount numeric(12, 2) not null check (amount >= 0),
    expense_date date not null default current_date,
    reference text,
    notes text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists property_expenses_org_date_idx
    on public.property_expenses(organization_id, expense_date desc);
create index if not exists property_expenses_property_date_idx
    on public.property_expenses(property_id, expense_date desc);

create or replace function public.tenant_is_person(target_person_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.people where id = target_person_id and user_id = auth.uid());
$$;

create or replace function public.tenant_has_tenancy(target_tenancy_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1
        from public.tenancy_parties tp
        join public.people p on p.id = tp.person_id
        where tp.tenancy_id = target_tenancy_id and p.user_id = auth.uid()
    );
$$;

grant execute on function public.tenant_is_person(uuid) to authenticated;
grant execute on function public.tenant_has_tenancy(uuid) to authenticated;

alter table public.property_expenses enable row level security;

create policy property_expenses_org_access on public.property_expenses
    for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy people_self_select on public.people
    for select to authenticated using (user_id = auth.uid());
create policy people_self_update on public.people
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy organizations_tenant_select on public.organizations
    for select to authenticated using (exists (
        select 1 from public.people p where p.organization_id = public.organizations.id and p.user_id = auth.uid()
    ));

create policy properties_tenant_select on public.properties
    for select to authenticated using (exists (
        select 1 from public.spaces s
        join public.tenancies t on t.space_id = s.id
        join public.tenancy_parties tp on tp.tenancy_id = t.id
        join public.people p on p.id = tp.person_id
        where s.property_id = public.properties.id and p.user_id = auth.uid()
    ));

create policy spaces_tenant_select on public.spaces
    for select to authenticated using (exists (
        select 1 from public.tenancies t
        join public.tenancy_parties tp on tp.tenancy_id = t.id
        join public.people p on p.id = tp.person_id
        where t.space_id = public.spaces.id and p.user_id = auth.uid()
    ));

create policy tenancies_tenant_select on public.tenancies
    for select to authenticated using (public.tenant_has_tenancy(id));
create policy tenancy_parties_tenant_select on public.tenancy_parties
    for select to authenticated using (public.tenant_is_person(person_id));
create policy charges_tenant_select on public.charges
    for select to authenticated using (public.tenant_has_tenancy(tenancy_id));
create policy payments_tenant_select on public.payments
    for select to authenticated using (public.tenant_has_tenancy(tenancy_id) or public.tenant_is_person(payer_person_id));
create policy payment_allocations_tenant_select on public.payment_allocations
    for select to authenticated using (exists (
        select 1 from public.charges c where c.id = charge_id and public.tenant_has_tenancy(c.tenancy_id)
    ));

create policy maintenance_requests_tenant_select on public.maintenance_requests
    for select to authenticated using (public.tenant_is_person(reporter_person_id));
create policy maintenance_requests_tenant_insert on public.maintenance_requests
    for insert to authenticated with check (public.tenant_is_person(reporter_person_id));
create policy maintenance_updates_tenant_select on public.maintenance_updates
    for select to authenticated using (exists (
        select 1 from public.maintenance_requests mr
        where mr.id = request_id and public.tenant_is_person(mr.reporter_person_id)
    ));
create policy maintenance_updates_tenant_insert on public.maintenance_updates
    for insert to authenticated with check (
        author_user_id = auth.uid() and exists (
            select 1 from public.maintenance_requests mr
            where mr.id = request_id and public.tenant_is_person(mr.reporter_person_id)
        )
    );

create policy maintenance_attachments_tenant_select on public.maintenance_attachments
    for select to authenticated using (exists (
        select 1 from public.maintenance_requests mr
        where mr.id = request_id and public.tenant_is_person(mr.reporter_person_id)
    ));
create policy maintenance_attachments_tenant_insert on public.maintenance_attachments
    for insert to authenticated with check (exists (
        select 1 from public.maintenance_requests mr
        where mr.id = request_id and public.tenant_is_person(mr.reporter_person_id)
    ));

create policy documents_tenant_select on public.documents
    for select to authenticated using (
        public.tenant_is_person(person_id)
        or (tenancy_id is not null and public.tenant_has_tenancy(tenancy_id))
    );

create policy organization_settings_tenant_select on public.organization_workspace_settings
    for select to authenticated using (exists (
        select 1
        from public.tenancies t
        join public.spaces s on s.id = t.space_id
        join public.people p on p.user_id = auth.uid()
        where t.organization_id = public.organization_workspace_settings.organization_id
          and exists (select 1 from public.tenancy_parties tp where tp.tenancy_id = t.id and tp.person_id = p.id)
    ));

create trigger property_expenses_set_updated_at before update on public.property_expenses
    for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenant-documents', 'tenant-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types, public = false;

create policy tenant_documents_storage_select on storage.objects
    for select to authenticated using (
        bucket_id = 'tenant-documents'
        and exists (
            select 1 from public.documents d
            where d.storage_path = name
              and (public.tenant_is_person(d.person_id) or (d.tenancy_id is not null and public.tenant_has_tenancy(d.tenancy_id)))
        )
    );

-- Tenants may upload photos only into requests that they reported themselves.
-- The folder convention is organization_id/request_id/file-name.
create policy maintenance_attachments_storage_tenant_insert on storage.objects
    for insert to authenticated with check (
        bucket_id = 'maintenance-attachments'
        and exists (
            select 1
            from public.maintenance_requests mr
            where mr.organization_id = (storage.foldername(name))[1]::uuid
              and mr.id = (storage.foldername(name))[2]::uuid
              and public.tenant_is_person(mr.reporter_person_id)
        )
    );

create policy maintenance_attachments_storage_tenant_select on storage.objects
    for select to authenticated using (
        bucket_id = 'maintenance-attachments'
        and exists (
            select 1
            from public.maintenance_requests mr
            where mr.organization_id = (storage.foldername(name))[1]::uuid
              and mr.id = (storage.foldername(name))[2]::uuid
              and public.tenant_is_person(mr.reporter_person_id)
        )
    );
