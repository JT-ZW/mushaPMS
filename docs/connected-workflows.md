# Connected workflow activation and acceptance checks

The implementation requires `supabase/migrations/20261027130000_connected_workflows.sql` after all existing migrations. Apply **only this new migration** to an existing installation through the Supabase SQL Editor or your established migration pipeline. The initial schema migration replaces legacy tables and must not be replayed against a populated project.

This session has application API credentials, not database SQL credentials. The migration has therefore been exercised locally against the full migration chain in PGlite, not applied to the hosted project. The Supabase-managed Auth and Storage schemas are stubs in those tests; hosted storage delivery and browser interactions still need the checks below.

## What changed

- Onboarding commits the person, lease, primary party, rent schedule, first rent charge, deposit charge, and optional deposit receipt together. A draft reserves the space; check-in marks it occupied. A failed transaction leaves none of those partial records. Retrying the same form does not create a second tenant or payment.
- Deposit received at onboarding is explicitly allocated to the deposit charge. The contracted deposit is not treated as received cash. Drafts cannot record a received deposit; activate the draft and use Finance to record it.
- Payments, automatic allocations, receipts, and queued receipt delivery commit together. Excess payment remains unallocated credit. Posted payment amounts, ownership, dates, and methods cannot be edited or deleted. Payment reversal/refund execution is not added by this change.
- Finance → Rent due → **Generate due rent invoices** runs only the current organization's enabled schedules. Re-running is safe. Custom schedules require manual charges. Ending-soon leases keep billing until actual move-out. Month-end dates retain their configured anchor.
- Lease details expose **Renewal, notice & move-out**. Extensions preserve the same lease and its audit history. Notice keeps the space occupied. Move-out requires inspection findings and deposit settlement equal to deposit allocations actually received. Outstanding charges require a collection plan and remain in the ledger.
- Maintenance moves through Reported → Triage/Assigned → In progress → Awaiting approval → Completed → Closed. Assignment needs an active resource and planned date. Submission needs resolution notes, actual cost (zero is valid), and an uploaded evidence file. Positive costs need finance/manager approval. Editing a submitted cost invalidates approval. Submitted evidence cannot be removed; return to In progress to correct it.
- Daily Operations lists overdue balances, due follow-ups, lease expiries, incomplete check-ins, urgent/SLA work, and properties without configured spaces. The notification bell refreshes every 15 seconds while visible. Read state remains device-local.
- Reports → **Audit history** shows managers the latest 100 events across all periods, including the actor and before/after values. Operational source records are paginated to avoid truncated totals. Data errors are surfaced instead of presenting zero balances.

## Deployment checks

1. Apply the new migration to a staging project first. Reload the app after it succeeds.
2. Run `npm.cmd test`, `npm.cmd run check`, and `npm.cmd run build`.
3. Use test accounts and synthetic records for the following browser checks; do not use real tenant payments as test transactions.

| Journey                                            | Expected result                                                                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Onboard into a vacant space with a partial deposit | One person/lease, occupied space, deposit balance, rent charge, deposit payment and receipt.                               |
| Save a draft then activate it                      | Reserved space while draft; first charges created once at check-in.                                                        |
| Submit the same payment again                      | Existing payment/receipt reused. A changed amount with the same key is rejected.                                           |
| Pay part of rent, then overpay                     | Partial balance first; full settlement plus unapplied credit afterwards.                                                   |
| Generate due invoices twice                        | No duplicate charges or invoices; only the current organization changes.                                                   |
| Record notice and extend a lease                   | Occupancy continues; extension clears notice; old terms visible in audit.                                                  |
| Move out with unpaid charges or held deposit       | Inspection and settlement/collection plan required; ledger preserved; space released only after successful closure.        |
| Maintenance from logging to closure                | Resource/date required; evidence uploaded; actual cost submitted; finance approval recorded before paid work is completed. |
| Viewer / maintenance / finance permissions         | Viewer cannot mutate; maintenance cannot approve costs or record payments; finance can approve costs and receipt payments. |
| Refresh dashboard and notifications                | Next actions match the underlying records; resolved work disappears from active queues.                                    |

Recurring automation still needs the existing hosted `pg_cron` job or authenticated cron endpoint configured. Notification outbox entries are queued records, not proof that email or WhatsApp was delivered. Confirm the external dispatcher separately.

Deposit refunds are settlement records; the application does not transfer money. Maintenance approval does not automatically post an expense: record the supplier bill in Finance when appropriate. Existing historical deposits without allocation records need reconciliation before the new move-out checklist can show them as held funds.
