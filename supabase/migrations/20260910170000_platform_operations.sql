-- Musha platform operations: onboarding, support, alerts, billing, and imports.

alter table public.organizations
    add column if not exists onboarding_template text not null default 'residential',
    add column if not exists onboarding_started_at timestamptz not null default now(),
    add column if not exists onboarding_completed_at timestamptz,
    add column if not exists last_activity_at timestamptz not null default now();

alter table public.organizations
    add constraint organizations_onboarding_template_check
    check (onboarding_template in ('residential', 'commercial', 'student', 'short_stay'));

-- Suspended and archived workspaces remain stored but are no longer available to client members.
create or replace function public.is_org_member(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1
        from public.organization_members m
        join public.organizations o on o.id = m.organization_id
        where m.organization_id = target_organization_id
          and m.user_id = auth.uid()
          and o.status not in ('suspended', 'archived')
    );
$$;

create table public.organization_onboarding_tasks (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    task_key text not null,
    title text not null,
    description text,
    phase text not null default 'setup' check (phase in ('setup', 'data', 'handoff')),
    position integer not null default 0,
    status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'blocked')),
    assigned_to uuid references auth.users(id) on delete set null,
    completed_by uuid references auth.users(id) on delete set null,
    completed_at timestamptz,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (organization_id, task_key)
);

create table public.organization_invitations (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    email text not null,
    role text not null default 'admin' check (role in ('owner', 'admin', 'manager', 'finance', 'maintenance', 'viewer')),
    status text not null default 'pending' check (status in ('pending', 'sent', 'accepted', 'failed', 'expired')),
    invited_by uuid references auth.users(id) on delete set null,
    invited_at timestamptz not null default now(),
    accepted_at timestamptz,
    last_error text,
    created_at timestamptz not null default now()
);

create table public.support_tickets (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete cascade,
    requester_user_id uuid references auth.users(id) on delete set null,
    subject text not null,
    description text not null,
    category text not null default 'general' check (category in ('general', 'access', 'billing', 'setup', 'maintenance', 'data', 'bug')),
    priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
    status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_on_client', 'resolved', 'closed')),
    assigned_to uuid references auth.users(id) on delete set null,
    due_at timestamptz,
    first_response_at timestamptz,
    resolved_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.support_ticket_messages (
    id uuid primary key default gen_random_uuid(),
    ticket_id uuid not null references public.support_tickets(id) on delete cascade,
    author_user_id uuid references auth.users(id) on delete set null,
    body text not null,
    visibility text not null default 'client' check (visibility in ('client', 'internal')),
    created_at timestamptz not null default now()
);

create table public.support_ticket_attachments (
    id uuid primary key default gen_random_uuid(),
    ticket_id uuid not null references public.support_tickets(id) on delete cascade,
    uploaded_by uuid references auth.users(id) on delete set null,
    file_name text not null,
    storage_path text not null,
    mime_type text,
    file_size integer,
    created_at timestamptz not null default now()
);

create table public.platform_alerts (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete cascade,
    alert_type text not null check (alert_type in ('invitation_failed', 'setup_blocked', 'import_failed', 'system')),
    severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
    status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
    title text not null,
    detail text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    resolved_at timestamptz,
    resolved_by uuid references auth.users(id) on delete set null
);

create table public.platform_plans (
    id uuid primary key default gen_random_uuid(),
    plan_key text not null unique,
    name text not null,
    monthly_price numeric(12, 2) not null default 0 check (monthly_price >= 0),
    currency_code text not null default 'USD' check (char_length(currency_code) = 3),
    property_limit integer check (property_limit is null or property_limit > 0),
    space_limit integer check (space_limit is null or space_limit > 0),
    features jsonb not null default '{}'::jsonb,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.organization_subscriptions (
    organization_id uuid primary key references public.organizations(id) on delete cascade,
    plan_id uuid not null references public.platform_plans(id) on delete restrict,
    status text not null default 'trial' check (status in ('trial', 'active', 'past_due', 'paused', 'cancelled')),
    started_on date not null default current_date,
    trial_ends_on date,
    current_period_ends_on date,
    billing_notes text,
    updated_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.import_jobs (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    created_by uuid references auth.users(id) on delete set null,
    entity_type text not null check (entity_type in ('properties', 'spaces', 'people', 'tenancies', 'charges', 'payments')),
    source_name text not null,
    status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'completed_with_errors', 'failed')),
    total_rows integer not null default 0,
    processed_rows integer not null default 0,
    failed_rows integer not null default 0,
    error_summary text,
    created_at timestamptz not null default now(),
    completed_at timestamptz
);

create table public.platform_settings (
    setting_key text primary key,
    value jsonb not null default '{}'::jsonb,
    description text,
    updated_by uuid references auth.users(id) on delete set null,
    updated_at timestamptz not null default now()
);

create index onboarding_tasks_organization_idx on public.organization_onboarding_tasks(organization_id, position);
create index organization_invitations_status_idx on public.organization_invitations(status, invited_at desc);
create index support_tickets_status_idx on public.support_tickets(status, priority, created_at desc);
create index support_tickets_organization_idx on public.support_tickets(organization_id, created_at desc);
create index support_ticket_messages_ticket_idx on public.support_ticket_messages(ticket_id, created_at);
create index platform_alerts_status_idx on public.platform_alerts(status, created_at desc);
create index import_jobs_organization_idx on public.import_jobs(organization_id, created_at desc);

create trigger onboarding_tasks_set_updated_at before update on public.organization_onboarding_tasks for each row execute function public.set_updated_at();
create trigger support_tickets_set_updated_at before update on public.support_tickets for each row execute function public.set_updated_at();
create trigger platform_plans_set_updated_at before update on public.platform_plans for each row execute function public.set_updated_at();
create trigger organization_subscriptions_set_updated_at before update on public.organization_subscriptions for each row execute function public.set_updated_at();

insert into public.platform_plans (plan_key, name, monthly_price, property_limit, space_limit, features)
values
    ('starter', 'Starter', 0, 5, 50, '{"support": "email", "reports": true}'::jsonb),
    ('growth', 'Growth', 49, 25, 250, '{"support": "priority", "reports": true, "imports": true}'::jsonb),
    ('portfolio', 'Portfolio', 149, null, null, '{"support": "priority", "reports": true, "imports": true, "advanced_permissions": true}'::jsonb)
on conflict (plan_key) do nothing;

alter table public.organization_onboarding_tasks enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.support_ticket_attachments enable row level security;
alter table public.platform_alerts enable row level security;
alter table public.platform_plans enable row level security;
alter table public.organization_subscriptions enable row level security;
alter table public.import_jobs enable row level security;
alter table public.platform_settings enable row level security;

create policy onboarding_tasks_org_access on public.organization_onboarding_tasks
    for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy onboarding_tasks_platform_select on public.organization_onboarding_tasks
    for select to authenticated using (public.is_platform_staff());
create policy onboarding_tasks_platform_write on public.organization_onboarding_tasks
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy invitations_platform_select on public.organization_invitations
    for select to authenticated using (public.is_platform_staff());
create policy invitations_platform_write on public.organization_invitations
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy support_tickets_org_access on public.support_tickets
    for select to authenticated using (public.is_org_member(organization_id));
create policy support_tickets_org_insert on public.support_tickets
    for insert to authenticated with check (public.is_org_member(organization_id) and requester_user_id = auth.uid());
create policy support_tickets_platform_select on public.support_tickets
    for select to authenticated using (public.is_platform_staff());
create policy support_tickets_platform_insert on public.support_tickets
    for insert to authenticated with check (public.is_platform_staff());
create policy support_tickets_platform_update on public.support_tickets
    for update to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());
create policy support_tickets_platform_write on public.support_tickets
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy support_ticket_messages_org_access on public.support_ticket_messages
    for select to authenticated using (
        visibility = 'client' and exists (
            select 1 from public.support_tickets t where t.id = ticket_id and public.is_org_member(t.organization_id)
        )
    );
create policy support_ticket_messages_platform_select on public.support_ticket_messages
    for select to authenticated using (public.is_platform_staff());
create policy support_ticket_messages_platform_write on public.support_ticket_messages
    for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff() and author_user_id = auth.uid());

create policy support_ticket_attachments_platform_access on public.support_ticket_attachments
    for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy platform_alerts_staff_select on public.platform_alerts
    for select to authenticated using (public.is_platform_staff());
create policy platform_alerts_admin_write on public.platform_alerts
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy platform_plans_staff_select on public.platform_plans
    for select to authenticated using (public.is_platform_staff());
create policy platform_plans_admin_write on public.platform_plans
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy subscriptions_staff_select on public.organization_subscriptions
    for select to authenticated using (public.is_platform_staff());
create policy subscriptions_admin_write on public.organization_subscriptions
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy import_jobs_org_access on public.import_jobs
    for select to authenticated using (public.is_org_member(organization_id));
create policy import_jobs_platform_select on public.import_jobs
    for select to authenticated using (public.is_platform_staff());
create policy import_jobs_platform_write on public.import_jobs
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy platform_settings_staff_select on public.platform_settings
    for select to authenticated using (public.is_platform_staff());
create policy platform_settings_admin_write on public.platform_settings
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

insert into public.platform_settings (setting_key, value, description)
values
    ('default_currency', '"USD"'::jsonb, 'Default currency for new client workspaces.'),
    ('default_timezone', '"Africa/Harare"'::jsonb, 'Default timezone for new client workspaces.'),
    ('support_sla_hours', '24'::jsonb, 'Target first-response time for normal support tickets.'),
    ('maintenance_mode', 'false'::jsonb, 'Prevent client access while platform maintenance is active.')
on conflict (setting_key) do nothing;
