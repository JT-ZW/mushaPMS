-- Connected workflows: atomic onboarding/receipting, controlled lifecycle, and audit evidence.
-- Existing records are retained. New closure requirements apply to new transitions only.
alter table public.tenancies
    add column if not exists notice_given_on date,
    add column if not exists expected_move_out_on date,
    add column if not exists inspection_notes text,
    add column if not exists deposit_refund_amount numeric(12,2),
    add column if not exists deposit_deduction_amount numeric(12,2),
    add column if not exists settlement_notes text;
alter table public.payments add column if not exists submission_key uuid;
create unique index if not exists payments_submission_key_idx
    on public.payments(organization_id, submission_key) where submission_key is not null;
alter table public.tenancies add column if not exists onboarding_key uuid;
create unique index if not exists tenancies_onboarding_key_idx
    on public.tenancies(organization_id, onboarding_key) where onboarding_key is not null;
alter table public.maintenance_requests
    add column if not exists cost_approved_by uuid references auth.users(id),
    add column if not exists cost_approved_at timestamptz;

create or replace function public.onboard_tenant(target_org uuid, payload jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
    person_id_value uuid; lease_id uuid; space_record record; settings_record record;
    start_on date := (payload->>'start_date')::date;
    first_due date := (payload->>'first_due_on')::date;
    checked_in boolean := coalesce((payload->>'checked_in')::boolean, false);
    rent numeric := (payload->>'rent_amount')::numeric;
    deposit numeric := coalesce((payload->>'deposit_amount')::numeric,0);
    received numeric := coalesce((payload->>'deposit_received')::numeric,0);
    deposit_charge uuid; deposit_payment uuid; local_today date;
begin
    if not public.is_org_manager(target_org) then raise exception 'Manager access required'; end if;
    if not exists(select 1 from organizations where id=target_org and status not in ('suspended','archived')) then raise exception 'Workspace is not active'; end if;
    select (now() at time zone timezone)::date into local_today from organizations where id=target_org;
    -- The same row lock serializes competing assignments and retry keys.
    select s.* into space_record from spaces s join properties p on p.id=s.property_id
      where s.id=(payload->>'space_id')::uuid and s.organization_id=target_org
        and p.organization_id=target_org and p.status='active' for update of s;
    if not found then raise exception 'Choose a space in an active property'; end if;
    select id into lease_id from tenancies where organization_id=target_org
      and onboarding_key=(payload->>'submission_key')::uuid;
    if found then return lease_id; end if;
    if space_record.status <> 'vacant' or exists(select 1 from spaces where parent_space_id=space_record.id and status<>'inactive')
      or exists(select 1 from tenancies where space_id=space_record.id and status in ('draft','active','ending_soon'))
      then raise exception 'This rentable space is no longer available'; end if;
    if nullif(trim(payload->>'first_name'),'') is null or nullif(trim(payload->>'last_name'),'') is null
      or start_on is null or first_due is null or first_due<start_on or rent is null or rent<0 or deposit<0 or received<0 or received>deposit
      then raise exception 'Valid tenant, lease, and deposit amounts are required'; end if;
    if checked_in and start_on>local_today then raise exception 'Check-in cannot be in the future'; end if;
    if not checked_in and received>0 then raise exception 'Record the deposit when checking in'; end if;
    select * into settings_record from organization_workspace_settings where organization_id=target_org;
    insert into people(organization_id,person_type,first_name,last_name,email,phone,id_number,date_of_birth,address_line_1,city,country,notes)
      values(target_org,'tenant',payload->>'first_name',payload->>'last_name',nullif(payload->>'email',''),nullif(payload->>'phone',''),
      nullif(payload->>'id_number',''),nullif(payload->>'date_of_birth','')::date,nullif(payload->>'address_line_1',''),
      nullif(payload->>'city',''),nullif(payload->>'country',''),nullif(payload->>'person_notes','')) returning id into person_id_value;
    insert into tenancies(organization_id,space_id,lease_reference,start_date,end_date,status,rent_amount,deposit_amount,
      billing_frequency,rent_due_day,notice_period_days,move_in_at,notes,onboarding_key)
      values(target_org,space_record.id,nullif(payload->>'lease_reference',''),start_on,nullif(payload->>'end_date','')::date,
      case when checked_in then 'active' else 'draft' end,rent,deposit,payload->>'billing_frequency',
      nullif(payload->>'rent_due_day','')::integer,(payload->>'notice_period_days')::integer,
      case when checked_in then now() end,nullif(payload->>'lease_notes',''),(payload->>'submission_key')::uuid) returning id into lease_id;
    insert into tenancy_parties(tenancy_id,person_id,role) values(lease_id,person_id_value,'primary');
    insert into charge_schedules(organization_id,tenancy_id,description,amount,frequency,due_day,next_due_on,active,auto_invoice,invoice_lead_days)
      values(target_org,lease_id,'Rent',rent,payload->>'billing_frequency',nullif(payload->>'rent_due_day','')::integer,
      first_due,checked_in,coalesce(settings_record.auto_generate_rent_invoices,true),coalesce(settings_record.default_invoice_lead_days,7));
    if checked_in then
      update spaces set status='occupied' where id=space_record.id;
      if deposit>0 then
        insert into charges(organization_id,tenancy_id,charge_type,description,amount,due_on,status,automation_key)
          values(target_org,lease_id,'deposit','Security deposit',deposit,start_on,'issued','deposit:'||lease_id) returning id into deposit_charge;
      end if;
      if received>0 then
        -- Always allocate the deposit to its own charge, never to rent.
        deposit_payment:=public.record_workspace_payment(target_org,jsonb_build_object(
          'tenancy_id',lease_id,'payer_person_id',person_id_value,'amount',received,'payment_date',local_today,
          'method',coalesce(nullif(payload->>'deposit_method',''),'manual'),'reference',payload->>'deposit_reference',
          'auto_allocate',false,'generate_receipt',true,'submission_key',gen_random_uuid()));
        insert into payment_allocations(payment_id,charge_id,amount) values(deposit_payment,deposit_charge,received);
      end if;
      -- First charge is created now; the recurring generator shares this exact key.
      if rent>0 then
        insert into charges(organization_id,tenancy_id,charge_type,description,amount,due_on,status,charge_schedule_id,automation_key)
          select target_org,lease_id,'rent','Rent',rent,first_due,'issued',id,'rent:'||id||':'||first_due
          from charge_schedules where tenancy_id=lease_id and description='Rent';
      end if;
    end if;
    return lease_id;
end; $$;
revoke all on function public.onboard_tenant(uuid,jsonb) from public, anon;
grant execute on function public.onboard_tenant(uuid,jsonb) to authenticated;

-- A payment, its allocations and receipt commit together. Retry keys prevent double receipts.
create or replace function public.record_workspace_payment(target_org uuid, payload jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare payment_id_value uuid; lease_id uuid := nullif(payload->>'tenancy_id','')::uuid;
    person_id_value uuid := nullif(payload->>'payer_person_id','')::uuid;
    amount_value numeric := (payload->>'amount')::numeric;
    paid_on date := (payload->>'payment_date')::date;
    settings_record record; org_record record;
begin
    if not public.is_org_finance(target_org) then raise exception 'Finance access required'; end if;
    if not exists(select 1 from organizations where id=target_org and status not in ('suspended','archived')) then raise exception 'Workspace is not active'; end if;
    perform pg_advisory_xact_lock(hashtextextended(target_org::text||coalesce(payload->>'submission_key',''),0));
    select id into payment_id_value from payments where organization_id=target_org and submission_key=(payload->>'submission_key')::uuid;
    if found then
      if not exists(select 1 from payments where id=payment_id_value and amount=amount_value and payment_date=paid_on
        and tenancy_id is not distinct from lease_id) then raise exception 'This submission already recorded a different payment. Refresh before entering a new payment'; end if;
      return payment_id_value;
    end if;
    select * into org_record from organizations where id=target_org;
    if amount_value is null or amount_value<=0 or paid_on is null or paid_on>(now() at time zone org_record.timezone)::date
      then raise exception 'Enter a positive payment and a date no later than today'; end if;
    if lease_id is not null and not exists(select 1 from tenancies where id=lease_id and organization_id=target_org)
      then raise exception 'Lease does not belong to this organization'; end if;
    if person_id_value is not null and not exists(select 1 from people where id=person_id_value and organization_id=target_org)
      then raise exception 'Payer does not belong to this organization'; end if;
    if lease_id is not null and person_id_value is not null and not exists(select 1 from tenancy_parties where tenancy_id=lease_id and person_id=person_id_value)
      then raise exception 'Choose a payer linked to this lease'; end if;
    if person_id_value is null and lease_id is not null then
      select person_id into person_id_value from tenancy_parties where tenancy_id=lease_id and role='primary' limit 1;
    end if;
    insert into payments(organization_id,tenancy_id,payer_person_id,amount,payment_date,method,reference,notes,submission_key)
      values(target_org,lease_id,person_id_value,amount_value,paid_on,coalesce(nullif(payload->>'method',''),'manual'),
      nullif(payload->>'reference',''),nullif(payload->>'notes',''),(payload->>'submission_key')::uuid) returning id into payment_id_value;
    if lease_id is not null and coalesce((payload->>'auto_allocate')::boolean,false) then
      perform public.allocate_payment_to_oldest_charges(payment_id_value);
    end if;
    if coalesce((payload->>'generate_receipt')::boolean,true) then
      perform public.issue_workspace_receipt(target_org,payment_id_value);
    end if;
    return payment_id_value;
end; $$;
revoke all on function public.record_workspace_payment(uuid,jsonb) from public, anon;
grant execute on function public.record_workspace_payment(uuid,jsonb) to authenticated;

create or replace function public.issue_workspace_receipt(target_org uuid,target_payment uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare payment_record record; receipt_id uuid; settings_record record; currency text; recipient text;
begin
 if not public.is_org_finance(target_org) then raise exception 'Finance access required'; end if;
    if not exists(select 1 from organizations where id=target_org and status not in ('suspended','archived')) then raise exception 'Workspace is not active'; end if;
 select * into payment_record from payments where id=target_payment and organization_id=target_org for update;
 if not found then raise exception 'Payment not found'; end if;
 select id into receipt_id from billing_documents where payment_id=target_payment and document_type='receipt' and status<>'void' limit 1;
 if found then return receipt_id; end if;
 select * into settings_record from organization_workspace_settings where organization_id=target_org;
 select currency_code into currency from organizations where id=target_org;
 insert into billing_documents(organization_id,document_type,document_number,tenancy_id,person_id,payment_id,issue_date,status,currency_code,subtotal,total_amount,line_items,created_by,automation_key)
   values(target_org,'receipt',coalesce(settings_record.receipt_prefix,'RCT')||'-'||payment_record.payment_date||'-'||target_payment,
    payment_record.tenancy_id,payment_record.payer_person_id,target_payment,payment_record.payment_date,'paid',currency,payment_record.amount,payment_record.amount,
    jsonb_build_array(jsonb_build_object('description',coalesce(payment_record.reference,'Payment'),'quantity',1,'amount',payment_record.amount)),auth.uid(),'receipt:'||target_payment)
   returning id into receipt_id;
 select email into recipient from people where id=payment_record.payer_person_id and organization_id=target_org;
 if coalesce(settings_record.send_payment_receipts,true) and nullif(recipient,'') is not null then
   insert into notification_outbox(organization_id,recipient_address,channel,event_type,payload,idempotency_key)
    values(target_org,recipient,'email','payment_receipt_issued',jsonb_build_object('payment_id',target_payment,'receipt_id',receipt_id,'amount',payment_record.amount),'receipt:'||target_payment)
    on conflict(idempotency_key) do nothing;
 end if;
 return receipt_id;
end; $$;
revoke all on function public.issue_workspace_receipt(uuid,uuid) from public,anon;
grant execute on function public.issue_workspace_receipt(uuid,uuid) to authenticated;

-- Enforce the same maintenance rules for every client, including direct API writes.
create or replace function public.guard_maintenance_workflow()
returns trigger language plpgsql security definer set search_path=public as $$
begin
    if new.vendor_id is not null and not exists(select 1 from maintenance_vendors where id=new.vendor_id and organization_id=new.organization_id and status='active')
      then raise exception 'Choose an active vendor in this organization'; end if;
    if new.space_id is not null and not exists(select 1 from spaces where id=new.space_id and property_id=new.property_id and organization_id=new.organization_id)
      then raise exception 'The space must belong to the selected property'; end if;
    if TG_OP='INSERT' then
      new.cost_approved_by:=null; new.cost_approved_at:=null;
      if new.status<>'reported' then raise exception 'New work must start as reported'; end if;
      return new;
    end if;
    if old.status in ('completed','closed') and (new.actual_cost is distinct from old.actual_cost
      or new.resolution_notes is distinct from old.resolution_notes) then
      raise exception 'Completed evidence and approved costs are immutable; record a follow-up job for corrections'; end if;
    if new.actual_cost is distinct from old.actual_cost then
      new.cost_approved_by:=null; new.cost_approved_at:=null;
    elsif new.cost_approved_by is distinct from old.cost_approved_by or new.cost_approved_at is distinct from old.cost_approved_at then
      if not public.is_org_finance(new.organization_id) then raise exception 'Finance or manager approval required'; end if;
      new.cost_approved_by:=auth.uid(); new.cost_approved_at:=now();
    end if;
    if new.status is distinct from old.status then
      if not ((old.status='reported' and new.status in ('triage','assigned'))
        or (old.status='triage' and new.status='assigned')
        or (old.status='assigned' and new.status='in_progress')
        or (old.status='in_progress' and new.status='awaiting_approval')
        or (old.status='awaiting_approval' and new.status in ('in_progress','completed'))
        or (old.status='completed' and new.status='closed'))
        then raise exception 'Invalid maintenance transition: % to %',old.status,new.status; end if;
      if new.status in ('assigned','in_progress') and (new.vendor_id is null or new.scheduled_for is null)
        then raise exception 'Assign a resource and planned date before starting'; end if;
      if new.status in ('awaiting_approval','completed','closed') then
        if nullif(trim(new.resolution_notes),'') is null or new.actual_cost is null then
          raise exception 'Record resolution evidence and actual cost (zero if no cost)'; end if;
        if not exists(select 1 from maintenance_attachments where request_id=new.id)
          then raise exception 'Upload completion evidence before submitting the work'; end if;
      end if;
      if new.status in ('completed','closed') and new.actual_cost>0 and new.cost_approved_at is null
        then raise exception 'Approve the actual cost before completing this work'; end if;
      if new.status in ('completed','closed') then new.completed_at:=coalesce(old.completed_at,now()); end if;
    end if;
    return new;
end; $$;
create trigger maintenance_workflow_guard before insert or update on public.maintenance_requests
  for each row execute function public.guard_maintenance_workflow();

create or replace function public.protect_completion_evidence()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from maintenance_requests where id=old.request_id and status in ('awaiting_approval','completed','closed')) then
   raise exception 'Submitted completion evidence cannot be removed. Return the work to in progress before correcting evidence'; end if;
 if TG_OP='UPDATE' then return new; end if;
 return old;
end; $$;
create trigger submitted_evidence_immutable before delete or update on public.maintenance_attachments for each row execute function public.protect_completion_evidence();

-- Storage access cannot bypass the evidence metadata guard.
create policy submitted_maintenance_files_protected on storage.objects as restrictive
  for delete to authenticated using (
    bucket_id <> 'maintenance-attachments' or not exists (
      select 1 from maintenance_attachments a join maintenance_requests m on m.id=a.request_id
      where a.storage_path=name and m.status in ('awaiting_approval','completed','closed')
    )
  );

-- Append-only audit evidence generated in the same transaction as the mutation.
create or replace function public.audit_connected_workflow()
returns trigger language plpgsql security definer set search_path=public as $$
declare before_row jsonb := case when TG_OP='INSERT' then '{}'::jsonb else to_jsonb(old) end;
begin
    insert into audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
      values(new.organization_id,auth.uid(),lower(TG_OP)||'_'||TG_TABLE_NAME,TG_TABLE_NAME,new.id,
        jsonb_build_object('before',before_row-'notes'-'inspection_notes'-'settlement_notes',
          'after',to_jsonb(new)-'notes'-'inspection_notes'-'settlement_notes'));
    return new;
end; $$;
create trigger connected_tenancies_audit after insert or update on public.tenancies for each row execute function public.audit_connected_workflow();
create trigger connected_payments_audit after insert or update on public.payments for each row execute function public.audit_connected_workflow();
create trigger connected_maintenance_audit after insert or update on public.maintenance_requests for each row execute function public.audit_connected_workflow();

-- Existing allocation validation is made concurrency-safe and rejects drafts as well as voids.
create or replace function public.lock_allocation_balances()
returns trigger language plpgsql security definer set search_path=public as $$
begin
    perform 1 from payments where id=new.payment_id for update;
    perform 1 from charges where id=new.charge_id for update;
    if exists(select 1 from charges where id=new.charge_id and status in ('draft','void')) then
      raise exception 'Only issued charges can receive payments'; end if;
    return new;
end; $$;
create trigger allocations_00_lock before insert or update on public.payment_allocations for each row execute function public.lock_allocation_balances();

create or replace function public.transition_lease(target_org uuid, target_lease uuid, operation text, payload jsonb)
returns uuid language plpgsql security invoker set search_path=public as $$
declare lease_record record; local_today date; balance numeric; held numeric; refund numeric; deduction numeric;
begin
    if not public.is_org_manager(target_org) then raise exception 'Manager access required'; end if;
    if not exists(select 1 from organizations where id=target_org and status not in ('suspended','archived')) then raise exception 'Workspace is not active'; end if;
    select * into lease_record from tenancies where id=target_lease and organization_id=target_org for update;
    if not found then raise exception 'Lease not found'; end if;
    select (now() at time zone timezone)::date into local_today from organizations where id=target_org;
    if lease_record.status not in ('active','ending_soon') then raise exception 'Only a current lease can be renewed, given notice or closed'; end if;
    if operation='notice' then
      if (payload->>'expected_move_out_on')::date<local_today or nullif(payload->>'expected_move_out_on','') is null then
        raise exception 'Choose an expected move-out date on or after today'; end if;
      update tenancies set status='ending_soon',notice_given_on=local_today,
        expected_move_out_on=(payload->>'expected_move_out_on')::date where id=target_lease;
    elsif operation='renew' then
      if nullif(payload->>'end_date','') is null or (payload->>'end_date')::date<=greatest(coalesce(lease_record.end_date,local_today),local_today)
        then raise exception 'Renewal must extend the existing lease beyond today'; end if;
      -- Keep the same lease and financial history; the audit stores the previous terms.
      update tenancies set end_date=(payload->>'end_date')::date,status='active',notice_given_on=null,
        expected_move_out_on=null where id=target_lease;
    elsif operation='move_out' then
      if nullif(payload->>'move_out_date','') is null or (payload->>'move_out_date')::date<lease_record.start_date
        or (payload->>'move_out_date')::date>local_today then raise exception 'Choose a valid move-out date no later than today'; end if;
      if nullif(trim(payload->>'inspection_notes'),'') is null then raise exception 'Record the move-out inspection'; end if;
      select coalesce(sum(greatest(c.amount-coalesce(a.paid,0),0)),0) into balance from charges c
        left join lateral(select sum(amount) paid from payment_allocations where charge_id=c.id) a on true
        where c.tenancy_id=target_lease and c.status not in ('draft','void');
      if balance>0 and nullif(trim(payload->>'settlement_notes'),'') is null then
        raise exception 'Outstanding charges remain. Record the agreed collection plan before closing'; end if;
      select coalesce(sum(a.amount),0) into held from payment_allocations a join charges c on c.id=a.charge_id
        where c.tenancy_id=target_lease and c.charge_type='deposit' and c.status not in ('draft','void');
      refund:=coalesce((payload->>'deposit_refund_amount')::numeric,0);
      deduction:=coalesce((payload->>'deposit_deduction_amount')::numeric,0);
      if refund<0 or deduction<0 or refund+deduction<>held then
        raise exception 'Deposit refund plus deductions must equal the recorded deposit received (%)',held; end if;
      if (refund>0 or deduction>0) and nullif(trim(payload->>'settlement_notes'),'') is null then
        raise exception 'Record the deposit settlement reference and deduction reasons'; end if;
      update tenancies set status='completed',end_date=(payload->>'move_out_date')::date,
        move_out_at=(payload->>'move_out_date')::date::timestamptz,inspection_notes=payload->>'inspection_notes',
        deposit_refund_amount=refund,deposit_deduction_amount=deduction,settlement_notes=payload->>'settlement_notes'
        where id=target_lease;
      update charge_schedules set active=false where tenancy_id=target_lease;
      update spaces set status='vacant' where id=lease_record.space_id
        and not exists(select 1 from tenancies where space_id=lease_record.space_id and id<>target_lease and status in ('draft','active','ending_soon'));
    else raise exception 'Unknown lease operation'; end if;
    return target_lease;
end; $$;
revoke all on function public.transition_lease(uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.transition_lease(uuid,uuid,text,jsonb) to authenticated;

-- All API paths share occupancy and closure safeguards, including the legacy editor.
create or replace function public.guard_lease_workflow()
returns trigger language plpgsql security definer set search_path=public as $$
declare space_record record; local_today date; held numeric; unpaid numeric;
begin
    select * into space_record from spaces where id=new.space_id for update;
    if space_record.organization_id<>new.organization_id then raise exception 'Lease and space must belong to the same organization'; end if;
    if new.status in ('draft','active','ending_soon') then
      if exists(select 1 from tenancies where space_id=new.space_id and id<>new.id and status in ('draft','active','ending_soon'))
        then raise exception 'This space already has a current or draft lease'; end if;
      if exists(select 1 from spaces where parent_space_id=new.space_id and status<>'inactive')
        then raise exception 'Choose a terminal rentable space, not a subdivided parent'; end if;
    end if;
    select (now() at time zone timezone)::date into local_today from organizations where id=new.organization_id;
    if new.status in ('active','ending_soon') and new.start_date>local_today then raise exception 'Cannot check in before the lease starts'; end if;
    if TG_OP='UPDATE' then
      if old.status in ('completed','terminated') and new.status<>old.status then raise exception 'Closed leases cannot be reopened; create a new lease'; end if;
      if old.status in ('active','ending_soon') and new.status in ('draft','expired') then raise exception 'Use the move-out workflow to release an occupied space'; end if;
      if old.status is distinct from new.status and new.status in ('completed','terminated')
        and (new.move_out_at is null or nullif(trim(new.inspection_notes),'') is null
          or new.deposit_refund_amount is null or new.deposit_deduction_amount is null) then
          raise exception 'Use the move-out checklist to inspect and settle this lease'; end if;
      if old.status is distinct from new.status and new.status in ('completed','terminated') then
        if new.move_out_at::date<new.start_date or new.move_out_at::date>local_today then raise exception 'Invalid move-out date'; end if;
        select coalesce(sum(a.amount),0) into held from payment_allocations a join charges c on c.id=a.charge_id
          where c.tenancy_id=new.id and c.charge_type='deposit' and c.status not in ('draft','void');
        if new.deposit_refund_amount<0 or new.deposit_deduction_amount<0 or new.deposit_refund_amount+new.deposit_deduction_amount<>held
          then raise exception 'Deposit settlement must match recorded deposit received'; end if;
        select coalesce(sum(greatest(c.amount-coalesce(a.paid,0),0)),0) into unpaid from charges c
          left join lateral(select sum(amount) paid from payment_allocations where charge_id=c.id) a on true
          where c.tenancy_id=new.id and c.status not in ('draft','void');
        if (held>0 or unpaid>0) and nullif(trim(new.settlement_notes),'') is null then raise exception 'Record the settlement and collection plan'; end if;
      end if;
    end if;
    return new;
end; $$;
create trigger lease_workflow_guard before insert or update on public.tenancies for each row execute function public.guard_lease_workflow();

create or replace function public.save_lease_terms(target_org uuid, target_lease uuid, payload jsonb)
returns uuid language plpgsql security invoker set search_path=public as $$
declare lease_record record; next_status text := payload->>'status'; schedule_record record;
begin
    if not public.is_org_manager(target_org) then raise exception 'Manager access required'; end if;
    if not exists(select 1 from organizations where id=target_org and status not in ('suspended','archived')) then raise exception 'Workspace is not active'; end if;
    select * into lease_record from tenancies where id=target_lease and organization_id=target_org for update;
    if not found then raise exception 'Lease not found'; end if;
    if next_status not in ('draft','active','ending_soon') then raise exception 'Use the lifecycle checklist to close a lease'; end if;
    update tenancies set status=next_status,start_date=(payload->>'start_date')::date,end_date=nullif(payload->>'end_date','')::date,
      rent_amount=(payload->>'rent_amount')::numeric,deposit_amount=coalesce(nullif(payload->>'deposit_amount','')::numeric,0),
      billing_frequency=payload->>'billing_frequency',rent_due_day=nullif(payload->>'rent_due_day','')::integer,
      notice_period_days=nullif(payload->>'notice_period_days','')::integer,
      move_in_at=case when next_status in ('active','ending_soon') then coalesce(move_in_at,now()) else move_in_at end,
      notes=nullif(payload->>'notes','') where id=target_lease;
    update charge_schedules set amount=(payload->>'rent_amount')::numeric,frequency=payload->>'billing_frequency',
      due_day=nullif(payload->>'rent_due_day','')::integer,active=next_status in ('active','ending_soon'),
      next_due_on=case when lease_record.status='draft' then coalesce(nullif(payload->>'first_due_on','')::date,(payload->>'start_date')::date) else next_due_on end
      where tenancy_id=target_lease and organization_id=target_org and description='Rent';
    if lease_record.status='draft' and next_status in ('active','ending_soon') then
      if coalesce(nullif(payload->>'deposit_amount','')::numeric,0)>0 then
        insert into charges(organization_id,tenancy_id,charge_type,description,amount,due_on,status,automation_key)
          values(target_org,target_lease,'deposit','Security deposit',(payload->>'deposit_amount')::numeric,
            (payload->>'start_date')::date,'issued','deposit:'||target_lease)
          on conflict(automation_key) where automation_key is not null do nothing;
      end if;
      select * into schedule_record from charge_schedules where tenancy_id=target_lease and description='Rent' order by created_at limit 1;
      if schedule_record.amount>0 then
        insert into charges(organization_id,tenancy_id,charge_type,description,amount,due_on,status,charge_schedule_id,automation_key)
          values(target_org,target_lease,'rent','Rent',schedule_record.amount,schedule_record.next_due_on,'issued',schedule_record.id,
            'rent:'||schedule_record.id||':'||schedule_record.next_due_on)
          on conflict(automation_key) where automation_key is not null do nothing;
      end if;
    end if;
    return target_lease;
end; $$;
revoke all on function public.save_lease_terms(uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_lease_terms(uuid,uuid,jsonb) to authenticated;

create or replace function public.sync_lease_occupancy()
returns trigger language plpgsql security definer set search_path=public as $$
begin
    if new.status in ('active','ending_soon') then update spaces set status='occupied' where id=new.space_id;
    elsif new.status='draft' then update spaces set status='reserved' where id=new.space_id;
    elsif not exists(select 1 from tenancies where space_id=new.space_id and id<>new.id and status in ('draft','active','ending_soon')) then
      update spaces set status='vacant' where id=new.space_id;
      update charge_schedules set active=false where tenancy_id=new.id;
    end if;
    return new;
end; $$;
create trigger connected_lease_occupancy after insert or update on public.tenancies for each row execute function public.sync_lease_occupancy();

create or replace function public.protect_posted_payment()
returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='DELETE' then raise exception 'Recorded payments cannot be deleted; preserve the financial history'; end if;
 if (new.organization_id,new.tenancy_id,new.payer_person_id,new.amount,new.payment_date,new.method)
    is distinct from (old.organization_id,old.tenancy_id,old.payer_person_id,old.amount,old.payment_date,old.method)
    then raise exception 'Recorded payment amounts and ownership cannot be edited'; end if;
 return new;
end; $$;
create trigger posted_payments_immutable before update or delete on public.payments for each row execute function public.protect_posted_payment();
create trigger connected_charges_audit after insert or update on public.charges for each row execute function public.audit_connected_workflow();
create trigger connected_expenses_audit after insert or update on public.property_expenses for each row execute function public.audit_connected_workflow();
create trigger connected_billing_audit after insert or update on public.billing_documents for each row execute function public.audit_connected_workflow();

-- Narrow RPC allows finance staff to approve a cost without granting broad maintenance editing.
create or replace function public.approve_maintenance_cost(target_org uuid,target_request uuid)
returns uuid language plpgsql security definer set search_path=public as $$
begin
    if not public.is_org_finance(target_org) then raise exception 'Finance approval required'; end if;
    if not exists(select 1 from organizations where id=target_org and status not in ('suspended','archived')) then raise exception 'Workspace is not active'; end if;
    update maintenance_requests set cost_approved_by=auth.uid(),cost_approved_at=now()
      where id=target_request and organization_id=target_org and status='awaiting_approval' and actual_cost is not null;
    if not found then raise exception 'Only submitted work with an actual cost can be approved'; end if;
    return target_request;
end; $$;
revoke all on function public.approve_maintenance_cost(uuid,uuid) from public,anon;
grant execute on function public.approve_maintenance_cost(uuid,uuid) to authenticated;

notify pgrst, 'reload schema';

-- Clamp each period to the configured due day, so February does not move March rent to the 28th.
create or replace function public.advance_rent_due(due_on date,months integer,due_day integer)
returns date language sql immutable set search_path=public as $$
 select (date_trunc('month',due_on)+make_interval(months=>months))::date +
 (least(coalesce(due_day,extract(day from due_on)::integer),extract(day from (date_trunc('month',due_on)+make_interval(months=>months+1)-interval '1 day'))::integer)-1);
$$;

create or replace function public.workflow_attention(target_org uuid)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare local_today date; result jsonb;
begin
 if not public.is_org_member(target_org) then raise exception 'Workspace access required'; end if;
 select (now() at time zone timezone)::date into local_today from organizations where id=target_org;
 select coalesce(jsonb_agg(to_jsonb(items) order by priority,"at"), '[]'::jsonb) into result from (
   select 'arrears:'||c.id id,c.description title,
     'Overdue: '||(c.amount-coalesce(a.paid,0))::text||' - due '||c.due_on detail,
     c.due_on::text||'T00:00:00Z' as "at",'finance' section,1 priority
     from charges c left join lateral(select sum(amount) paid from payment_allocations where charge_id=c.id) a on true
     where c.organization_id=target_org and c.status not in ('draft','void') and c.due_on<local_today and c.amount>coalesce(a.paid,0)
   union all
   select 'lease:'||t.id,'Lease expiry: '||s.name,'Expires '||t.end_date||' - renew or record notice',
     t.end_date::text||'T00:00:00Z','leases',2 from tenancies t join spaces s on s.id=t.space_id
     where t.organization_id=target_org and t.status in ('active','ending_soon') and t.end_date<=local_today+90
   union all
   select 'urgent:'||m.id,m.title,'Maintenance - '||m.priority||' - '||replace(m.status,'_',' '),
     m.updated_at::text,'maintenance',0 from maintenance_requests m where m.organization_id=target_org
     and m.status not in ('completed','closed') and (m.priority='urgent' or m.sla_due_at<now() or m.status='awaiting_approval')
   union all
   select 'draft:'||t.id,'Complete tenant check-in','Draft lease - confirm terms and check-in to start billing',
     t.created_at::text,'leases',3 from tenancies t where t.organization_id=target_org and t.status='draft'
   union all
   select 'space:'||p.id,'Configure spaces: '||p.name,'Active property has no rentable spaces',p.created_at::text,'properties',3
     from properties p where p.organization_id=target_org and p.status='active'
     and not exists(select 1 from spaces s where s.property_id=p.id and s.status<>'inactive')
   union all
   select 'followup:'||f.id,'Collection follow-up due',f.notes,f.next_action_on::text||'T00:00:00Z','finance',1
     from collection_followups f where f.organization_id=target_org and f.status in ('open','promised') and f.next_action_on<=local_today
 ) items;
 return result;
end; $$;
revoke all on function public.workflow_attention(uuid) from public,anon;
grant execute on function public.workflow_attention(uuid) to authenticated;
create or replace function private.generate_rent_invoices(run_on date, target_org uuid default null)
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
          and t.status in ('active','ending_soon')
          and cs.frequency <> 'custom'
          and t.move_in_at is not null
          and o.status not in ('suspended', 'archived')
        for update of cs
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
                when schedule_record.frequency = 'monthly' then public.advance_rent_due(due_on,1,schedule_record.due_day)
                when schedule_record.frequency = 'quarterly' then public.advance_rent_due(due_on,3,schedule_record.due_day)
                when schedule_record.frequency = 'annual' then public.advance_rent_due(due_on,12,schedule_record.due_day)
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

revoke all on function private.generate_rent_invoices(date,uuid) from public, anon, authenticated;
grant execute on function private.generate_rent_invoices(date,uuid) to service_role;
create or replace function public.generate_recurring_rent_invoices(run_on date default current_date)
returns integer language sql security definer set search_path=public as $$ select private.generate_rent_invoices(run_on,null); $$;
revoke all on function public.generate_recurring_rent_invoices(date) from public,anon,authenticated;
grant execute on function public.generate_recurring_rent_invoices(date) to service_role;
create or replace function public.generate_workspace_rent(target_org uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare run_on date;
begin
 if not public.is_org_finance(target_org) then raise exception 'Finance access required'; end if;
    if not exists(select 1 from organizations where id=target_org and status not in ('suspended','archived')) then raise exception 'Workspace is not active'; end if;
 select (now() at time zone timezone)::date into run_on from organizations where id=target_org;
 return private.generate_rent_invoices(run_on,target_org);
end; $$;
revoke all on function public.generate_workspace_rent(uuid) from public,anon;
grant execute on function public.generate_workspace_rent(uuid) to authenticated;


