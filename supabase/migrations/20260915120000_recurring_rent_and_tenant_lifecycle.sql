-- Recurring rent invoicing and tenant lifecycle foundations.
-- The generator is deterministic: a schedule and due date can produce one charge
-- and one invoice only, even when a daily job catches up after an outage.

alter table public.charge_schedules
    add column if not exists auto_invoice boolean not null default true,
    add column if not exists invoice_lead_days integer not null default 7;

alter table public.organization_workspace_settings
    add column if not exists send_invoice_notifications boolean not null default true;

alter table public.charge_schedules drop constraint if exists charge_schedules_invoice_lead_days_check;
alter table public.charge_schedules add constraint charge_schedules_invoice_lead_days_check
    check (invoice_lead_days between 0 and 90);

alter table public.charges
    add column if not exists charge_schedule_id uuid references public.charge_schedules(id) on delete set null,
    add column if not exists generated_automatically boolean not null default false,
    add column if not exists automation_key text;

create unique index if not exists charges_automation_key_unique_idx
    on public.charges(automation_key)
    where automation_key is not null;

alter table public.billing_documents
    add column if not exists automation_key text;

create unique index if not exists billing_documents_automation_key_unique_idx
    on public.billing_documents(automation_key)
    where automation_key is not null;

create or replace function public.generate_recurring_rent_invoices(run_on date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    schedule_record record;
    due_on date;
    next_due_on date;
    period_end date;
    automation_key_value text;
    charge_id_value uuid;
    invoice_id uuid;
    sequence_number integer;
    document_number_value text;
    generated_count integer := 0;
    lead_days integer;
begin
    for schedule_record in
        select
            cs.id as schedule_id,
            cs.organization_id,
            cs.tenancy_id,
            cs.description,
            cs.amount,
            cs.frequency,
            cs.due_day,
            cs.next_due_on,
            cs.invoice_lead_days,
            t.start_date,
            t.end_date,
            t.status as tenancy_status,
            t.move_in_at,
            o.currency_code,
            coalesce(ows.invoice_prefix, 'INV') as invoice_prefix,
            coalesce(ows.send_invoice_notifications, true) as send_invoice_notifications,
            tenant.id as person_id,
            tenant.user_id,
            tenant.email,
            tenant.phone
        from public.charge_schedules cs
        join public.tenancies t on t.id = cs.tenancy_id
        join public.organizations o on o.id = cs.organization_id
        left join public.organization_workspace_settings ows on ows.organization_id = cs.organization_id
        left join lateral (
            select p.id, p.user_id, p.email, p.phone
            from public.tenancy_parties tp
            join public.people p on p.id = tp.person_id
            where tp.tenancy_id = cs.tenancy_id and tp.role = 'primary'
            order by tp.created_at
            limit 1
        ) tenant on true
        where cs.active
          and cs.auto_invoice
          and cs.next_due_on is not null
          and t.status = 'active'
          and t.move_in_at is not null
          and o.status not in ('suspended', 'archived')
    loop
        due_on := schedule_record.next_due_on;
        lead_days := greatest(0, least(90, coalesce(schedule_record.invoice_lead_days, 7)));
        period_end := run_on + lead_days;

        while due_on <= period_end loop
            if due_on >= schedule_record.start_date
               and (schedule_record.end_date is null or due_on <= schedule_record.end_date) then
                automation_key_value := format('rent:%s:%s', schedule_record.schedule_id, due_on);

                insert into public.charges (
                    organization_id,
                    tenancy_id,
                    charge_type,
                    description,
                    amount,
                    due_on,
                    status,
                    charge_schedule_id,
                    generated_automatically,
                    automation_key,
                    billing_period_start,
                    billing_period_end
                ) values (
                    schedule_record.organization_id,
                    schedule_record.tenancy_id,
                    'rent',
                    schedule_record.description,
                    schedule_record.amount,
                    due_on,
                    'issued',
                    schedule_record.schedule_id,
                    true,
                    automation_key_value,
                    due_on,
                    case
                        when schedule_record.frequency = 'weekly' then due_on + 6
                        when schedule_record.frequency = 'monthly' then (due_on + interval '1 month' - interval '1 day')::date
                        when schedule_record.frequency = 'quarterly' then (due_on + interval '3 months' - interval '1 day')::date
                        when schedule_record.frequency = 'annual' then (due_on + interval '1 year' - interval '1 day')::date
                        else due_on
                    end
                )
                on conflict (automation_key) where automation_key is not null do nothing
                returning id into charge_id_value;

                select id into charge_id_value
                from public.charges
                where automation_key = automation_key_value;

                if not exists (
                    select 1 from public.billing_documents
                    where automation_key = automation_key_value
                ) then
                    insert into public.organization_document_sequences(
                        organization_id, document_type, sequence_year, next_number
                    ) values (
                        schedule_record.organization_id, 'invoice', extract(year from due_on)::integer, 1
                    ) on conflict (organization_id, document_type, sequence_year) do nothing;

                    update public.organization_document_sequences
                    set next_number = next_number + 1
                    where organization_id = schedule_record.organization_id
                      and document_type = 'invoice'
                      and sequence_year = extract(year from due_on)::integer
                    returning next_number - 1 into sequence_number;

                    document_number_value := format(
                        '%s-%s-%s',
                        schedule_record.invoice_prefix,
                        extract(year from due_on)::integer,
                        lpad(sequence_number::text, 5, '0')
                    );

                    insert into public.billing_documents(
                        organization_id,
                        document_type,
                        document_number,
                        tenancy_id,
                        person_id,
                        charge_id,
                        issue_date,
                        due_date,
                        status,
                        currency_code,
                        subtotal,
                        total_amount,
                        line_items,
                        notes,
                        automation_key
                    ) values (
                        schedule_record.organization_id,
                        'invoice',
                        document_number_value,
                        schedule_record.tenancy_id,
                        schedule_record.person_id,
                        charge_id_value,
                        run_on,
                        due_on,
                        'issued',
                        schedule_record.currency_code,
                        schedule_record.amount,
                        schedule_record.amount,
                        jsonb_build_array(jsonb_build_object(
                            'description', schedule_record.description,
                            'quantity', 1,
                            'amount', schedule_record.amount
                        )),
                        format('Automatically generated %s days before the due date.', lead_days),
                        automation_key_value
                    ) returning id into invoice_id;

                    if schedule_record.send_invoice_notifications
                       and schedule_record.email is not null
                       and schedule_record.email <> '' then
                        insert into public.notification_outbox(
                            organization_id, recipient_user_id, recipient_address, channel,
                            event_type, payload, idempotency_key
                        ) values (
                            schedule_record.organization_id,
                            schedule_record.user_id,
                            schedule_record.email,
                            'email',
                            'invoice_due_soon',
                            jsonb_build_object('invoice_id', invoice_id, 'charge_id', charge_id_value, 'due_on', due_on),
                            format('invoice-email:%s', automation_key_value)
                        ) on conflict (idempotency_key) do nothing;
                    end if;
                    if schedule_record.send_invoice_notifications
                       and schedule_record.phone is not null
                       and schedule_record.phone <> '' then
                        insert into public.notification_outbox(
                            organization_id, recipient_user_id, recipient_address, channel,
                            event_type, payload, idempotency_key
                        ) values (
                            schedule_record.organization_id,
                            schedule_record.user_id,
                            schedule_record.phone,
                            'whatsapp',
                            'invoice_due_soon',
                            jsonb_build_object('invoice_id', invoice_id, 'charge_id', charge_id_value, 'due_on', due_on),
                            format('invoice-whatsapp:%s', automation_key_value)
                        ) on conflict (idempotency_key) do nothing;
                    end if;
                    generated_count := generated_count + 1;
                end if;
            end if;

            next_due_on := case
                when schedule_record.frequency = 'weekly' then due_on + interval '1 week'
                when schedule_record.frequency = 'monthly' then due_on + interval '1 month'
                when schedule_record.frequency = 'quarterly' then due_on + interval '3 months'
                when schedule_record.frequency = 'annual' then due_on + interval '1 year'
                else due_on + interval '1 month'
            end;
            if next_due_on <= due_on then
                exit;
            end if;
            due_on := next_due_on;
        end loop;

        update public.charge_schedules
        set next_due_on = due_on
        where id = schedule_record.schedule_id;
    end loop;
    return generated_count;
end;
$$;

revoke all on function public.generate_recurring_rent_invoices(date) from public, anon, authenticated;
grant execute on function public.generate_recurring_rent_invoices(date) to service_role;

-- Hosted Supabase projects with pg_cron enabled run this automatically.
-- The application cron endpoint is a fallback for projects without pg_cron.
do $$
begin
    if exists (select 1 from pg_extension where extname = 'pg_cron') then
        execute $job$select cron.schedule('musha-recurring-rent-invoices', '10 1 * * *', 'select public.generate_recurring_rent_invoices(current_date);')$job$;
    end if;
exception when duplicate_object or unique_violation then
    null;
end;
$$;
