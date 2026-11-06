# Estate managers and student accommodation

Apply `supabase/migrations/20261029100000_estate_managers_and_students.sql` after the connected-workflows migration and all earlier migrations. Only apply pending migrations; do not replay the destructive initial schema on an existing project. Hosted SQL access is required; application API keys cannot apply this migration.

## Estate managers

1. Invite the colleague through Settings → Team access using the Viewer role initially. This step uses the existing invitation workflow.
2. In **Assign an estate manager**, select the colleague and one or more properties, then save. This replaces the colleague's portfolio role with `estate_manager`.
3. Repeat the assignment form to replace their property list. At least one property is required. The database rejects removing their last property while they still hold the estate-manager role. To remove all access, remove their membership; to restore portfolio-wide access, explicitly select and save a portfolio role.

Estate managers operate the assigned properties' spaces, students/tenants, leases, charges, payments, collections, maintenance, and documents. RLS applies the same boundary to reports and direct API calls. Files and privileged receipt/allocation functions are scoped too. Payments must be linked to a lease; estate managers cannot record portfolio-wide unlinked money.

Estate managers cannot change organization settings, invite/promote colleagues, assign themselves properties, or edit the shared vendor register and academic-term catalog. They may use the shared vendor and academic-term catalogs when working on their own properties. Portfolio administrators retain full oversight. Assignment history is recorded in the audit log.

Existing tenant records stay attached to their leases. New tenants also carry their originating property scope, allowing relevant history to remain accessible after move-out. Assigning an estate manager never changes an owner's role.

## Student accommodation

The existing platform module allocator must enable `student` for the organization. The migration does not override subscription/module allocations. Once enabled, **Student accommodation** appears in workspace navigation and property registration offers the student module.

1. Register a student property through Properties → Add property.
2. In the registration wizard or Student accommodation page, create rooms with a capacity, monthly rent per student, and deposit per student. Each room creates the requested number of individually rentable bed places.
3. Add each student through the existing tenant onboarding flow, selecting a bed labelled with its room. The agreed rent is **per billing period**, not per room. Students retain separate leases, deposits, payments, documents, and check-ins.
4. Monthly rent follows the existing recurring invoice workflow. For termly billing, a portfolio administrator defines an academic term (start, end and due date), and onboarding selects that term plus the agreed per-term rent amount. The initial term charge is created at check-in.
5. Use **Bill a term** for later terms overlapping the student's lease. A lease/term pair creates one charge regardless of repeated submissions. Issue its invoice through the existing Finance invoice action. Term charges use academic dates and are excluded from the monthly recurrence engine.

The room roster shows each bed, its student, and occupied/reserved/vacant/maintenance state. House totals count beds rather than counting a parent room as another rentable place. A room cannot exceed its configured capacity. Checking out one student releases only that student's bed and leaves other allocations intact.

Term pricing is an explicitly agreed full-period amount; automatic mid-term proration is not introduced. Moving a student between rooms, resizing an existing room through a dedicated wizard, and bulk student import are outside this implementation. Existing occupied residential rooms are not automatically converted into student beds.

## Verification

`npm.cmd test` runs the complete migration chain in isolated PostgreSQL (PGlite) with Supabase-managed Auth/Storage schema stubs. Regression cases cover assignment minimums, multiple properties, hidden property records, direct allocation/receipt calls, file-scope checks, capacity limits, separate student leases, monthly/termly charges, retry safety and individual move-out. No live users, invitations, or payments are created by those tests.

After applying the migration to staging, use separate owner and estate-manager test accounts to verify property links, notifications, document downloads, report totals and assignment changes after refresh. Verify the registration modal and Student accommodation layout at mobile and desktop widths. Hosted browser and file-delivery checks remain necessary; local SQL tests do not establish them.
