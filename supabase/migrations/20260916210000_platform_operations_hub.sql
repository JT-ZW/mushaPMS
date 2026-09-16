-- Platform-manager controls for client success, feature rollout, and integrations.

create table if not exists public.organization_success_profiles (
    organization_id uuid primary key references public.organizations(id) on delete cascade,
    account_owner uuid references auth.users(id) on delete set null,
    health_status text not null default 'healthy' check (health_status in ('healthy', 'watch', 'at_risk')),
    health_score integer not null default 100 check (health_score between 0 and 100),
    next_check_in_on date,
    renewal_due_on date,
    risk_notes text,
    updated_by uuid references auth.users(id) on delete set null,
    updated_at timestamptz not null default now()
);

create table if not exists public.platform_feature_flags (
    id uuid primary key default gen_random_uuid(),
    flag_key text not null unique check (flag_key ~ '^[a-z][a-z0-9_]{1,80}$'),
    name text not null,
    description text,
    enabled_by_default boolean not null default false,
    active boolean not null default true,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.organization_feature_flags (
    organization_id uuid not null references public.organizations(id) on delete cascade,
    feature_flag_id uuid not null references public.platform_feature_flags(id) on delete cascade,
    enabled boolean not null default true,
    updated_by uuid references auth.users(id) on delete set null,
    updated_at timestamptz not null default now(),
    primary key (organization_id, feature_flag_id)
);

create table if not exists public.platform_integrations (
    id uuid primary key default gen_random_uuid(),
    provider_key text not null unique,
    display_name text not null,
    status text not null default 'not_configured' check (status in ('connected', 'attention', 'not_configured', 'disabled')),
    detail text,
    updated_by uuid references auth.users(id) on delete set null,
    updated_at timestamptz not null default now()
);

create trigger organization_success_profiles_set_updated_at before update on public.organization_success_profiles for each row execute function public.set_updated_at();
create trigger platform_feature_flags_set_updated_at before update on public.platform_feature_flags for each row execute function public.set_updated_at();
create trigger organization_feature_flags_set_updated_at before update on public.organization_feature_flags for each row execute function public.set_updated_at();
create trigger platform_integrations_set_updated_at before update on public.platform_integrations for each row execute function public.set_updated_at();

alter table public.organization_success_profiles enable row level security;
alter table public.platform_feature_flags enable row level security;
alter table public.organization_feature_flags enable row level security;
alter table public.platform_integrations enable row level security;

create policy success_profiles_staff_select on public.organization_success_profiles for select to authenticated using (public.is_platform_staff());
create policy success_profiles_admin_write on public.organization_success_profiles for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy feature_flags_staff_select on public.platform_feature_flags for select to authenticated using (public.is_platform_staff());
create policy feature_flags_admin_write on public.platform_feature_flags for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy organization_feature_flags_staff_select on public.organization_feature_flags for select to authenticated using (public.is_platform_staff());
create policy organization_feature_flags_admin_write on public.organization_feature_flags for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy platform_integrations_staff_select on public.platform_integrations for select to authenticated using (public.is_platform_staff());
create policy platform_integrations_admin_write on public.platform_integrations for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

insert into public.platform_integrations (provider_key, display_name, status, detail)
values
    ('supabase', 'Supabase', 'connected', 'Database and storage are connected through the application.'),
    ('email', 'Email delivery', 'attention', 'Configure a provider worker to process the notification outbox.'),
    ('whatsapp', 'WhatsApp', 'attention', 'Add signed webhook credentials before enabling production delivery.')
on conflict (provider_key) do nothing;
