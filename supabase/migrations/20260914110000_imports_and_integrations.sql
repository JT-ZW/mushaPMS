-- Import validation rows and integration queues.

alter table public.import_jobs drop constraint if exists import_jobs_status_check;
alter table public.import_jobs add constraint import_jobs_status_check check (
    status in ('queued', 'processing', 'validated', 'applying', 'completed', 'completed_with_errors', 'failed')
);

create table if not exists public.import_rows (
    id uuid primary key default gen_random_uuid(),
    import_job_id uuid not null references public.import_jobs(id) on delete cascade,
    row_number integer not null,
    raw_data jsonb not null default '{}'::jsonb,
    normalized_data jsonb,
    status text not null default 'pending' check (status in ('pending', 'valid', 'invalid', 'applied', 'failed')),
    errors jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    unique (import_job_id, row_number)
);

create index if not exists import_rows_job_status_idx on public.import_rows(import_job_id, status, row_number);
alter table public.import_rows enable row level security;

create policy import_rows_platform_access on public.import_rows
    for all to authenticated
    using (public.is_platform_admin() or exists (
        select 1 from public.import_jobs j
        where j.id = import_job_id and public.is_org_member(j.organization_id)
    ))
    with check (public.is_platform_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imports', 'imports', false, 5242880, array['text/csv', 'application/csv', 'application/vnd.ms-excel'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types, public = false;

create policy imports_storage_platform_access on storage.objects
    for all to authenticated
    using (bucket_id = 'imports' and public.is_platform_admin())
    with check (bucket_id = 'imports' and public.is_platform_admin());

create table if not exists public.whatsapp_conversations (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete cascade,
    person_id uuid references public.people(id) on delete set null,
    phone_number text not null,
    status text not null default 'open' check (status in ('open', 'closed', 'blocked')),
    last_message_at timestamptz,
    created_at timestamptz not null default now(),
    unique (phone_number)
);

create table if not exists public.whatsapp_messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
    direction text not null check (direction in ('inbound', 'outbound')),
    message_type text not null default 'text',
    body text,
    provider_message_id text,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_conversation_idx on public.whatsapp_messages(conversation_id, created_at);
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
create policy whatsapp_conversations_org_select on public.whatsapp_conversations
    for select to authenticated using (public.is_platform_staff() or public.is_org_member(organization_id));
create policy whatsapp_messages_org_select on public.whatsapp_messages
    for select to authenticated using (public.is_platform_staff() or exists (
        select 1 from public.whatsapp_conversations c
        where c.id = conversation_id and public.is_org_member(c.organization_id)
    ));

-- Webhook/service-role code is the only writer for these integration tables.
