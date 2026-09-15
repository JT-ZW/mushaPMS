-- Musha platform administration and controlled client support.

alter table public.organizations
    add column if not exists status text not null default 'onboarding',
    add column if not exists support_notes text,
    add column if not exists handoff_at timestamptz;

alter table public.audit_logs alter column organization_id drop not null;

alter table public.organizations
    add constraint organizations_status_check check (status in ('onboarding', 'active', 'suspended', 'archived'));

create table public.platform_members (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role text not null default 'support' check (role in ('super_admin', 'support', 'implementation', 'billing', 'read_only')),
    display_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.support_sessions (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    started_by uuid not null references auth.users(id) on delete restrict,
    target_user_id uuid references auth.users(id) on delete set null,
    access_level text not null default 'read_only' check (access_level in ('read_only', 'operator')),
    reason text not null,
    started_at timestamptz not null default now(),
    expires_at timestamptz not null default (now() + interval '60 minutes'),
    ended_at timestamptz
);

create index platform_members_role_idx on public.platform_members(role);
create index support_sessions_organization_idx on public.support_sessions(organization_id, started_at desc);
create index support_sessions_started_by_idx on public.support_sessions(started_by, started_at desc);

create or replace function public.is_platform_staff()
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.platform_members
        where user_id = auth.uid()
    );
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.platform_members
        where user_id = auth.uid() and role = 'super_admin'
    );
$$;

grant execute on function public.is_platform_staff() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;

alter table public.platform_members enable row level security;
alter table public.support_sessions enable row level security;

create policy platform_members_self_select on public.platform_members
    for select to authenticated using (user_id = auth.uid() or public.is_platform_admin());

create policy platform_members_admin_write on public.platform_members
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy support_sessions_staff_select on public.support_sessions
    for select to authenticated using (public.is_platform_staff());

create policy support_sessions_admin_write on public.support_sessions
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy support_sessions_staff_read_only_insert on public.support_sessions
    for insert to authenticated
    with check (public.is_platform_staff() and access_level = 'read_only' and started_by = auth.uid());

create policy support_sessions_client_visibility on public.support_sessions
    for select to authenticated using (public.is_org_member(organization_id));

-- Platform staff can inspect all client organizations. Only the superadmin can modify them.
create policy organizations_platform_select on public.organizations
    for select to authenticated using (public.is_platform_staff());
create policy organizations_platform_write on public.organizations
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy organization_members_platform_select on public.organization_members
    for select to authenticated using (public.is_platform_staff());
create policy organization_members_platform_write on public.organization_members
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy properties_platform_select on public.properties
    for select to authenticated using (public.is_platform_staff());
create policy properties_platform_write on public.properties
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy spaces_platform_select on public.spaces
    for select to authenticated using (public.is_platform_staff());
create policy spaces_platform_write on public.spaces
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy people_platform_select on public.people
    for select to authenticated using (public.is_platform_staff());
create policy people_platform_write on public.people
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy tenancies_platform_select on public.tenancies
    for select to authenticated using (public.is_platform_staff());
create policy tenancies_platform_write on public.tenancies
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy tenancy_parties_platform_select on public.tenancy_parties
    for select to authenticated using (public.is_platform_staff());
create policy tenancy_parties_platform_write on public.tenancy_parties
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy charge_schedules_platform_select on public.charge_schedules
    for select to authenticated using (public.is_platform_staff());
create policy charge_schedules_platform_write on public.charge_schedules
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy charges_platform_select on public.charges
    for select to authenticated using (public.is_platform_staff());
create policy charges_platform_write on public.charges
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy payments_platform_select on public.payments
    for select to authenticated using (public.is_platform_staff());
create policy payments_platform_write on public.payments
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy payment_allocations_platform_select on public.payment_allocations
    for select to authenticated using (public.is_platform_staff());
create policy payment_allocations_platform_write on public.payment_allocations
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy maintenance_requests_platform_select on public.maintenance_requests
    for select to authenticated using (public.is_platform_staff());
create policy maintenance_requests_platform_write on public.maintenance_requests
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy maintenance_updates_platform_select on public.maintenance_updates
    for select to authenticated using (public.is_platform_staff());
create policy maintenance_updates_platform_write on public.maintenance_updates
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy documents_platform_select on public.documents
    for select to authenticated using (public.is_platform_staff());
create policy documents_platform_write on public.documents
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy audit_logs_platform_select on public.audit_logs
    for select to authenticated using (public.is_platform_staff());

create policy audit_logs_platform_write on public.audit_logs
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
