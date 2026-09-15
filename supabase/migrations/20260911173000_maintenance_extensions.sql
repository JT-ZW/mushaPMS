-- Follow-up migration for maintenance attachments, vendors, preventive plans and SLA reminders.
-- This is intentionally idempotent so it can be applied after either version of the
-- maintenance operations migration.

create table if not exists public.maintenance_vendors (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    business_name text not null,
    contact_name text,
    email text,
    phone text,
    specialties text[] not null default '{}',
    status text not null default 'active' check (status in ('active', 'inactive')),
    emergency_available boolean not null default false,
    hourly_rate numeric(12, 2) check (hourly_rate is null or hourly_rate >= 0),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.maintenance_requests
    add column if not exists vendor_id uuid references public.maintenance_vendors(id) on delete set null;

create table if not exists public.maintenance_plans (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    property_id uuid not null references public.properties(id) on delete cascade,
    space_id uuid references public.spaces(id) on delete set null,
    vendor_id uuid references public.maintenance_vendors(id) on delete set null,
    title text not null,
    description text,
    category text not null default 'general' check (category in ('plumbing', 'electrical', 'hvac', 'carpentry', 'landscaping', 'painting', 'flooring', 'roofing', 'security', 'appliances', 'pest_control', 'cleaning', 'general')),
    frequency_unit text not null default 'monthly' check (frequency_unit in ('weekly', 'monthly', 'quarterly', 'biannual', 'annual')),
    interval_count integer not null default 1 check (interval_count > 0),
    next_due_on date not null,
    last_run_on date,
    priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
    estimated_cost numeric(12, 2) check (estimated_cost is null or estimated_cost >= 0),
    active boolean not null default true,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.maintenance_plan_runs (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    plan_id uuid not null references public.maintenance_plans(id) on delete cascade,
    request_id uuid references public.maintenance_requests(id) on delete set null,
    scheduled_for date not null,
    generated_at timestamptz not null default now(),
    unique (plan_id, scheduled_for)
);

create table if not exists public.maintenance_attachments (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    request_id uuid not null references public.maintenance_requests(id) on delete cascade,
    uploaded_by uuid references auth.users(id) on delete set null,
    file_name text not null,
    storage_path text not null unique,
    mime_type text,
    file_size integer,
    created_at timestamptz not null default now()
);

create table if not exists public.maintenance_sla_reminders (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    request_id uuid not null references public.maintenance_requests(id) on delete cascade,
    reminder_type text not null check (reminder_type in ('due_soon', 'overdue')),
    due_at timestamptz not null,
    created_at timestamptz not null default now(),
    acknowledged_at timestamptz,
    unique (request_id, reminder_type)
);

create index if not exists maintenance_vendors_org_status_idx on public.maintenance_vendors(organization_id, status);
create index if not exists maintenance_plans_org_due_idx on public.maintenance_plans(organization_id, active, next_due_on);
create index if not exists maintenance_attachments_request_idx on public.maintenance_attachments(organization_id, request_id, created_at desc);
create index if not exists maintenance_sla_reminders_org_due_idx on public.maintenance_sla_reminders(organization_id, acknowledged_at, due_at);

alter table public.maintenance_vendors enable row level security;
alter table public.maintenance_plans enable row level security;
alter table public.maintenance_plan_runs enable row level security;
alter table public.maintenance_attachments enable row level security;
alter table public.maintenance_sla_reminders enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'maintenance_vendors' and policyname = 'maintenance_vendors_org_access') then
        create policy maintenance_vendors_org_access on public.maintenance_vendors for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'maintenance_plans' and policyname = 'maintenance_plans_org_access') then
        create policy maintenance_plans_org_access on public.maintenance_plans for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'maintenance_plan_runs' and policyname = 'maintenance_plan_runs_org_access') then
        create policy maintenance_plan_runs_org_access on public.maintenance_plan_runs for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'maintenance_attachments' and policyname = 'maintenance_attachments_org_access') then
        create policy maintenance_attachments_org_access on public.maintenance_attachments for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'maintenance_sla_reminders' and policyname = 'maintenance_sla_reminders_org_access') then
        create policy maintenance_sla_reminders_org_access on public.maintenance_sla_reminders for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
    end if;
end;
$$;

do $$
begin
    if not exists (select 1 from pg_trigger where tgname = 'maintenance_vendors_set_updated_at') then
        create trigger maintenance_vendors_set_updated_at before update on public.maintenance_vendors for each row execute function public.set_updated_at();
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'maintenance_plans_set_updated_at') then
        create trigger maintenance_plans_set_updated_at before update on public.maintenance_plans for each row execute function public.set_updated_at();
    end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('maintenance-attachments', 'maintenance-attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types, public = false;

do $$
begin
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'maintenance_attachments_storage_select') then
        create policy maintenance_attachments_storage_select on storage.objects for select to authenticated using (bucket_id = 'maintenance-attachments' and public.is_org_member(((storage.foldername(name))[1])::uuid));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'maintenance_attachments_storage_insert') then
        create policy maintenance_attachments_storage_insert on storage.objects for insert to authenticated with check (bucket_id = 'maintenance-attachments' and public.is_org_member(((storage.foldername(name))[1])::uuid));
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'maintenance_attachments_storage_delete') then
        create policy maintenance_attachments_storage_delete on storage.objects for delete to authenticated using (bucket_id = 'maintenance-attachments' and public.is_org_member(((storage.foldername(name))[1])::uuid));
    end if;
end;
$$;

create or replace function public.refresh_maintenance_sla_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
    insert into public.maintenance_sla_reminders (organization_id, request_id, reminder_type, due_at)
    select organization_id, id, case when sla_due_at <= now() then 'overdue' else 'due_soon' end, sla_due_at
    from public.maintenance_requests
    where sla_due_at is not null and status not in ('completed', 'closed') and sla_due_at <= now() + interval '24 hours'
    on conflict (request_id, reminder_type) do update set due_at = excluded.due_at;
    get diagnostics affected = row_count;
    return affected;
end;
$$;

revoke all on function public.refresh_maintenance_sla_reminders() from public, anon, authenticated;

do $$
begin
    if exists (select 1 from pg_extension where extname = 'pg_cron') then
        execute $job$select cron.schedule('musha-maintenance-sla-reminders', '0 * * * *', 'select public.refresh_maintenance_sla_reminders();')$job$;
    end if;
exception when duplicate_object or unique_violation then null;
end;
$$;
