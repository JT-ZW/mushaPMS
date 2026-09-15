-- Property registration workflow: store how a property is intended to be rented.
-- Spaces remain the source of truth for actual rentable inventory.

alter table public.properties
    add column if not exists rental_mode text not null default 'whole_property';

update public.properties
set rental_mode = 'whole_property'
where rental_mode is null;

alter table public.properties
    drop constraint if exists properties_rental_mode_check;

alter table public.properties
    add constraint properties_rental_mode_check
    check (rental_mode in ('whole_property', 'room_by_room', 'mixed'));

comment on column public.properties.rental_mode is
    'The intended registration model: one whole property, individually rentable rooms/spaces, or a mixed arrangement.';
