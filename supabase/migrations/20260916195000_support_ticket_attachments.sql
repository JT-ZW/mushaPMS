-- Optional client evidence for support tickets: private, organization-scoped files.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'support-ticket-attachments',
    'support-ticket-attachments',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy support_ticket_attachments_org_select on public.support_ticket_attachments
    for select to authenticated
    using (
        exists (
            select 1 from public.support_tickets t
            where t.id = ticket_id and public.is_org_member(t.organization_id)
        )
    );

create policy support_ticket_attachments_org_insert on public.support_ticket_attachments
    for insert to authenticated
    with check (
        uploaded_by = auth.uid() and exists (
            select 1 from public.support_tickets t
            where t.id = ticket_id
              and t.requester_user_id = auth.uid()
              and public.is_org_member(t.organization_id)
        )
    );

create policy support_ticket_attachments_storage_org_select on storage.objects
    for select to authenticated
    using (
        bucket_id = 'support-ticket-attachments'
        and public.is_org_member(((storage.foldername(name))[1])::uuid)
    );

create policy support_ticket_attachments_storage_org_insert on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'support-ticket-attachments'
        and public.is_org_member(((storage.foldername(name))[1])::uuid)
    );

create policy support_ticket_attachments_storage_platform_select on storage.objects
    for select to authenticated
    using (bucket_id = 'support-ticket-attachments' and public.is_platform_staff());
