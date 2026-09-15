-- Finance operations: charge lifecycle, utility details, expense controls,
-- collection follow-ups, and deterministic payment allocation.

alter table public.charges
    add column if not exists status text not null default 'issued',
    add column if not exists utility_provider text,
    add column if not exists utility_account_reference text,
    add column if not exists billing_period_start date,
    add column if not exists billing_period_end date,
    add column if not exists notes text;

alter table public.charges drop constraint if exists charges_status_check;
alter table public.charges add constraint charges_status_check
    check (status in ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void'));

alter table public.billing_documents drop constraint if exists billing_documents_status_check;
alter table public.billing_documents add constraint billing_documents_status_check
    check (status in ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void'));

alter table public.property_expenses
    add column if not exists payment_status text not null default 'paid',
    add column if not exists approval_status text not null default 'approved',
    add column if not exists attachment_path text;

alter table public.property_expenses drop constraint if exists property_expenses_payment_status_check;
alter table public.property_expenses add constraint property_expenses_payment_status_check
    check (payment_status in ('unpaid', 'partially_paid', 'paid', 'reimbursable'));
alter table public.property_expenses drop constraint if exists property_expenses_approval_status_check;
alter table public.property_expenses add constraint property_expenses_approval_status_check
    check (approval_status in ('pending', 'approved', 'rejected'));

create table if not exists public.collection_followups (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    tenancy_id uuid not null references public.tenancies(id) on delete cascade,
    charge_id uuid references public.charges(id) on delete set null,
    status text not null default 'open' check (status in ('open', 'promised', 'resolved', 'written_off')),
    next_action_on date,
    notes text not null,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists collection_followups_org_status_idx
    on public.collection_followups(organization_id, status, next_action_on);

alter table public.collection_followups enable row level security;
drop policy if exists collection_followups_org_select on public.collection_followups;
create policy collection_followups_org_select on public.collection_followups
    for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists collection_followups_org_write on public.collection_followups;
create policy collection_followups_org_write on public.collection_followups
    for all to authenticated using (public.is_org_finance(organization_id))
    with check (public.is_org_finance(organization_id));

drop trigger if exists collection_followups_set_updated_at on public.collection_followups;
create trigger collection_followups_set_updated_at before update on public.collection_followups
    for each row execute function public.set_updated_at();

create or replace function public.sync_charge_payment_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    target_charge_id uuid;
    charge_record record;
    allocated numeric(12, 2);
    next_status text;
begin
    target_charge_id := case when TG_OP = 'DELETE' then old.charge_id else new.charge_id end;
    select id, amount, due_on, status into charge_record
    from public.charges where id = target_charge_id;
    if not found or charge_record.status = 'void' then
        if TG_OP = 'DELETE' then return old; else return new; end if;
    end if;

    select coalesce(sum(amount), 0) into allocated
    from public.payment_allocations where charge_id = target_charge_id;
    next_status := case
        when allocated >= charge_record.amount then 'paid'
        when allocated > 0 then 'partially_paid'
        when charge_record.due_on < current_date then 'overdue'
        else 'issued'
    end;
    update public.charges set status = next_status where id = target_charge_id;
    update public.billing_documents set status = next_status
    where charge_id = target_charge_id and document_type = 'invoice' and status <> 'void';
    if TG_OP = 'DELETE' then return old; else return new; end if;
end;
$$;

create or replace function public.validate_payment_allocation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    payment_record record;
    charge_record record;
    payment_allocated numeric(12, 2);
    charge_allocated numeric(12, 2);
begin
    select id, organization_id, tenancy_id, amount into payment_record
    from public.payments where id = new.payment_id;
    select id, organization_id, tenancy_id, amount, status into charge_record
    from public.charges where id = new.charge_id;
    if payment_record.id is null or charge_record.id is null then
        raise exception 'Payment and charge are required';
    end if;
    if payment_record.organization_id <> charge_record.organization_id then
        raise exception 'Payment and charge must belong to the same organization';
    end if;
    if payment_record.tenancy_id is not null and payment_record.tenancy_id <> charge_record.tenancy_id then
        raise exception 'Payment and charge must belong to the same tenancy';
    end if;
    if charge_record.status = 'void' then
        raise exception 'Void charges cannot receive allocations';
    end if;

    select coalesce(sum(amount), 0) into payment_allocated
    from public.payment_allocations
    where payment_id = new.payment_id
      and not (payment_id = new.payment_id and charge_id = new.charge_id);
    select coalesce(sum(amount), 0) into charge_allocated
    from public.payment_allocations
    where charge_id = new.charge_id
      and not (payment_id = new.payment_id and charge_id = new.charge_id);
    if new.amount <= 0 or payment_allocated + new.amount > payment_record.amount then
        raise exception 'Payment allocation exceeds the payment balance';
    end if;
    if charge_allocated + new.amount > charge_record.amount then
        raise exception 'Payment allocation exceeds the charge balance';
    end if;
    return new;
end;
$$;

drop trigger if exists payment_allocations_validate on public.payment_allocations;
create trigger payment_allocations_validate
before insert or update on public.payment_allocations
for each row execute function public.validate_payment_allocation();

drop trigger if exists payment_allocations_sync_charge_status on public.payment_allocations;
create trigger payment_allocations_sync_charge_status
after insert or update or delete on public.payment_allocations
for each row execute function public.sync_charge_payment_status();

create or replace function public.allocate_payment_to_oldest_charges(target_payment_id uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare
    payment_record record;
    charge_record record;
    payment_remaining numeric(12, 2);
    charge_allocated numeric(12, 2);
    charge_remaining numeric(12, 2);
    allocation_amount numeric(12, 2);
    allocated_total numeric(12, 2) := 0;
begin
    select id, organization_id, tenancy_id, amount into payment_record
    from public.payments where id = target_payment_id;
    if not found then raise exception 'Payment not found'; end if;
    if not public.is_org_finance(payment_record.organization_id) then
        raise exception 'Finance access is required';
    end if;
    if payment_record.tenancy_id is null then return 0; end if;

    select payment_record.amount - coalesce(sum(amount), 0) into payment_remaining
    from public.payment_allocations where payment_id = target_payment_id;
    for charge_record in
        select id, amount, due_on from public.charges
        where tenancy_id = payment_record.tenancy_id and status not in ('draft', 'void')
        order by due_on asc, created_at asc
    loop
        exit when payment_remaining <= 0;
        select coalesce(sum(amount), 0) into charge_allocated
        from public.payment_allocations where charge_id = charge_record.id;
        charge_remaining := charge_record.amount - charge_allocated;
        if charge_remaining <= 0 then continue; end if;
        allocation_amount := least(payment_remaining, charge_remaining);
        insert into public.payment_allocations(payment_id, charge_id, amount)
        values (target_payment_id, charge_record.id, allocation_amount)
        on conflict (payment_id, charge_id) do update
        set amount = public.payment_allocations.amount + excluded.amount;
        payment_remaining := payment_remaining - allocation_amount;
        allocated_total := allocated_total + allocation_amount;
    end loop;
    return allocated_total;
end;
$$;

grant execute on function public.allocate_payment_to_oldest_charges(uuid) to authenticated;
