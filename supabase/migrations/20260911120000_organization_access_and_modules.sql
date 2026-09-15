-- Organization access provisioning and product module allocation.

alter table public.organization_invitations
    add column if not exists user_id uuid references auth.users(id) on delete set null;

create table if not exists public.organization_modules (
    organization_id uuid not null references public.organizations(id) on delete cascade,
    module_key text not null check (module_key in ('residential', 'commercial', 'student', 'short_stay')),
    assigned_by uuid references auth.users(id) on delete set null,
    assigned_at timestamptz not null default now(),
    primary key (organization_id, module_key)
);

create index if not exists organization_modules_module_idx
    on public.organization_modules(module_key);

alter table public.organization_modules enable row level security;

drop policy if exists organization_modules_org_select on public.organization_modules;
create policy organization_modules_org_select on public.organization_modules
    for select to authenticated
    using (public.is_org_member(organization_id));

drop policy if exists organization_modules_platform_select on public.organization_modules;
create policy organization_modules_platform_select on public.organization_modules
    for select to authenticated
    using (public.is_platform_staff());

drop policy if exists organization_modules_platform_write on public.organization_modules;
create policy organization_modules_platform_write on public.organization_modules
    for all to authenticated
    using (public.is_platform_admin())
    with check (public.is_platform_admin());

-- Existing organizations retain their original onboarding template as the first
-- allocated module. New organizations can receive any combination of modules.
insert into public.organization_modules (organization_id, module_key)
select id, onboarding_template
from public.organizations
where onboarding_template in ('residential', 'commercial', 'student', 'short_stay')
on conflict (organization_id, module_key) do nothing;
