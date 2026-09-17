-- Password provisioning and self-service changes are recorded without storing plaintext passwords.

create policy audit_logs_tenant_password_insert on public.audit_logs
    for insert to authenticated
    with check (
        action = 'tenant_password_changed'
        and entity_type = 'auth_user'
        and actor_user_id = auth.uid()
        and exists (
            select 1
            from public.people p
            where p.user_id = auth.uid()
              and p.organization_id = audit_logs.organization_id
              and p.person_type = 'tenant'
        )
    );
