-- Operational detail used by the client workspace. These additions keep the
-- original lightweight PMS schema, while allowing location-aware properties,
-- nested inventory (house > room > bed), and lease administration.

alter table public.properties
    add column if not exists latitude numeric(9, 6),
    add column if not exists longitude numeric(9, 6),
    add column if not exists postal_code text;

alter table public.spaces
    add column if not exists code text,
    add column if not exists floor_label text,
    add column if not exists capacity integer check (capacity is null or capacity > 0),
    add column if not exists bathrooms numeric(4, 1) check (bathrooms is null or bathrooms >= 0),
    add column if not exists area_sqm numeric(10, 2) check (area_sqm is null or area_sqm >= 0);

alter table public.people
    add column if not exists date_of_birth date,
    add column if not exists address_line_1 text,
    add column if not exists city text,
    add column if not exists country text;

alter table public.tenancies
    add column if not exists lease_reference text,
    add column if not exists rent_due_day integer check (rent_due_day is null or rent_due_day between 1 and 31),
    add column if not exists notice_period_days integer check (notice_period_days is null or notice_period_days >= 0);

create index if not exists properties_organization_location_idx
    on public.properties(organization_id, latitude, longitude);

create index if not exists spaces_parent_space_idx on public.spaces(parent_space_id);
