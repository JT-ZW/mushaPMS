-- Property-scoped administration and individually leased student bed spaces.
alter table public.organization_members drop constraint organization_members_role_check;
alter table public.organization_members add constraint organization_members_role_check
 check(role in ('owner','admin','manager','finance','maintenance','viewer','estate_manager'));
create table public.property_manager_assignments(
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 property_id uuid not null references public.properties(id) on delete cascade,
 primary key(organization_id,user_id,property_id),
 foreign key(organization_id,user_id) references public.organization_members(organization_id,user_id) on delete cascade
);
alter table public.property_manager_assignments enable row level security;
create policy assignments_read on public.property_manager_assignments for select to authenticated
 using(public.is_org_manager(organization_id) or user_id=auth.uid());
alter table public.people add column home_property_id uuid references public.properties(id);

create function private.is_estate_manager(org uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from organization_members where organization_id=org and user_id=auth.uid() and role='estate_manager');
$$;
create function private.property_access(org uuid,property uuid) returns boolean language sql stable security definer set search_path=public as $$
 select not private.is_estate_manager(org) or exists(select 1 from property_manager_assignments a
 where a.organization_id=org and a.user_id=auth.uid() and a.property_id=property);
$$;
create function private.estate_scope(org uuid,kind text,row_data jsonb) returns boolean
language plpgsql stable security definer set search_path=public as $$
declare property uuid; lease uuid; person uuid; request uuid; entity text;
begin
 if not private.is_estate_manager(org) then return true; end if;
 if kind='properties' then property:=(row_data->>'id')::uuid;
 elsif kind in ('spaces','property_expenses','maintenance_requests','maintenance_plans') then property:=nullif(row_data->>'property_id','')::uuid;
 elsif kind='tenancies' then select property_id into property from spaces where id=(row_data->>'space_id')::uuid;
 elsif kind in ('charges','charge_schedules','payments','billing_documents','collection_followups','documents','tenancy_parties') then
   lease:=nullif(row_data->>'tenancy_id','')::uuid;
   select s.property_id into property from tenancies t join spaces s on s.id=t.space_id where t.id=lease;
   if property is null and kind='documents' then property:=nullif(row_data->>'property_id','')::uuid; end if;
   if property is null and kind='documents' and nullif(row_data->>'person_id','') is not null then
     return private.estate_scope(org,'people',jsonb_build_object('id',(row_data->>'person_id')::uuid)); end if;
 elsif kind='people' then
   person:=(row_data->>'id')::uuid;
   if nullif(row_data->>'home_property_id','') is not null and private.property_access(org,(row_data->>'home_property_id')::uuid) then return true; end if;
   return exists(select 1 from tenancy_parties tp join tenancies t on t.id=tp.tenancy_id join spaces s on s.id=t.space_id
     where tp.person_id=person and private.property_access(org,s.property_id));
 elsif kind='payment_allocations' then
   select s.property_id into property from charges c join tenancies t on t.id=c.tenancy_id join spaces s on s.id=t.space_id where c.id=(row_data->>'charge_id')::uuid;
 elsif kind in ('maintenance_updates','maintenance_attachments','maintenance_sla_reminders','maintenance_plan_runs') then
   request:=nullif(row_data->>'request_id','')::uuid;
   select property_id into property from maintenance_requests where id=request;
 elsif kind='audit_logs' then
   entity:=row_data->>'entity_type';
   if entity in ('property','properties') then property:=nullif(row_data->>'entity_id','')::uuid;
   elsif entity in ('space','spaces') then select property_id into property from spaces where id=(row_data->>'entity_id')::uuid;
   elsif entity in ('person','people') then
     return exists(select 1 from people p where p.id=(row_data->>'entity_id')::uuid and private.estate_scope(org,'people',to_jsonb(p)));
   elsif entity in ('document','documents') then
     return exists(select 1 from documents d where d.id=(row_data->>'entity_id')::uuid and private.estate_scope(org,'documents',to_jsonb(d)));
   elsif entity in ('tenancy','tenancies') then
     select s.property_id into property from tenancies t join spaces s on s.id=t.space_id where t.id=(row_data->>'entity_id')::uuid;
   elsif entity in ('maintenance_request','maintenance_requests') then select property_id into property from maintenance_requests where id=(row_data->>'entity_id')::uuid;
   elsif entity in ('payments','charges','billing_documents','property_expenses') then
     return private.estate_scope(org,entity,coalesce(row_data->'metadata'->'after','{}'::jsonb));
   end if;
 elsif kind='organization_members' then return (row_data->>'user_id')::uuid=auth.uid();
 elsif kind='support_tickets' then return (row_data->>'requester_user_id')::uuid=auth.uid();
 else return false;
 end if;
 return property is not null and private.property_access(org,property);
end; $$;
grant execute on function private.is_estate_manager(uuid),private.property_access(uuid,uuid),private.estate_scope(uuid,text,jsonb) to authenticated;
revoke all on function private.is_estate_manager(uuid),private.property_access(uuid,uuid),private.estate_scope(uuid,text,jsonb) from public,anon;

-- Restrictive policies intersect existing policies, including any legacy permissive ones.
do $$ declare table_name text; begin
 foreach table_name in array array['properties','spaces','people','tenancies','tenancy_parties','charge_schedules','charges','payments','payment_allocations',
 'property_expenses','maintenance_requests','maintenance_updates','maintenance_attachments','maintenance_plans','maintenance_plan_runs','maintenance_sla_reminders',
 'billing_documents','documents','audit_logs','organization_members','organization_invitations','notification_outbox','support_tickets'] loop
   if table_name in ('tenancy_parties','payment_allocations') then
     execute format('create policy estate_scope on public.%I as restrictive for all to authenticated using (private.estate_scope((select organization_id from public.%I where id=%I),%L,to_jsonb(%I.*))) with check (private.estate_scope((select organization_id from public.%I where id=%I),%L,to_jsonb(%I.*)))',
       table_name,case when table_name='tenancy_parties' then 'tenancies' else 'charges' end,case when table_name='tenancy_parties' then 'tenancy_id' else 'charge_id' end,table_name,table_name,
       case when table_name='tenancy_parties' then 'tenancies' else 'charges' end,case when table_name='tenancy_parties' then 'tenancy_id' else 'charge_id' end,table_name,table_name);
   else
     execute format('create policy estate_scope on public.%I as restrictive for all to authenticated using(private.estate_scope(organization_id,%L,to_jsonb(%I.*))) with check(private.estate_scope(organization_id,%L,to_jsonb(%I.*)))',table_name,table_name,table_name,table_name,table_name);
   end if;
 end loop;
 -- Operational write rights; restrictive scope above always applies.
 foreach table_name in array array['properties','spaces','people','tenancies','tenancy_parties','charge_schedules','charges','payments','payment_allocations','documents','property_expenses','maintenance_requests','maintenance_updates','maintenance_attachments','maintenance_plans','maintenance_plan_runs','maintenance_sla_reminders','billing_documents','collection_followups'] loop
   if table_name='tenancy_parties' then
     execute format('create policy estate_operate on public.%I for all to authenticated using(exists(select 1 from tenancies where id=tenancy_id and private.is_estate_manager(organization_id))) with check(exists(select 1 from tenancies where id=tenancy_id and private.is_estate_manager(organization_id)))',table_name);
   elsif table_name='payment_allocations' then
     execute format('create policy estate_operate on public.%I for all to authenticated using(exists(select 1 from charges where id=charge_id and private.is_estate_manager(organization_id))) with check(exists(select 1 from charges where id=charge_id and private.is_estate_manager(organization_id)))',table_name);
   else
     execute format('create policy estate_operate on public.%I for all to authenticated using(private.is_estate_manager(organization_id)) with check(private.is_estate_manager(organization_id))',table_name);
   end if;
 end loop;
end $$;
create policy estate_scope on public.collection_followups as restrictive for all to authenticated
 using(private.estate_scope(organization_id,'collection_followups',to_jsonb(collection_followups.*)))
 with check(private.estate_scope(organization_id,'collection_followups',to_jsonb(collection_followups.*)));

create function public.assign_estate_manager(target_org uuid,target_user uuid,properties uuid[])
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_org_manager(target_org) then raise exception 'Portfolio manager access required'; end if;
 if not exists(select 1 from organizations where id=target_org and status not in ('suspended','archived')) then raise exception 'Workspace is not active'; end if;
 if coalesce(cardinality(properties),0)<1 then raise exception 'Assign at least one property'; end if;
 perform 1 from organization_members where organization_id=target_org and user_id=target_user and role<>'owner' for update;
 if not found then raise exception 'Choose an existing non-owner team member'; end if;
 if exists(select 1 from unnest(properties) p where not exists(select 1 from public.properties where id=p and organization_id=target_org)) then raise exception 'Every property must belong to this portfolio'; end if;
 update organization_members set role='estate_manager' where organization_id=target_org and user_id=target_user;
 delete from property_manager_assignments where organization_id=target_org and user_id=target_user;
 insert into property_manager_assignments select distinct target_org,target_user,p from unnest(properties) p;
 insert into audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
 values(target_org,auth.uid(),'estate_manager_assigned','organization_member',target_user,jsonb_build_object('properties',properties));
end; $$;
revoke all on function public.assign_estate_manager(uuid,uuid,uuid[]) from public,anon;
grant execute on function public.assign_estate_manager(uuid,uuid,uuid[]) to authenticated;
create function private.require_estate_assignment() returns trigger language plpgsql security definer set search_path=public as $$
declare org uuid; actor uuid;
begin
 org:=coalesce(new.organization_id,old.organization_id); actor:=coalesce(new.user_id,old.user_id);
 if exists(select 1 from organization_members where organization_id=org and user_id=actor and role='estate_manager')
   and not exists(select 1 from property_manager_assignments where organization_id=org and user_id=actor) then raise exception 'An estate manager must have at least one assigned property'; end if;
 return null;
end; $$;
create constraint trigger estate_assignment_required after insert or update on public.organization_members deferrable initially deferred for each row execute function private.require_estate_assignment();
create constraint trigger estate_assignment_retained after delete or update on public.property_manager_assignments deferrable initially deferred for each row execute function private.require_estate_assignment();

alter table public.properties add column module_key text not null default 'residential' check(module_key in ('residential','commercial','student','short_stay'));
create table public.academic_terms(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations(id) on delete cascade,
 name text not null,start_on date not null,end_on date not null,due_on date not null,check(end_on>=start_on),unique(organization_id,name)
);
alter table public.academic_terms enable row level security;
create policy terms_read on public.academic_terms for select to authenticated using(public.is_org_member(organization_id));
create policy terms_write on public.academic_terms for all to authenticated using(public.is_org_manager(organization_id)) with check(public.is_org_manager(organization_id));
alter table public.tenancies add column academic_term_id uuid references academic_terms(id);
alter table public.tenancies drop constraint tenancies_billing_frequency_check;
alter table public.tenancies add constraint tenancies_billing_frequency_check check(billing_frequency in ('monthly','weekly','quarterly','annual','custom','termly'));
alter table public.charge_schedules drop constraint charge_schedules_frequency_check;
alter table public.charge_schedules add constraint charge_schedules_frequency_check check(frequency in ('monthly','weekly','quarterly','annual','custom','termly'));

create function public.create_student_room(target_property uuid,room_name text,bed_count integer,rent numeric,deposit numeric)
returns uuid language plpgsql security definer set search_path=public as $$
declare p record; room uuid; i integer;
begin
 select * into p from properties where id=target_property for update;
 if not found or not (public.is_org_manager(p.organization_id) or private.is_estate_manager(p.organization_id))
   or not private.property_access(p.organization_id,p.id) then raise exception 'Property access required'; end if;
 if p.status<>'active' or not exists(select 1 from organizations where id=p.organization_id and status not in ('suspended','archived')) then raise exception 'Choose an active property in an active workspace'; end if;
 if p.module_key<>'student' or not exists(select 1 from organization_modules where organization_id=p.organization_id and module_key='student') then raise exception 'Enable student accommodation and select a student property'; end if;
 if nullif(trim(room_name),'') is null or bed_count not between 1 and 100 or rent<0 or deposit<0 or rent is null or deposit is null then raise exception 'Enter room name, 1-100 beds and non-negative amounts'; end if;
 insert into spaces(organization_id,property_id,name,kind,capacity) values(p.organization_id,p.id,room_name,'room',bed_count) returning id into room;
 for i in 1..bed_count loop
   insert into spaces(organization_id,property_id,parent_space_id,name,kind,capacity,monthly_rent,deposit_amount)
    values(p.organization_id,p.id,room,room_name||' / Bed '||i,'bed',1,rent,deposit);
 end loop;
 return room;
end; $$;
revoke all on function public.create_student_room(uuid,text,integer,numeric,numeric) from public,anon;
grant execute on function public.create_student_room(uuid,text,integer,numeric,numeric) to authenticated;

-- Tenant billing is always attached to one individually allocatable bed for student properties.
create function private.student_lease_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare s record; term record;
begin
 select s1.*,p.module_key into s from spaces s1 join properties p on p.id=s1.property_id where s1.id=new.space_id;
 if s.module_key='student' and (s.kind<>'bed' or s.parent_space_id is null) then raise exception 'Allocate each student to an individual bed in a room'; end if;
 if s.module_key='student' and exists(select 1 from spaces where id=s.parent_space_id and status in ('inactive','maintenance')) then raise exception 'The student room is unavailable'; end if;
 if new.billing_frequency='termly' then
   select * into term from academic_terms where id=new.academic_term_id and organization_id=new.organization_id;
   if not found or s.module_key<>'student' then raise exception 'Choose an academic term for a student lease'; end if;
   if new.start_date>term.end_on or new.end_date is null or new.end_date<term.start_on then raise exception 'Lease dates must overlap the selected academic term'; end if;
 end if;
 return new;
end; $$;
create trigger student_lease_guard before insert or update on public.tenancies for each row execute function private.student_lease_guard();

create function private.student_inventory_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare module text; parent record; count_beds integer;
begin
 select module_key into module from properties where id=new.property_id and organization_id=new.organization_id;
 if TG_OP='UPDATE' and new.status in ('vacant','inactive','maintenance') and exists(select 1 from tenancies where space_id=new.id and status in ('active','ending_soon','draft')) then
   raise exception 'Release the lease before changing an allocated bed status'; end if;
 if TG_OP='UPDATE' and new.status='inactive' and exists(select 1 from spaces child join tenancies t on t.space_id=child.id where child.parent_space_id=new.id and t.status in ('active','ending_soon','draft')) then
   raise exception 'A room with allocated students cannot be deactivated'; end if;
 if module<>'student' then return new; end if;
 if new.kind='room' then
   if new.parent_space_id is not null or new.capacity is null or new.capacity<1 then raise exception 'Student rooms need a positive capacity and no parent'; end if;
   if (select count(*) from spaces where parent_space_id=new.id and status<>'inactive')>new.capacity then raise exception 'Room capacity cannot be lower than its configured bed places'; end if;
 elsif new.kind='bed' then
   select * into parent from spaces where id=new.parent_space_id and property_id=new.property_id and organization_id=new.organization_id and kind='room' for update;
   if not found then raise exception 'Student beds must belong to a room in the same property'; end if;
   select count(*) into count_beds from spaces where parent_space_id=parent.id and id<>new.id and status<>'inactive';
   if new.status<>'inactive' and count_beds>=parent.capacity then raise exception 'Room capacity reached'; end if;
   new.capacity:=1;
 else raise exception 'Student inventory uses rooms and individual bed places'; end if;
 return new;
end; $$;
create trigger student_inventory_guard before insert or update on public.spaces for each row execute function private.student_inventory_guard();
create function private.student_property_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.module_key='student' then new.rental_mode:='room_by_room'; end if;
 if new.module_key='student' and not exists(select 1 from organization_modules where organization_id=new.organization_id and module_key='student') then
   raise exception 'Student accommodation must be enabled for this workspace'; end if;
 return new;
end; $$;
create trigger student_property_guard before insert or update on public.properties for each row execute function private.student_property_guard();

-- Patch existing transactional workflows in-place, retaining their tested validation and atomicity.
do $$ declare definition text; signature regprocedure; begin
 foreach signature in array array['public.onboard_tenant(uuid,jsonb)'::regprocedure,'public.save_lease_terms(uuid,uuid,jsonb)'::regprocedure,'public.transition_lease(uuid,uuid,text,jsonb)'::regprocedure] loop
   definition:=pg_get_functiondef(signature);
   definition:=replace(definition,'public.is_org_manager(target_org)','(public.is_org_manager(target_org) or private.is_estate_manager(target_org))');
   if signature='public.onboard_tenant(uuid,jsonb)'::regprocedure then
     definition:=replace(definition,'SECURITY INVOKER','SECURITY DEFINER');
     -- pg_get_functiondef omits SECURITY INVOKER when it is the default.
     definition:=replace(definition,'LANGUAGE plpgsql','LANGUAGE plpgsql SECURITY DEFINER');
     definition:=replace(definition,'if found then return lease_id; end if;',
       'if found then if not exists(select 1 from tenancies t join spaces s on s.id=t.space_id where t.id=lease_id and private.property_access(target_org,s.property_id)) then raise exception ''Submission access required''; end if; return lease_id; end if;');
     definition:=replace(definition,'if not found then raise exception ''Choose a space in an active property''; end if;',
       'if not found or not private.property_access(target_org,space_record.property_id) then raise exception ''Choose an assigned active property''; end if;');
     definition:=replace(definition,'notes,onboarding_key)','notes,onboarding_key,academic_term_id)');
     definition:=replace(definition,'city,country,notes)','city,country,notes,home_property_id)');
     definition:=replace(definition,'nullif(payload->>''person_notes'','''')) returning id into person_id_value;',
       'nullif(payload->>''person_notes'',''''),space_record.property_id) returning id into person_id_value;');
     definition:=replace(definition,'(payload->>''submission_key'')::uuid) returning id into lease_id;','(payload->>''submission_key'')::uuid,nullif(payload->>''academic_term_id'','''')::uuid) returning id into lease_id;');
     if position('private.property_access(target_org,space_record.property_id)' in definition)=0 then raise exception 'Unsupported onboarding function: property scope patch did not apply'; end if;
   end if;
   if signature='public.save_lease_terms(uuid,uuid,jsonb)'::regprocedure then
     definition:=replace(definition,'billing_frequency=payload->>''billing_frequency'',','academic_term_id=nullif(payload->>''academic_term_id'','''')::uuid,billing_frequency=payload->>''billing_frequency'',');
   end if;
   execute definition;
 end loop;
 -- Finance and maintenance helpers confer operational permissions, never team/settings rights.
 foreach signature in array array['private.is_org_finance(uuid)'::regprocedure,'private.is_org_maintenance(uuid)'::regprocedure] loop
   definition:=pg_get_functiondef(signature);
   definition:=replace(definition,'''manager'',','''manager'', ''estate_manager'',');
   if position('estate_manager' in definition)=0 then raise exception 'Unsupported permission function'; end if;
   execute definition;
 end loop;
 -- Definer functions must explicitly scope records because RLS does not restrict the definer.
 definition:=pg_get_functiondef('public.issue_workspace_receipt(uuid,uuid)'::regprocedure);
 definition:=replace(definition,'if not found then raise exception ''Payment not found''; end if;',
   'if not found or not private.estate_scope(target_org,''payments'',to_jsonb(payment_record)) then raise exception ''Payment not found''; end if;');
 if position('private.estate_scope(target_org' in definition)=0 then raise exception 'Unsupported receipt function'; end if; execute definition;
 definition:=pg_get_functiondef('public.approve_maintenance_cost(uuid,uuid)'::regprocedure);
 definition:=replace(definition,'and status=''awaiting_approval''','and private.property_access(target_org,property_id) and status=''awaiting_approval''');
 if position('private.property_access(target_org,property_id)' in definition)=0 then raise exception 'Unsupported maintenance approval function'; end if;execute definition;
 definition:=pg_get_functiondef('public.allocate_payment_to_oldest_charges(uuid)'::regprocedure);
 definition:=replace(definition,'if payment_record.tenancy_id is null then return 0; end if;',
   'if not private.estate_scope(payment_record.organization_id,''payments'',to_jsonb(payment_record)) then raise exception ''Payment access required''; end if; if payment_record.tenancy_id is null then return 0; end if;');
 if position('private.estate_scope(payment_record.organization_id' in definition)=0 then raise exception 'Unsupported allocation function'; end if;execute definition;
 definition:=pg_get_functiondef('private.generate_rent_invoices(date,uuid)'::regprocedure);
 definition:=replace(definition,'where cs.active','where cs.active and private.property_access(cs.organization_id,(select property_id from spaces where id=t.space_id))');
 definition:=replace(definition,'cs.frequency <> ''custom''','cs.frequency not in (''custom'',''termly'')');
 if position('where cs.active and private.property_access' in definition)=0 then raise exception 'Unsupported rent generator'; end if;execute definition;
end $$;

-- Term charges are explicit, one per lease/academic term, never inferred as three calendar months.
create function public.bill_academic_term(target_lease uuid,target_term uuid)
returns uuid language plpgsql security invoker set search_path=public as $$
declare t record; term record; charge uuid;
begin
 select * into t from tenancies where id=target_lease for update;
 if not found or not public.is_org_finance(t.organization_id) then raise exception 'Lease access required'; end if;
 select * into term from academic_terms where id=target_term and organization_id=t.organization_id;
 if not found or t.billing_frequency<>'termly' or t.status not in ('active','ending_soon') or t.start_date>term.end_on or t.end_date<term.start_on then raise exception 'Choose a term overlapping an active termly lease'; end if;
 insert into charges(organization_id,tenancy_id,charge_type,description,amount,due_on,status,automation_key,billing_period_start,billing_period_end)
 values(t.organization_id,t.id,'rent',term.name||' accommodation',t.rent_amount,term.due_on,'issued','term:'||t.id||':'||term.id,term.start_on,term.end_on)
 on conflict(automation_key) where automation_key is not null do update set automation_key=excluded.automation_key returning id into charge;
 return charge;
end; $$;
revoke all on function public.bill_academic_term(uuid,uuid) from public,anon;
grant execute on function public.bill_academic_term(uuid,uuid) to authenticated;

do $$ declare definition text; begin
 definition:=pg_get_functiondef('public.onboard_tenant(uuid,jsonb)'::regprocedure);
 definition:=replace(definition,'first_due<start_on','(first_due<start_on and payload->>''billing_frequency''<>''termly'')');
 definition:=replace(definition,'if rent>0 then','if rent>0 and payload->>''billing_frequency''<>''termly'' then');
 definition:=replace(definition,'    return lease_id;',
   '    if checked_in and payload->>''billing_frequency''=''termly'' then perform public.bill_academic_term(lease_id,(payload->>''academic_term_id'')::uuid); end if; return lease_id;');
 execute definition;
 definition:=pg_get_functiondef('public.save_lease_terms(uuid,uuid,jsonb)'::regprocedure);
 definition:=replace(definition,'if schedule_record.amount>0 then','if schedule_record.amount>0 and payload->>''billing_frequency''<>''termly'' then');
 definition:=replace(definition,'    return target_lease;',
   '    if next_status in (''active'',''ending_soon'') and payload->>''billing_frequency''=''termly'' then perform public.bill_academic_term(target_lease,(payload->>''academic_term_id'')::uuid); end if; return target_lease;');
 execute definition;
end $$;

create function private.estate_storage_access(bucket text,path text) returns boolean
language plpgsql stable security definer set search_path=public as $$
declare org uuid; record_id uuid;
begin
 begin org:=split_part(path,'/',1)::uuid; record_id:=nullif(split_part(path,'/',2),'')::uuid;
 exception when invalid_text_representation then return false; end;
 if not private.is_estate_manager(org) then return true; end if;
 if bucket='organization-assets' then return true;
 elsif bucket='maintenance-attachments' then return exists(select 1 from maintenance_requests where id=record_id and private.property_access(org,property_id));
 elsif bucket='tenant-documents' then
   if exists(select 1 from documents where storage_path=path) then
     return exists(select 1 from documents d where storage_path=path and private.estate_scope(org,'documents',to_jsonb(d)));
   end if;
   return private.estate_scope(org,'people',jsonb_build_object('id',record_id));
 elsif bucket='support-ticket-attachments' then return exists(select 1 from support_tickets where id=record_id and requester_user_id=auth.uid());
 end if;
 return false;
end; $$;
grant execute on function private.estate_storage_access(text,text) to authenticated;
revoke all on function private.estate_storage_access(text,text) from public,anon;
create policy estate_storage_scope on storage.objects as restrictive for all to authenticated
 using(private.estate_storage_access(bucket_id,name)) with check(private.estate_storage_access(bucket_id,name));
create policy estate_support_attachments on public.support_ticket_attachments as restrictive for all to authenticated
 using(exists(select 1 from support_tickets t where t.id=ticket_id)) with check(exists(select 1 from support_tickets t where t.id=ticket_id));
create policy estate_vendor_write_guard on public.maintenance_vendors as restrictive for insert to authenticated with check(not private.is_estate_manager(organization_id));
create policy estate_vendor_update_guard on public.maintenance_vendors as restrictive for update to authenticated using(not private.is_estate_manager(organization_id));
create policy estate_vendor_delete_guard on public.maintenance_vendors as restrictive for delete to authenticated using(not private.is_estate_manager(organization_id));
do $$ declare table_name text; begin
 foreach table_name in array array['import_jobs','whatsapp_conversations','subscription_payments','organization_subscriptions','organization_success_profiles','organization_feature_flags','organization_onboarding_tasks'] loop
   execute format('create policy estate_global_guard on public.%I as restrictive for all to authenticated using(not private.is_estate_manager(organization_id)) with check(not private.is_estate_manager(organization_id))',table_name);
 end loop;
end $$;
create policy estate_import_rows on public.import_rows as restrictive for all to authenticated
 using(exists(select 1 from import_jobs where id=import_job_id)) with check(exists(select 1 from import_jobs where id=import_job_id));
create policy estate_support_messages on public.support_ticket_messages as restrictive for all to authenticated
 using(exists(select 1 from support_tickets where id=ticket_id)) with check(exists(select 1 from support_tickets where id=ticket_id));

-- Prevent linking a hidden person into a visible lease to circumvent person scope.
create function private.estate_reference_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare org uuid;
begin
 if TG_TABLE_NAME='tenancy_parties' then
   select organization_id into org from tenancies where id=new.tenancy_id;
   if new.role in ('primary','occupant') and exists(select 1 from tenancies t join spaces s on s.id=t.space_id join properties p on p.id=s.property_id where t.id=new.tenancy_id and p.module_key='student')
     and exists(select 1 from tenancy_parties where tenancy_id=new.tenancy_id and person_id<>new.person_id and role in ('primary','occupant')) then
       raise exception 'Each student bed has one individual student; allocate other students to separate beds'; end if;
   if private.is_estate_manager(org) and not exists(select 1 from people p where p.id=new.person_id and p.organization_id=org and private.estate_scope(org,'people',to_jsonb(p))) then
     raise exception 'Person access required'; end if;
 elsif TG_TABLE_NAME='people' then
   if new.home_property_id is not null and not exists(select 1 from properties where id=new.home_property_id and organization_id=new.organization_id) then raise exception 'Person and property must belong to the same portfolio'; end if;
 end if;
 return new;
end; $$;
create trigger estate_party_reference before insert or update on public.tenancy_parties for each row execute function private.estate_reference_guard();
create trigger estate_person_reference before insert or update on public.people for each row execute function private.estate_reference_guard();
revoke all on function public.refresh_maintenance_sla_reminders() from public,anon,authenticated;
grant execute on function public.refresh_maintenance_sla_reminders() to service_role;
notify pgrst,'reload schema';

create policy estate_whatsapp_messages on public.whatsapp_messages as restrictive for all to authenticated using(exists(select 1 from whatsapp_conversations where id=conversation_id)) with check(exists(select 1 from whatsapp_conversations where id=conversation_id));
