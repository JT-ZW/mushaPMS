# Musha PMS

Residential-first property management infrastructure built with SvelteKit and Supabase.

## Local setup

1. Copy `.env.example` to `.env` and add the Supabase project URL and anon key.
2. Install dependencies with `npm install`.
3. Start the development server with `npm run dev`.

The service-role key, if needed for server-side administration, must remain server-only and must never use a `PUBLIC_` prefix.

## Platform administrator bootstrap

The first platform administrator must be created after the user exists in Supabase Auth. Run this once through the Supabase SQL Editor, replacing the email address:

```sql
insert into public.platform_members (user_id, role, display_name)
select id, 'super_admin', 'Musha owner'
from auth.users
where email = 'owner@example.com';
```

Then visit `/login` and sign in. The `/admin` console can create organizations and optionally invite each client administrator. Platform staff are separate from client organization memberships.

## Database

The baseline schema is in `supabase/migrations/20260910150000_initial_musha_schema.sql`. It replaces the legacy hotel-booking schema and creates the organization-scoped Musha model with Row Level Security.

The platform administration layer is in `supabase/migrations/20260910160000_platform_admin_layer.sql`, the platform operations layer is in `supabase/migrations/20260910170000_platform_operations.sql`, organization access/module allocation is in `supabase/migrations/20260911120000_organization_access_and_modules.sql`, client-workspace operations are in `supabase/migrations/20260911143000_workspace_operations.sql`, client workspace settings are in `supabase/migrations/20260911152000_client_workspace_settings.sql`, maintenance operations are in `supabase/migrations/20260911165000_maintenance_operations.sql`, the follow-up maintenance extension migration is in `supabase/migrations/20260911173000_maintenance_extensions.sql`, reporting/tenant portal foundations are in `supabase/migrations/20260911180000_reporting_tenant_portal.sql`, and security hardening is in `supabase/migrations/20260912100000_security_hardening.sql`. Apply these migrations in timestamp order through the Supabase SQL Editor before using the dashboard, onboarding, client provisioning, module allocation, mapped properties, nested spaces, tenancies, collections, maintenance workflows, private maintenance attachments, vendor directory, preventive plans, reports, operating expenses, tenant portal, client team invitations, support tickets, plans, settings, imports, and health pages. The maintenance migrations create the private `maintenance-attachments` Storage bucket and its organization-scoped policies. The reporting migration adds the private `tenant-documents` bucket and tenant-scoped access policies. The extension migration also registers an hourly SLA reminder refresh when the Supabase `pg_cron` extension is enabled. The security hardening migration blocks suspended tenant access, constrains tenant maintenance writes to their leased locations, protects tenant identity scope, and validates payment allocations against both charges and receipts.

The latest security/billing foundation migration is `supabase/migrations/20260914100000_security_and_billing_foundations.sql`. Apply it after the existing ten migrations. It moves SECURITY DEFINER authorization helpers behind a private schema, adds role-aware database write policies, organization branding storage, billing documents, and the notification outbox. It also enables expiring support-session read contexts. Keep the `private` schema out of the Supabase API exposed-schema list; only `public` should be exposed to PostgREST.

Apply `supabase/migrations/20260914110000_imports_and_integrations.sql` after that migration. It adds row-level CSV validation records, a private imports bucket, and the WhatsApp conversation/message store used by the signed webhook endpoint.

Apply `supabase/migrations/20260915110000_finance_operations.sql` next, followed by `supabase/migrations/20260915120000_recurring_rent_and_tenant_lifecycle.sql`, `supabase/migrations/20260915130000_workspace_operating_controls.sql`, and `supabase/migrations/20260915140000_organization_membership_hardening.sql`. The finance migration adds charge/payment lifecycle controls, deterministic payment allocation, utility and expense fields, and collection follow-ups. The recurring-rent migration adds checked-in tenant schedules, idempotent rent charges and invoices, queued email/WhatsApp notifications, and a daily `pg_cron` job when that extension is enabled. The operating-controls migration adds workspace-level invoice, notice-period, and notification defaults. The membership-hardening migration prevents client managers from creating, promoting, or removing owner memberships.

Finally, apply `supabase/migrations/20260916195000_support_ticket_attachments.sql` to enable optional support-ticket screenshots and files. It creates the private `support-ticket-attachments` bucket and limits client uploads and viewing to their own organization while keeping files available to platform support staff.

Apply `supabase/migrations/20260916200000_manual_subscription_management.sql` after that. It adds the manual subscription-payment ledger, monthly/quarterly/annual subscription periods, pause/reactivate controls, and daily expiry handling when `pg_cron` is available.

Apply `supabase/migrations/20260916210000_platform_operations_hub.sql` next. It adds platform-managed client-success profiles, feature flags, and integration readiness records used by the Operations hub.

If `pg_cron` is unavailable, configure a trusted scheduler to send a daily `POST` request to `/api/cron/rent-invoices` with `Authorization: Bearer <CRON_SECRET>`. Set `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` in the server environment. The endpoint is intentionally server-only and rejects requests without the exact bearer secret.

When creating an organization, the platform superadmin can send an invitation, create a confirmed client administrator with a temporary password, or provision access later. Temporary passwords are sent only to Supabase Auth during account creation and are never stored in Musha or written to audit logs. Product modules are allocated separately so one organization can use Residential, Commercial, Student accommodation, Short stay/Airbnb, or any combination of them. USD and ZIG are supported organization currencies.

Suspended and archived organizations remain stored but are blocked from client-member access by the database membership function. Platform staff retain controlled support access.

For password recovery, add the application URL plus `/reset-password` to Supabase Auth → URL Configuration → Redirect URLs.

In Supabase Auth, open Authentication → Password Security and enable leaked-password protection. This is an Auth setting rather than a SQL migration, so it cannot be enabled by the database service-role key.

The migration requires database-level SQL access. A Supabase service-role API key can access application rows but cannot execute arbitrary DDL such as dropping tables or applying migrations.

## Quality checks

```sh
npm run check
npm run lint
npm run build
```
