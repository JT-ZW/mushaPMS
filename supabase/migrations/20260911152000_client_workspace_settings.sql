-- Client-managed operating preferences and controlled team access.

create or replace function public.is_org_manager(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.organization_members
        where organization_id = target_organization_id
          and user_id = auth.uid()
          and role in ('owner', 'admin', 'manager')
    );
$$;

grant execute on function public.is_org_manager(uuid) to authenticated;

create table if not exists public.organization_workspace_settings (
    organization_id uuid primary key references public.organizations(id) on delete cascade,
    legal_name text,
    contact_email text,
    contact_phone text,
    address_line_1 text,
    city text,
    country text,
    default_rent_due_day integer check (default_rent_due_day is null or default_rent_due_day between 1 and 31),
    grace_period_days integer not null default 0 check (grace_period_days >= 0),
    late_fee_amount numeric(12, 2) not null default 0 check (late_fee_amount >= 0),
    payment_reference_prefix text,
    payment_instructions text,
    send_rent_reminders boolean not null default true,
    send_maintenance_updates boolean not null default true,
    send_lease_expiry_alerts boolean not null default true,
    updated_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger organization_workspace_settings_set_updated_at
before update on public.organization_workspace_settings
for each row execute function public.set_updated_at();

alter table public.organization_workspace_settings enable row level security;

create policy workspace_settings_org_select on public.organization_workspace_settings
    for select to authenticated using (public.is_org_member(organization_id));
create policy workspace_settings_manager_write on public.organization_workspace_settings
    for all to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy workspace_settings_platform_select on public.organization_workspace_settings
    for select to authenticated using (public.is_platform_staff());
create policy workspace_settings_platform_write on public.organization_workspace_settings
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy invitations_manager_select on public.organization_invitations
    for select to authenticated using (public.is_org_manager(organization_id));
create policy invitations_manager_insert on public.organization_invitations
    for insert to authenticated with check (public.is_org_manager(organization_id));
create policy invitations_manager_update on public.organization_invitations
    for update to authenticated using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
