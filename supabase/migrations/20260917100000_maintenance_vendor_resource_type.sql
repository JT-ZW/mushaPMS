-- Distinguish a property manager's internal maintenance team from external contractors.

alter table public.maintenance_vendors
    add column if not exists resource_type text not null default 'external';

alter table public.maintenance_vendors
    drop constraint if exists maintenance_vendors_resource_type_check;

alter table public.maintenance_vendors
    add constraint maintenance_vendors_resource_type_check
    check (resource_type in ('internal', 'external'));

create index if not exists maintenance_vendors_org_resource_type_idx
    on public.maintenance_vendors(organization_id, resource_type, status);
