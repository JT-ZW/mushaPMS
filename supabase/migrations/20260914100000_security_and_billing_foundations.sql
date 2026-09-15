-- Security and billing foundations.
--
-- The public schema remains the application API, while SECURITY DEFINER
-- authorization helpers live in a private schema. Public compatibility
-- wrappers are SECURITY INVOKER functions, so Supabase's exposed-schema
-- linter does not treat them as callable privilege-escalation endpoints.

create schema if not exists private;

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
    select exists (
        select 1 from public.organization_members
        where organization_id = target_organization_id and user_id = auth.uid()
    );
$$;

create or replace function private.is_org_manager(target_organization_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
    select exists (
        select 1 from public.organization_members
        where organization_id = target_organization_id
          and user_id = auth.uid()
          and role in ('owner', 'admin', 'manager')
    );
$$;

create or replace function private.is_org_finance(target_organization_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
    select exists (
        select 1 from public.organization_members
        where organization_id = target_organization_id
          and user_id = auth.uid()
          and role in ('owner', 'admin', 'manager', 'finance')
    );
$$;

create or replace function private.is_org_maintenance(target_organization_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
    select exists (
        select 1 from public.organization_members
        where organization_id = target_organization_id
          and user_id = auth.uid()
          and role in ('owner', 'admin', 'manager', 'maintenance')
    );
$$;

create or replace function private.is_platform_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
    select exists (select 1 from public.platform_members where user_id = auth.uid());
$$;

create or replace function private.is_platform_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
    select exists (
        select 1 from public.platform_members
        where user_id = auth.uid() and role = 'super_admin'
    );
$$;

create or replace function private.is_active_support_operator(target_organization_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
    select exists (
        select 1 from public.support_sessions
        where organization_id = target_organization_id
          and started_by = auth.uid()
          and access_level = 'operator'
          and ended_at is null
          and expires_at > now()
    );
$$;

create or replace function private.tenant_is_person(target_person_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.people p
        join public.organizations o on o.id = p.organization_id
        where p.id = target_person_id
          and p.user_id = auth.uid()
          and o.status not in ('suspended', 'archived')
    );
$$;

create or replace function private.tenant_has_tenancy(target_tenancy_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
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

create or replace function private.tenant_can_use_property(
    requested_property_id uuid,
    requested_space_id uuid default null
)
returns boolean
language sql stable security definer
set search_path = public
as $$
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

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;
revoke all on schema private from public, anon;
revoke all on all functions in schema private from public, anon;

-- Keep policy references stable, but remove SECURITY DEFINER from exposed
-- functions. These wrappers delegate to the private helpers above.
create or replace function public.is_org_member(target_organization_id uuid)
returns boolean language sql stable security invoker set search_path = public
as $$ select private.is_org_member($1); $$;
create or replace function public.is_org_manager(target_organization_id uuid)
returns boolean language sql stable security invoker set search_path = public
as $$ select private.is_org_manager($1); $$;
create or replace function public.is_org_finance(target_organization_id uuid)
returns boolean language sql stable security invoker set search_path = public
as $$ select private.is_org_finance($1); $$;
create or replace function public.is_org_maintenance(target_organization_id uuid)
returns boolean language sql stable security invoker set search_path = public
as $$ select private.is_org_maintenance($1); $$;
create or replace function public.is_platform_staff()
returns boolean language sql stable security invoker set search_path = public
as $$ select private.is_platform_staff(); $$;
create or replace function public.is_platform_admin()
returns boolean language sql stable security invoker set search_path = public
as $$ select private.is_platform_admin(); $$;
create or replace function public.is_active_support_operator(target_organization_id uuid)
returns boolean language sql stable security invoker set search_path = public
as $$ select private.is_active_support_operator($1); $$;
create or replace function public.tenant_is_person(target_person_id uuid)
returns boolean language sql stable security invoker set search_path = public
as $$ select private.tenant_is_person($1); $$;
create or replace function public.tenant_has_tenancy(target_tenancy_id uuid)
returns boolean language sql stable security invoker set search_path = public
as $$ select private.tenant_has_tenancy($1); $$;
create or replace function public.tenant_can_use_property(
    requested_property_id uuid,
    requested_space_id uuid default null
)
returns boolean language sql stable security invoker set search_path = public
as $$ select private.tenant_can_use_property($1, $2); $$;

revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.is_org_manager(uuid) from public, anon;
revoke all on function public.is_org_finance(uuid) from public, anon;
revoke all on function public.is_org_maintenance(uuid) from public, anon;
revoke all on function public.is_platform_staff() from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.is_active_support_operator(uuid) from public, anon;
revoke all on function public.tenant_is_person(uuid) from public, anon;
revoke all on function public.tenant_has_tenancy(uuid) from public, anon;
revoke all on function public.tenant_can_use_property(uuid, uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_manager(uuid) to authenticated;
grant execute on function public.is_org_finance(uuid) to authenticated;
grant execute on function public.is_org_maintenance(uuid) to authenticated;
grant execute on function public.is_platform_staff() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_active_support_operator(uuid) to authenticated;
grant execute on function public.tenant_is_person(uuid) to authenticated;
grant execute on function public.tenant_has_tenancy(uuid) to authenticated;
grant execute on function public.tenant_can_use_property(uuid, uuid) to authenticated;

-- The trigger only compares the old and new row and does not need elevated
-- table privileges. Recreate it as an invoker function with a fixed path.
create or replace function public.prevent_tenant_identity_scope_changes()
returns trigger language plpgsql security invoker set search_path = public, pg_catalog as $$
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

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke all on function public.prevent_tenant_identity_scope_changes() from public, anon;
grant execute on function public.prevent_tenant_identity_scope_changes() to authenticated;

-- Replace the original permissive organization-member policies with role-aware
-- write policies. SELECT remains available to every member; mutations are
-- separated by operating area.
drop policy if exists organizations_update on public.organizations;
create policy organizations_manager_update on public.organizations
    for update to authenticated using (public.is_org_manager(id)) with check (public.is_org_manager(id));

drop policy if exists organization_members_insert on public.organization_members;
drop policy if exists organization_members_update on public.organization_members;
drop policy if exists organization_members_delete on public.organization_members;
create policy organization_members_manager_insert on public.organization_members
    for insert to authenticated with check (public.is_org_manager(organization_id));
create policy organization_members_manager_update on public.organization_members
    for update to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy organization_members_manager_delete on public.organization_members
    for delete to authenticated using (public.is_org_manager(organization_id));

do $$
declare
    policy_name text;
    table_name text;
begin
    foreach table_name in array array[
        'properties', 'spaces', 'people', 'tenancies', 'tenancy_parties',
        'charge_schedules', 'charges', 'payments', 'payment_allocations',
        'maintenance_requests', 'maintenance_updates', 'documents',
        'property_expenses', 'maintenance_vendors', 'maintenance_plans',
        'maintenance_plan_runs', 'maintenance_attachments', 'maintenance_sla_reminders'
    ] loop
        execute format('drop policy if exists %I on public.%I', table_name || '_org_access', table_name);
    end loop;
end;
$$;

create policy properties_org_select on public.properties for select to authenticated using (public.is_org_member(organization_id));
create policy properties_org_write on public.properties for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy spaces_org_select on public.spaces for select to authenticated using (public.is_org_member(organization_id));
create policy spaces_org_write on public.spaces for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy people_org_select on public.people for select to authenticated using (public.is_org_member(organization_id));
create policy people_org_write on public.people for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy tenancies_org_select on public.tenancies for select to authenticated using (public.is_org_member(organization_id));
create policy tenancies_org_write on public.tenancies for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy tenancy_parties_org_select on public.tenancy_parties for select to authenticated using (exists (select 1 from public.tenancies t where t.id = tenancy_id and public.is_org_member(t.organization_id)));
create policy tenancy_parties_org_write on public.tenancy_parties for all to authenticated using (exists (select 1 from public.tenancies t where t.id = tenancy_id and public.is_org_manager(t.organization_id))) with check (exists (select 1 from public.tenancies t where t.id = tenancy_id and public.is_org_manager(t.organization_id)));

create policy charge_schedules_org_select on public.charge_schedules for select to authenticated using (public.is_org_member(organization_id));
create policy charge_schedules_org_write on public.charge_schedules for all to authenticated using (public.is_org_finance(organization_id)) with check (public.is_org_finance(organization_id));
create policy charges_org_select on public.charges for select to authenticated using (public.is_org_member(organization_id));
create policy charges_org_write on public.charges for all to authenticated using (public.is_org_finance(organization_id)) with check (public.is_org_finance(organization_id));
create policy payments_org_select on public.payments for select to authenticated using (public.is_org_member(organization_id));
create policy payments_org_write on public.payments for all to authenticated using (public.is_org_finance(organization_id)) with check (public.is_org_finance(organization_id));
create policy payment_allocations_org_select on public.payment_allocations for select to authenticated using (exists (select 1 from public.payments p where p.id = payment_id and public.is_org_member(p.organization_id)));
create policy payment_allocations_org_write on public.payment_allocations for all to authenticated using (exists (select 1 from public.payments p where p.id = payment_id and public.is_org_finance(p.organization_id))) with check (exists (select 1 from public.payments p where p.id = payment_id and public.is_org_finance(p.organization_id)));

create policy maintenance_requests_org_select on public.maintenance_requests for select to authenticated using (public.is_org_member(organization_id));
create policy maintenance_requests_org_write on public.maintenance_requests for all to authenticated using (public.is_org_maintenance(organization_id) or public.is_active_support_operator(organization_id)) with check (public.is_org_maintenance(organization_id) or public.is_active_support_operator(organization_id));
create policy maintenance_updates_org_select on public.maintenance_updates for select to authenticated using (public.is_org_member(organization_id));
create policy maintenance_updates_org_write on public.maintenance_updates for all to authenticated using (public.is_org_maintenance(organization_id) or public.is_active_support_operator(organization_id)) with check (public.is_org_maintenance(organization_id) or public.is_active_support_operator(organization_id));
create policy documents_org_select on public.documents for select to authenticated using (public.is_org_member(organization_id));
create policy documents_org_write on public.documents for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy property_expenses_org_select on public.property_expenses for select to authenticated using (public.is_org_member(organization_id));
create policy property_expenses_org_write on public.property_expenses for all to authenticated using (public.is_org_finance(organization_id)) with check (public.is_org_finance(organization_id));
create policy maintenance_vendors_org_select on public.maintenance_vendors for select to authenticated using (public.is_org_member(organization_id));
create policy maintenance_vendors_org_write on public.maintenance_vendors for all to authenticated using (public.is_org_maintenance(organization_id)) with check (public.is_org_maintenance(organization_id));
create policy maintenance_plans_org_select on public.maintenance_plans for select to authenticated using (public.is_org_member(organization_id));
create policy maintenance_plans_org_write on public.maintenance_plans for all to authenticated using (public.is_org_maintenance(organization_id)) with check (public.is_org_maintenance(organization_id));
create policy maintenance_plan_runs_org_select on public.maintenance_plan_runs for select to authenticated using (public.is_org_member(organization_id));
create policy maintenance_plan_runs_org_write on public.maintenance_plan_runs for all to authenticated using (public.is_org_maintenance(organization_id)) with check (public.is_org_maintenance(organization_id));
create policy maintenance_attachments_org_select on public.maintenance_attachments for select to authenticated using (public.is_org_member(organization_id));
create policy maintenance_attachments_org_write on public.maintenance_attachments for all to authenticated using (public.is_org_maintenance(organization_id) or public.is_active_support_operator(organization_id)) with check (public.is_org_maintenance(organization_id) or public.is_active_support_operator(organization_id));
create policy maintenance_sla_reminders_org_select on public.maintenance_sla_reminders for select to authenticated using (public.is_org_member(organization_id));
create policy maintenance_sla_reminders_org_write on public.maintenance_sla_reminders for all to authenticated using (public.is_org_maintenance(organization_id)) with check (public.is_org_maintenance(organization_id));

drop policy if exists audit_logs_org_access on public.audit_logs;
create policy audit_logs_org_select on public.audit_logs for select to authenticated using (public.is_org_member(organization_id));
create policy audit_logs_org_insert on public.audit_logs for insert to authenticated
    with check (actor_user_id = auth.uid() and (public.is_org_member(organization_id) or public.is_active_support_operator(organization_id)));

-- A support operator may end their own active session. The session itself
-- remains visible only to platform staff.
drop policy if exists support_sessions_owner_end on public.support_sessions;
create policy support_sessions_owner_end on public.support_sessions
    for update to authenticated
    using (started_by = auth.uid() and ended_at is null)
    with check (started_by = auth.uid());

-- Organization identity and billing documents.
alter table public.documents
    add column if not exists approval_status text not null default 'approved',
    add column if not exists approved_by uuid references auth.users(id) on delete set null,
    add column if not exists approved_at timestamptz;
alter table public.documents drop constraint if exists documents_approval_status_check;
alter table public.documents add constraint documents_approval_status_check check (approval_status in ('pending', 'approved', 'rejected'));

create policy tenant_documents_storage_staff_select on storage.objects
    for select to authenticated using (
        bucket_id = 'tenant-documents'
        and exists (
            select 1 from public.documents d
            where d.storage_path = name and public.is_org_member(d.organization_id)
        )
    );
create policy tenant_documents_storage_staff_write on storage.objects
    for all to authenticated using (
        bucket_id = 'tenant-documents'
        and public.is_org_manager(((storage.foldername(name))[1])::uuid)
    ) with check (
        bucket_id = 'tenant-documents'
        and public.is_org_manager(((storage.foldername(name))[1])::uuid)
    );

drop policy if exists documents_tenant_select on public.documents;
create policy documents_tenant_select on public.documents for select to authenticated using (
    approval_status = 'approved'
    and (public.tenant_is_person(person_id) or (tenancy_id is not null and public.tenant_has_tenancy(tenancy_id)))
);

alter table public.organization_workspace_settings
    add column if not exists logo_path text,
    add column if not exists logo_mime_type text,
    add column if not exists logo_file_size integer,
    add column if not exists receipt_footer text,
    add column if not exists invoice_prefix text not null default 'INV',
    add column if not exists receipt_prefix text not null default 'RCT',
    add column if not exists payment_terms text;

create table if not exists public.organization_document_sequences (
    organization_id uuid not null references public.organizations(id) on delete cascade,
    document_type text not null check (document_type in ('invoice', 'receipt')),
    sequence_year integer not null,
    next_number integer not null default 1 check (next_number > 0),
    primary key (organization_id, document_type, sequence_year)
);

create table if not exists public.billing_documents (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    document_type text not null check (document_type in ('invoice', 'receipt')),
    document_number text not null,
    tenancy_id uuid references public.tenancies(id) on delete set null,
    person_id uuid references public.people(id) on delete set null,
    payment_id uuid references public.payments(id) on delete set null,
    charge_id uuid references public.charges(id) on delete set null,
    issue_date date not null default current_date,
    due_date date,
    status text not null default 'issued' check (status in ('draft', 'issued', 'paid', 'void')),
    currency_code text not null default 'USD',
    subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
    total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
    line_items jsonb not null default '[]'::jsonb,
    notes text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    unique (organization_id, document_number)
);

create index if not exists billing_documents_org_date_idx on public.billing_documents(organization_id, issue_date desc);
create index if not exists billing_documents_person_idx on public.billing_documents(person_id, issue_date desc);

create table if not exists public.notification_outbox (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete cascade,
    recipient_user_id uuid references auth.users(id) on delete set null,
    recipient_address text,
    channel text not null check (channel in ('in_app', 'email', 'sms', 'whatsapp')),
    event_type text not null,
    payload jsonb not null default '{}'::jsonb,
    status text not null default 'queued' check (status in ('queued', 'processing', 'sent', 'failed', 'cancelled')),
    attempts integer not null default 0 check (attempts >= 0),
    next_attempt_at timestamptz not null default now(),
    sent_at timestamptz,
    last_error text,
    idempotency_key text unique,
    created_at timestamptz not null default now()
);

create index if not exists notification_outbox_due_idx on public.notification_outbox(status, next_attempt_at);
create index if not exists notification_outbox_org_idx on public.notification_outbox(organization_id, created_at desc);

alter table public.organization_document_sequences enable row level security;
alter table public.billing_documents enable row level security;
alter table public.notification_outbox enable row level security;

create policy organization_document_sequences_org_access on public.organization_document_sequences
    for all to authenticated using (public.is_org_finance(organization_id)) with check (public.is_org_finance(organization_id));
create policy billing_documents_org_select on public.billing_documents
    for select to authenticated using (public.is_org_member(organization_id));
create policy billing_documents_org_write on public.billing_documents
    for all to authenticated using (public.is_org_finance(organization_id)) with check (public.is_org_finance(organization_id));
create policy notification_outbox_org_select on public.notification_outbox
    for select to authenticated using (public.is_org_member(organization_id));
create policy notification_outbox_org_write on public.notification_outbox
    for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));

create policy billing_documents_platform_select on public.billing_documents
    for select to authenticated using (public.is_platform_staff());
create policy notification_outbox_platform_select on public.notification_outbox
    for select to authenticated using (public.is_platform_staff());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('organization-assets', 'organization-assets', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types, public = false;

create policy organization_assets_storage_select on storage.objects
    for select to authenticated using (
        bucket_id = 'organization-assets'
        and public.is_org_member(((storage.foldername(name))[1])::uuid)
    );
create policy organization_assets_storage_write on storage.objects
    for all to authenticated using (
        bucket_id = 'organization-assets'
        and public.is_org_manager(((storage.foldername(name))[1])::uuid)
    ) with check (
        bucket_id = 'organization-assets'
        and public.is_org_manager(((storage.foldername(name))[1])::uuid)
    );

create policy maintenance_attachments_storage_support_select on storage.objects
    for select to authenticated using (
        bucket_id = 'maintenance-attachments'
        and public.is_active_support_operator(((storage.foldername(name))[1])::uuid)
    );
create policy maintenance_attachments_storage_support_write on storage.objects
    for insert to authenticated with check (
        bucket_id = 'maintenance-attachments'
        and public.is_active_support_operator(((storage.foldername(name))[1])::uuid)
    );

-- Supabase Auth leaked-password protection is an Auth configuration setting,
-- not a SQL table setting. Enable it in Dashboard > Authentication >
-- Password Security for the project that applies this migration.
