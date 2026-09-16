-- Manual subscription management for platform billing while no payment gateway is connected.

alter table public.organization_subscriptions
    add column if not exists billing_cycle text not null default 'monthly',
    add column if not exists current_period_starts_on date,
    add column if not exists paused_at timestamptz,
    add column if not exists paused_by uuid references auth.users(id) on delete set null;

alter table public.organization_subscriptions
    drop constraint if exists organization_subscriptions_status_check;
alter table public.organization_subscriptions
    add constraint organization_subscriptions_status_check
    check (status in ('trial', 'active', 'past_due', 'paused', 'inactive', 'cancelled'));
alter table public.organization_subscriptions
    add constraint organization_subscriptions_billing_cycle_check
    check (billing_cycle in ('monthly', 'quarterly', 'annual'));

create table if not exists public.subscription_payments (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    plan_id uuid references public.platform_plans(id) on delete set null,
    subscription_period_start date not null,
    subscription_period_end date not null,
    billing_cycle text not null check (billing_cycle in ('monthly', 'quarterly', 'annual')),
    amount numeric(12, 2) not null check (amount >= 0),
    currency_code text not null default 'USD' check (char_length(currency_code) = 3),
    status text not null default 'paid' check (status in ('pending', 'paid', 'void')),
    paid_on date,
    payment_method text,
    reference text,
    notes text,
    recorded_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (subscription_period_end >= subscription_period_start)
);

create index if not exists subscription_payments_organization_idx
    on public.subscription_payments(organization_id, subscription_period_end desc);
create index if not exists subscription_payments_status_idx
    on public.subscription_payments(status, paid_on desc);

create trigger subscription_payments_set_updated_at
    before update on public.subscription_payments
    for each row execute function public.set_updated_at();

alter table public.subscription_payments enable row level security;
create policy subscription_payments_staff_select on public.subscription_payments
    for select to authenticated using (public.is_platform_staff());
create policy subscription_payments_admin_write on public.subscription_payments
    for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create or replace function public.refresh_expired_subscriptions(as_of date default current_date)
returns integer language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
    with expired as (
        update public.organization_subscriptions
        set status = 'inactive', updated_at = now()
        where status in ('active', 'trial', 'past_due')
          and current_period_ends_on is not null
          and current_period_ends_on < as_of
        returning organization_id
    )
    update public.organizations
    set status = 'suspended', last_activity_at = now()
    where id in (select organization_id from expired);
    get diagnostics affected = row_count;
    return affected;
end;
$$;

revoke all on function public.refresh_expired_subscriptions(date) from public, anon, authenticated;
grant execute on function public.refresh_expired_subscriptions(date) to service_role;

-- Hosted projects run this daily when pg_cron is available. The Billing page also offers a manual refresh.
do $$
begin
    if exists (select 1 from pg_extension where extname = 'pg_cron') then
        execute $job$select cron.schedule('musha-subscription-expiry', '15 0 * * *', 'select public.refresh_expired_subscriptions(current_date);')$job$;
    end if;
exception when duplicate_object or unique_violation then
    null;
end;
$$;
