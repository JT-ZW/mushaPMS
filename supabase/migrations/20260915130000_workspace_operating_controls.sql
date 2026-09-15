-- Workspace-level operating controls used by tenant onboarding and recurring rent automation.

alter table public.organization_workspace_settings
    add column if not exists auto_generate_rent_invoices boolean not null default true,
    add column if not exists default_invoice_lead_days integer not null default 7,
    add column if not exists default_notice_period_days integer not null default 30,
    add column if not exists send_invoice_notifications boolean not null default true,
    add column if not exists send_payment_receipts boolean not null default true;

alter table public.organization_workspace_settings
    drop constraint if exists organization_workspace_settings_invoice_lead_days_check;
alter table public.organization_workspace_settings
    add constraint organization_workspace_settings_invoice_lead_days_check
    check (default_invoice_lead_days between 0 and 90);

alter table public.organization_workspace_settings
    drop constraint if exists organization_workspace_settings_notice_period_days_check;
alter table public.organization_workspace_settings
    add constraint organization_workspace_settings_notice_period_days_check
    check (default_notice_period_days between 0 and 365);
