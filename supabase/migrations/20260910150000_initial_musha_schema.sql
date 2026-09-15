-- Musha PMS initial schema.
-- This migration intentionally replaces the legacy hotel-booking schema in this project.

create extension if not exists pgcrypto;

drop view if exists public.client_booking_summary, public.booking_details, public.room_utilization, public.hotel_revenue_summary cascade;
drop table if exists public.booking_addons, public.room_amenities, public.hotel_amenities, public.user_hotel_access,
    public.documents, public.auth_activity_log, public.activity_logs, public.bookings, public.rooms, public.clients,
    public.event_types, public.addons, public.amenities, public.hotel_booking_sequences, public.hotel_document_sequences,
    public.hotels, public.users cascade;

create table public.organizations (
    id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
    currency_code text not null default 'USD' check (char_length(currency_code) = 3),
    timezone text not null default 'Africa/Harare', created_by uuid not null references auth.users(id) on delete restrict,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.organization_members (
    organization_id uuid not null references public.organizations(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'manager' check (role in ('owner', 'admin', 'manager', 'finance', 'maintenance', 'viewer')),
    created_at timestamptz not null default now(), primary key (organization_id, user_id)
);

create table public.properties (
    id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
    name text not null, code text, address_line_1 text, address_line_2 text, city text, country text,
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.spaces (
    id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
    property_id uuid not null references public.properties(id) on delete cascade, parent_space_id uuid references public.spaces(id) on delete cascade,
    name text not null, kind text not null default 'unit' check (kind in ('unit', 'room', 'bed', 'office', 'shop', 'listing')),
    status text not null default 'vacant' check (status in ('vacant', 'occupied', 'reserved', 'maintenance', 'inactive')),
    bedrooms integer check (bedrooms is null or bedrooms >= 0), monthly_rent numeric(12, 2) check (monthly_rent is null or monthly_rent >= 0),
    deposit_amount numeric(12, 2) check (deposit_amount is null or deposit_amount >= 0),
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.people (
    id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
    person_type text not null default 'tenant' check (person_type in ('tenant', 'guardian', 'supplier', 'contact')),
    first_name text not null, last_name text not null, email text, phone text, id_number text, notes text,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.tenancies (
    id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
    space_id uuid not null references public.spaces(id) on delete restrict, start_date date not null, end_date date,
    status text not null default 'draft' check (status in ('draft', 'active', 'ending_soon', 'expired', 'terminated', 'completed')),
    rent_amount numeric(12, 2) not null check (rent_amount >= 0), deposit_amount numeric(12, 2) not null default 0 check (deposit_amount >= 0),
    billing_frequency text not null default 'monthly' check (billing_frequency in ('weekly', 'monthly', 'quarterly', 'annual', 'custom')),
    notes text, move_in_at timestamptz, move_out_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
    check (end_date is null or end_date >= start_date)
);

create table public.tenancy_parties (
    tenancy_id uuid not null references public.tenancies(id) on delete cascade, person_id uuid not null references public.people(id) on delete restrict,
    role text not null default 'primary' check (role in ('primary', 'occupant', 'guardian', 'emergency_contact')),
    created_at timestamptz not null default now(), primary key (tenancy_id, person_id)
);

create table public.charge_schedules (
    id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
    tenancy_id uuid not null references public.tenancies(id) on delete cascade, description text not null default 'Rent',
    amount numeric(12, 2) not null check (amount >= 0), frequency text not null default 'monthly' check (frequency in ('weekly', 'monthly', 'quarterly', 'annual', 'custom')),
    due_day integer check (due_day is null or due_day between 1 and 31), next_due_on date, active boolean not null default true,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.charges (
    id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
    tenancy_id uuid not null references public.tenancies(id) on delete restrict, charge_type text not null default 'rent' check (charge_type in ('rent', 'deposit', 'utility', 'fee', 'other')),
    description text not null, amount numeric(12, 2) not null check (amount >= 0), due_on date not null, created_at timestamptz not null default now()
);

create table public.payments (
    id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
    tenancy_id uuid references public.tenancies(id) on delete set null, payer_person_id uuid references public.people(id) on delete set null,
    amount numeric(12, 2) not null check (amount > 0), payment_date date not null default current_date,
    method text not null default 'manual' check (method in ('manual', 'bank_transfer', 'cash', 'mobile_money', 'card', 'other')),
    reference text, notes text, created_at timestamptz not null default now()
);

create table public.payment_allocations (
    payment_id uuid not null references public.payments(id) on delete cascade, charge_id uuid not null references public.charges(id) on delete restrict,
    amount numeric(12, 2) not null check (amount > 0), created_at timestamptz not null default now(), primary key (payment_id, charge_id)
);

create table public.maintenance_requests (
    id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
    property_id uuid not null references public.properties(id) on delete restrict, space_id uuid references public.spaces(id) on delete set null,
    reporter_person_id uuid references public.people(id) on delete set null, assigned_user_id uuid references auth.users(id) on delete set null,
    title text not null, description text, priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
    status text not null default 'reported' check (status in ('reported', 'triage', 'assigned', 'in_progress', 'awaiting_approval', 'completed', 'closed')),
    estimated_cost numeric(12, 2) check (estimated_cost is null or estimated_cost >= 0), actual_cost numeric(12, 2) check (actual_cost is null or actual_cost >= 0),
    completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.maintenance_updates (
    id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
    request_id uuid not null references public.maintenance_requests(id) on delete cascade, author_user_id uuid references auth.users(id) on delete set null,
    body text not null, status text, created_at timestamptz not null default now()
);

create table public.documents (
    id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
    property_id uuid references public.properties(id) on delete cascade, space_id uuid references public.spaces(id) on delete cascade,
    person_id uuid references public.people(id) on delete cascade, tenancy_id uuid references public.tenancies(id) on delete cascade,
    document_type text not null, file_name text not null, storage_path text not null, mime_type text, file_size integer, expires_on date,
    uploaded_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);

create table public.audit_logs (
    id bigint generated always as identity primary key, organization_id uuid not null references public.organizations(id) on delete cascade,
    actor_user_id uuid references auth.users(id) on delete set null, action text not null, entity_type text not null, entity_id uuid,
    metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index properties_organization_idx on public.properties(organization_id);
create index spaces_organization_idx on public.spaces(organization_id);
create index spaces_property_idx on public.spaces(property_id);
create index people_organization_idx on public.people(organization_id);
create index tenancies_organization_idx on public.tenancies(organization_id);
create index tenancies_space_idx on public.tenancies(space_id);
create index charges_organization_due_idx on public.charges(organization_id, due_on);
create index payments_organization_date_idx on public.payments(organization_id, payment_date);
create index maintenance_organization_status_idx on public.maintenance_requests(organization_id, status);
create index audit_logs_organization_created_idx on public.audit_logs(organization_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger properties_set_updated_at before update on public.properties for each row execute function public.set_updated_at();
create trigger spaces_set_updated_at before update on public.spaces for each row execute function public.set_updated_at();
create trigger people_set_updated_at before update on public.people for each row execute function public.set_updated_at();
create trigger tenancies_set_updated_at before update on public.tenancies for each row execute function public.set_updated_at();
create trigger charge_schedules_set_updated_at before update on public.charge_schedules for each row execute function public.set_updated_at();
create trigger maintenance_requests_set_updated_at before update on public.maintenance_requests for each row execute function public.set_updated_at();

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.organization_members where organization_id = target_organization_id and user_id = auth.uid());
$$;
grant execute on function public.is_org_member(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.properties enable row level security;
alter table public.spaces enable row level security;
alter table public.people enable row level security;
alter table public.tenancies enable row level security;
alter table public.tenancy_parties enable row level security;
alter table public.charge_schedules enable row level security;
alter table public.charges enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.maintenance_updates enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;

create policy organizations_select on public.organizations for select to authenticated using (public.is_org_member(id) or created_by = auth.uid());
create policy organizations_insert on public.organizations for insert to authenticated with check (created_by = auth.uid());
create policy organizations_update on public.organizations for update to authenticated using (public.is_org_member(id)) with check (public.is_org_member(id));
create policy organization_members_select on public.organization_members for select to authenticated using (user_id = auth.uid() or public.is_org_member(organization_id));
create policy organization_members_insert on public.organization_members for insert to authenticated with check (user_id = auth.uid() or public.is_org_member(organization_id));
create policy organization_members_update on public.organization_members for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy organization_members_delete on public.organization_members for delete to authenticated using (public.is_org_member(organization_id));

create policy properties_org_access on public.properties for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy spaces_org_access on public.spaces for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy people_org_access on public.people for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy tenancies_org_access on public.tenancies for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy charge_schedules_org_access on public.charge_schedules for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy charges_org_access on public.charges for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy payments_org_access on public.payments for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy maintenance_requests_org_access on public.maintenance_requests for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy maintenance_updates_org_access on public.maintenance_updates for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy documents_org_access on public.documents for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy audit_logs_org_access on public.audit_logs for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy tenancy_parties_org_access on public.tenancy_parties for all to authenticated using (exists (select 1 from public.tenancies t where t.id = tenancy_id and public.is_org_member(t.organization_id))) with check (exists (select 1 from public.tenancies t where t.id = tenancy_id and public.is_org_member(t.organization_id)));
create policy payment_allocations_org_access on public.payment_allocations for all to authenticated using (exists (select 1 from public.payments p where p.id = payment_id and public.is_org_member(p.organization_id))) with check (exists (select 1 from public.payments p where p.id = payment_id and public.is_org_member(p.organization_id)));
