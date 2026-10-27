<script lang="ts">
	import { resolve } from '$app/paths';
	import { submissionKey } from '$lib/forms/submission-key';
	import { enhance } from '$app/forms';
	import { workspaceSubmit } from '$lib/forms/workspace-submit';
	import { organizationDate, shiftMonth } from '$lib/dashboard/snapshot';
	import { chargeBalance, monetary } from '$lib/dashboard/operations';
	import MushaDatePicker from '$lib/components/MushaDatePicker.svelte';

	type Property = { id: string; name: string; city: string | null; country: string | null };
	type Space = { id: string; property_id: string; name: string; kind: string };
	type Person = { id: string; first_name: string; last_name: string; person_type: string };
	type Tenancy = {
		id: string;
		space_id: string;
		start_date: string;
		end_date: string | null;
		rent_amount: number | string;
		billing_frequency: string;
	};
	type Party = { tenancy_id: string; person_id: string; role: string };
	type Charge = {
		id: string;
		tenancy_id: string;
		charge_type: string;
		description: string;
		amount: number | string;
		due_on: string;
		status?: string;
		utility_provider?: string | null;
		utility_account_reference?: string | null;
		billing_period_start?: string | null;
		billing_period_end?: string | null;
	};
	type Payment = {
		id: string;
		tenancy_id: string | null;
		payer_person_id: string | null;
		amount: number | string;
		payment_date: string;
		method: string;
		reference: string | null;
	};
	type Allocation = { payment_id: string; charge_id: string; amount: number | string };
	type Expense = {
		id: string;
		property_id: string;
		space_id: string | null;
		vendor_id: string | null;
		category: string;
		description: string;
		amount: number | string;
		expense_date: string;
		reference: string | null;
		payment_status?: string;
		approval_status?: string;
	};
	type Vendor = { id: string; business_name: string };
	type Document = {
		id: string;
		document_type: string;
		document_number: string;
		charge_id: string | null;
		payment_id: string | null;
		issue_date: string;
		status: string;
		total_amount: number | string;
	};
	type Followup = {
		id: string;
		tenancy_id: string;
		charge_id: string | null;
		status: string;
		next_action_on: string | null;
		notes: string;
		created_at: string;
	};
	type FinanceData = {
		organization: { id: string; name: string; currency_code: string; timezone?: string };
		properties: Property[];
		spaces: Space[];
		people: Person[];
		tenancies: Tenancy[];
		parties: Party[];
		charges: Charge[];
		payments: Payment[];
		paymentAllocations: Allocation[];
		propertyExpenses: Expense[];
		maintenanceVendors: Vendor[];
		billingDocuments: Document[];
		collectionFollowups: Followup[];
	};

	const props = $props<{ data: FinanceData }>();
	const data = $derived(props.data as FinanceData);
	let tab = $state('overview');
	let dueProperty = $state('');
	let dueStatus = $state('open');
	const today = $derived(
		organizationDate(new Date(), data.organization.timezone || 'Africa/Harare')
	);
	let search = $state('');
	let propertyFilter = $state('');
	let period = $state('all');
	let paymentTenancy = $state('');
	const inPeriod = (date: string) =>
		period === 'all' ||
		(period === 'month'
			? date.startsWith(today.slice(0, 7))
			: period === 'last-month'
				? date.startsWith(shiftMonth(today.slice(0, 7), -1))
				: date >=
						new Date(Date.parse(today + 'T00:00:00Z') - 90 * 86400000).toISOString().slice(0, 10) &&
					date <= today);
	const propertyForTenancy = (id: string | null) =>
		data.spaces.find(
			(space) => space.id === data.tenancies.find((lease) => lease.id === id)?.space_id
		)?.property_id;
	const matches = (text: string) => text.toLowerCase().includes(search.toLowerCase());
	const filteredCharges = $derived(
		data.charges.filter(
			(charge) =>
				inPeriod(charge.due_on) &&
				(!propertyFilter || propertyForTenancy(charge.tenancy_id) === propertyFilter) &&
				matches(charge.description + ' ' + tenantName(charge.tenancy_id))
		)
	);
	const filteredPayments = $derived(
		data.payments.filter(
			(payment) =>
				payment.payment_date <= today &&
				inPeriod(payment.payment_date) &&
				(!propertyFilter || propertyForTenancy(payment.tenancy_id) === propertyFilter) &&
				matches(
					[
						payment.reference,
						personName(payment.payer_person_id),
						payment.tenancy_id ? tenantName(payment.tenancy_id) : ''
					].join(' ')
				)
		)
	);
	const filteredExpenses = $derived(
		data.propertyExpenses.filter(
			(expense) =>
				expense.expense_date <= today &&
				inPeriod(expense.expense_date) &&
				(!propertyFilter || expense.property_id === propertyFilter) &&
				matches(expense.description + ' ' + expense.category)
		)
	);
	const approvedExpenses = $derived(
		filteredExpenses.filter((expense) => expense.approval_status === 'approved')
	);
	const resetFilters = () => {
		search = '';
		propertyFilter = '';
		period = 'all';
	};

	const tabs = [
		{ key: 'overview', label: 'Overview' },
		{ key: 'rent-due', label: 'Rent due' },
		{ key: 'charges', label: 'Charges & invoices' },
		{ key: 'payments', label: 'Payments' },
		{ key: 'expenses', label: 'Expenses' },
		{ key: 'collections', label: 'Collections' }
	];
	const money = (amount: number | string | null | undefined) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: data.organization.currency_code
		}).format(Number(amount ?? 0));
	const amount = monetary;
	const personName = (id: string | null | undefined) => {
		const person = data.people.find((item) => item.id === id);
		return person ? `${person.first_name} ${person.last_name}` : 'Unlinked payer';
	};
	const tenantName = (id: string) => {
		const party = data.parties.find((item) => item.tenancy_id === id && item.role === 'primary');
		return party ? personName(party.person_id) : 'Tenant not linked';
	};
	const spaceName = (id: string) =>
		data.spaces.find((space) => space.id === id)?.name ?? 'Space not found';
	const propertyName = (id: string) =>
		data.properties.find((property) => property.id === id)?.name ?? 'Property not found';
	const allocatedForCharge = (id: string) =>
		data.paymentAllocations
			.filter(
				(item) =>
					item.charge_id === id &&
					data.payments.some(
						(payment) => payment.id === item.payment_id && payment.payment_date <= today
					)
			)
			.reduce((sum, item) => sum + amount(item.amount), 0);
	const outstandingForCharge = (charge: Charge) =>
		chargeBalance(charge, data.paymentAllocations, data.payments, today);
	const allocatedForPayment = (id: string) =>
		monetary(
			data.paymentAllocations
				.filter((item) => item.payment_id === id)
				.reduce((sum, item) => sum + amount(item.amount), 0)
		);
	const statusForCharge = (charge: Charge) => {
		const outstanding = outstandingForCharge(charge);
		if (charge.status === 'draft' || charge.status === 'void') return charge.status;
		if (outstanding <= 0) return 'paid';
		if (charge.due_on < today) return 'overdue';
		if (allocatedForCharge(charge.id) > 0) return 'partially_paid';
		return 'issued';
	};
	const ledgerCharges = $derived(
		filteredCharges.filter((charge) => statusForCharge(charge) !== 'void')
	);
	const activeCharges = $derived(
		ledgerCharges.filter((charge) => statusForCharge(charge) !== 'draft')
	);
	const billed = $derived(activeCharges.reduce((sum, charge) => sum + amount(charge.amount), 0));
	const allocatedCollected = $derived(
		activeCharges.reduce(
			(sum, charge) => sum + Math.min(amount(charge.amount), allocatedForCharge(charge.id)),
			0
		)
	);
	const outstanding = $derived(
		activeCharges.reduce((sum, charge) => sum + outstandingForCharge(charge), 0)
	);
	const overdue = $derived(
		activeCharges
			.filter((charge) => statusForCharge(charge) === 'overdue')
			.reduce((sum, charge) => sum + outstandingForCharge(charge), 0)
	);
	const unallocated = $derived(
		filteredPayments.reduce(
			(sum, payment) => sum + Math.max(0, amount(payment.amount) - allocatedForPayment(payment.id)),
			0
		)
	);
	const expensesTotal = $derived(
		approvedExpenses.reduce((sum, expense) => sum + amount(expense.amount), 0)
	);
	const collectionRate = $derived(
		billed ? Math.min(100, Math.round((allocatedCollected / billed) * 100)) : null
	);
	const cashReceived = $derived(
		filteredPayments.reduce((total, payment) => total + amount(payment.amount), 0)
	);
	const arrears = $derived(
		data.tenancies
			.map((tenancy) => ({
				tenancy,
				charges: activeCharges.filter((charge) => charge.tenancy_id === tenancy.id),
				balance: activeCharges
					.filter((charge) => charge.tenancy_id === tenancy.id)
					.reduce((sum, charge) => sum + outstandingForCharge(charge), 0)
			}))
			.filter((item) => item.balance > 0)
			.sort((a, b) => b.balance - a.balance)
	);
	const categoryTotal = (category: string) =>
		approvedExpenses
			.filter((expense) => expense.category === category)
			.reduce((sum, expense) => sum + amount(expense.amount), 0);
	const allIssuedCharges = $derived(
		data.charges.filter((charge) => !['draft', 'void'].includes(charge.status ?? 'issued'))
	);
	const categoryLabels: Record<string, string> = {
		rates: 'Rates and taxes',
		insurance: 'Insurance',
		utilities: 'Utilities',
		security: 'Security',
		cleaning: 'Cleaning',
		staff: 'Staff costs',
		repairs: 'Repairs',
		contractor: 'Contractors',
		management_fee: 'Management fees',
		other: 'Other'
	};
	const labelFor = (value: string) => value.replaceAll('_', ' ');
</script>

<section class="finance-workspace" aria-labelledby="finance-title">
	<div class="finance-intro">
		<div>
			<p class="eyebrow">Money desk</p>
			<h2 id="finance-title">Clear numbers. <em>Confident decisions.</em></h2>
			<p>
				Keep every charge, payment, utility bill, and property expense connected to the place and
				person it belongs to.
			</p>
		</div>
		<a class="secondary-link" href={resolve(`/workspace/${data.organization.id}/reports`)}
			>Open financial reports →</a
		>
	</div>
	<div class="finance-tabs" aria-label="Finance sections">
		{#each tabs as item (item.key)}<button
				class:active={tab === item.key}
				type="button"
				aria-pressed={tab === item.key}
				onclick={() => (tab = item.key)}>{item.label}</button
			>{/each}
	</div>

	<div class="operations-filter">
		<label class="wide-search"
			><span>Search financial records</span><input
				type="search"
				bind:value={search}
				placeholder="Tenant, description or receipt reference"
			/></label
		><label
			><span>Property</span><select bind:value={propertyFilter}
				><option value="">All properties</option
				>{#each data.properties as property (property.id)}<option value={property.id}
						>{property.name}</option
					>{/each}</select
			></label
		><label
			><span>Period</span><select bind:value={period}
				><option value="all">All recorded dates</option><option value="month">This month</option
				><option value="last-month">Last month</option><option value="90">Last 90 days</option
				></select
			></label
		><button type="button" onclick={resetFilters}>Reset</button>
	</div>
	<p class="operations-scope">
		Filters apply to summaries and charge, receipt and expense registers. Allocation options retain
		the full ledger. Amounts in {data.organization.currency_code}.
	</p>
	<div class="finance-actions">
		<button type="button" class="primary" onclick={() => (tab = 'payments')}
			>+ Record payment</button
		><button type="button" class="secondary" onclick={() => (tab = 'charges')}
			>+ Create charge</button
		><button type="button" class="secondary" onclick={() => (tab = 'expenses')}
			>+ Record expense</button
		>
	</div>

	{#if tab === 'overview'}
		<div class="metric-row">
			<div class="metric emphasis">
				<span>Billed</span><strong>{money(billed)}</strong><small
					>{activeCharges.length} charges raised</small
				>
			</div>
			<div class="metric">
				<span>Allocated to charges</span><strong>{money(allocatedCollected)}</strong><small
					>{collectionRate === null
						? 'No issued charges'
						: `${collectionRate}% of charges settled`}</small
				>
			</div>
			<div class:attention={outstanding > 0} class="metric">
				<span>Outstanding</span><strong>{money(outstanding)}</strong><small
					>{overdue ? `${money(overdue)} overdue` : 'Nothing overdue'}</small
				>
			</div>
			<div class:attention={unallocated > 0} class="metric">
				<span>Unallocated payments</span><strong>{money(unallocated)}</strong><small
					>Needs matching to a charge</small
				>
			</div>
			<div class="metric">
				<span>Approved expenses</span><strong>{money(expensesTotal)}</strong><small
					>{approvedExpenses.length} approved expense records</small
				>
			</div>
			<div class="metric">
				<span>Cash received</span><strong>{money(cashReceived)}</strong><small
					>Receipts by payment date</small
				>
			</div>
		</div>
		<div class="overview-grid">
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Collection health</p>
						<h3>Money that needs attention</h3>
						<p>Start with the largest balances, then clear any unallocated receipts.</p>
					</div>
				</div>
				{#if arrears.length === 0 && !unallocated}<div class="empty">
						<strong>Your collection ledger is clear.</strong>
						<p>New overdue balances and unmatched receipts will appear here.</p>
					</div>{:else}<div class="attention-list">
						{#each arrears.slice(0, 6) as item (item.tenancy.id)}<div>
								<span class="alert-dot">!</span>
								<div>
									<strong>{tenantName(item.tenancy.id)}</strong><small
										>{spaceName(item.tenancy.space_id)} · {item.charges.filter(
											(charge) => statusForCharge(charge) === 'overdue'
										).length
											? 'Overdue balance'
											: 'Outstanding balance'}</small
									>
								</div>
								<b>{money(item.balance)}</b>
							</div>{/each}{#if unallocated}<div>
								<span class="alert-dot neutral">?</span>
								<div>
									<strong>Unallocated receipts</strong><small
										>Match payments to the correct charges</small
									>
								</div>
								<b>{money(unallocated)}</b>
							</div>{/if}
					</div>{/if}
			</section>
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Operating costs</p>
						<h3>Where expenses are going</h3>
						<p>Track the cost of keeping each property running.</p>
					</div>
				</div>
				{#if approvedExpenses.length === 0}<div class="empty">
						<strong>No expenses recorded.</strong>
						<p>Add rates, utilities, repairs, or other operating costs.</p>
					</div>{:else}<div class="category-list">
						{#each Object.keys(categoryLabels)
							.filter((category) => categoryTotal(category) > 0)
							.sort((a, b) => categoryTotal(b) - categoryTotal(a))
							.slice(0, 6) as category (category)}<div>
								<span
									><strong>{categoryLabels[category]}</strong><small
										>{approvedExpenses.filter((expense) => expense.category === category).length} records</small
									></span
								><b>{money(categoryTotal(category))}</b>
							</div>{/each}
					</div>{/if}
			</section>
		</div>
	{:else if tab === 'rent-due'}
		<section class="panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Rent calendar</p>
					<h3>Rent due register</h3>
					<p>
						Track due rent by tenant, property, rented space, amount, and date. Use the payment desk
						to record receipts and generate receipts.
					</p>
				</div>
			</div>
			<form
				method="POST"
				action="?/generateRentCharges"
				use:enhance={workspaceSubmit}
				data-managed-feedback="true"
			>
				<button class="secondary" type="submit">Generate due rent invoices</button>
				<p class="muted">
					Uses enabled recurring schedules and the invoice lead period. Re-running does not
					duplicate invoices.
				</p>
			</form>
			<div class="due-filters">
				<select bind:value={dueProperty}
					><option value="">All properties</option
					>{#each data.properties as property (property.id)}<option value={property.id}
							>{property.name}</option
						>{/each}</select
				><select bind:value={dueStatus}
					><option value="open">Open balances</option><option value="all">All statuses</option
					><option value="overdue">Overdue</option><option value="issued">Upcoming</option><option
						value="paid">Paid</option
					></select
				>
			</div>
			<div class="due-table-wrap">
				<table class="due-table">
					<thead
						><tr
							><th>Tenant</th><th>Property</th><th>Rented space</th><th>Amount due</th><th
								>Due date</th
							><th>Status</th><th></th></tr
						></thead
					><tbody
						>{#each activeCharges.filter((charge) => charge.charge_type === 'rent' && (!dueProperty || data.spaces.find((space) => space.id === data.tenancies.find((tenancy) => tenancy.id === charge.tenancy_id)?.space_id)?.property_id === dueProperty) && (dueStatus === 'all' || (dueStatus === 'open' ? !['paid', 'draft'].includes(statusForCharge(charge)) : statusForCharge(charge) === dueStatus))) as charge (charge.id)}{@const tenancy =
								data.tenancies.find((item) => item.id === charge.tenancy_id)}{@const space =
								data.spaces.find((item) => item.id === tenancy?.space_id)}<tr
								><td>{tenantName(charge.tenancy_id)}</td><td
									>{space ? propertyName(space.property_id) : '—'}</td
								><td>{space?.name ?? '—'}</td><td
									><strong>{money(outstandingForCharge(charge))}</strong></td
								><td>{charge.due_on}</td><td
									><span class={`charge-status ${statusForCharge(charge)}`}
										>{statusForCharge(charge).replaceAll('_', ' ')}</span
									></td
								><td
									><button
										class="table-action"
										type="button"
										onclick={() => {
											paymentTenancy = charge.tenancy_id;
											tab = 'payments';
										}}>Record payment →</button
									></td
								></tr
							>{:else}<tr><td colspan="7">No rent charges match the selected filters.</td></tr
							>{/each}</tbody
					>
				</table>
			</div>
		</section>
	{:else if tab === 'charges'}
		<div class="section-grid">
			<section class="panel form-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Money due</p>
						<h3>Create a charge or utility bill</h3>
						<p>Raise a rent, deposit, utility, or one-off charge against a tenancy.</p>
					</div>
				</div>
				{#if data.tenancies.length === 0}<div class="empty">
						<strong>Create a tenancy first.</strong>
						<p>Charges need a person and rentable space.</p>
					</div>{:else}<form
						data-managed-feedback="true"
						use:enhance={workspaceSubmit}
						method="POST"
						action="?/addCharge"
						data-reset-on-success="true"
						class="form-stack"
					>
						<label
							>Tenancy<select name="tenancy_id" required
								><option value="">Choose tenancy</option
								>{#each data.tenancies as tenancy (tenancy.id)}<option value={tenancy.id}
										>{tenantName(tenancy.id)} · {spaceName(tenancy.space_id)}</option
									>{/each}</select
							></label
						>
						<div class="form-grid three">
							<label
								>Charge type<select name="charge_type"
									><option value="rent">Rent</option><option value="utility">Utility bill</option
									><option value="deposit">Deposit</option><option value="fee">Fee</option><option
										value="other">Other</option
									></select
								></label
							><label
								>Description<input
									name="description"
									required
									placeholder="October rent or electricity"
								/></label
							><label>Due date<input name="due_on" type="date" required /></label>
						</div>
						<div class="form-grid two">
							<label
								>Amount ({data.organization.currency_code})<input
									name="amount"
									type="number"
									min="0"
									step="0.01"
									required
								/></label
							><label
								>Utility provider <small>Optional</small><input
									name="utility_provider"
									placeholder="ZESA, council, internet"
								/></label
							>
						</div>
						<details class="details">
							<summary>Utility and billing details</summary>
							<div class="form-stack">
								<div class="form-grid two">
									<label>Account or meter reference<input name="utility_account_reference" /></label
									><label
										>Billing period start<input name="billing_period_start" type="date" /></label
									>
								</div>
								<label>Billing period end<input name="billing_period_end" type="date" /></label
								><label
									>Notes<textarea
										name="notes"
										rows="2"
										placeholder="Meter reading, allocation notes, or special terms"
									></textarea></label
								>
							</div>
						</details>
						<label class="toggle"
							><input name="issue_invoice" type="checkbox" checked /><span
								><strong>Issue a branded invoice</strong><small
									>Create the invoice and queue delivery when the tenant has an email address.</small
								></span
							></label
						><label class="toggle"
							><input name="save_draft" type="checkbox" /><span
								><strong>Save as draft</strong><small
									>Keep this charge for review without issuing it yet.</small
								></span
							></label
						><button class="primary" type="submit">Create charge <span>→</span></button>
					</form>{/if}
			</section>
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Ledger</p>
						<h3>Charges and invoice status</h3>
						<p>Every charge shows how much has been allocated and what remains.</p>
					</div>
					<span class="count">{ledgerCharges.length}</span>
				</div>
				{#if ledgerCharges.length === 0}<div class="empty">
						<strong>No charges yet.</strong>
						<p>Issued rent and utility charges will appear here.</p>
					</div>{:else}<div class="ledger-list">
						{#each ledgerCharges.slice(0, 50) as charge (charge.id)}<div class="ledger-row">
								<div>
									<strong>{charge.description}</strong><small
										>{tenantName(charge.tenancy_id)} · due {charge.due_on}{charge.charge_type ===
											'utility' && charge.utility_provider
											? ` · ${charge.utility_provider}`
											: ''}</small
									>
								</div>
								<span class={`badge ${statusForCharge(charge)}`}
									>{labelFor(statusForCharge(charge))}</span
								><b
									>{money(outstandingForCharge(charge))}<small>of {money(charge.amount)} open</small
									></b
								>
							</div>{/each}
					</div>{/if}
			</section>
		</div>
		<section class="panel records-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Billing documents</p>
					<h3>Invoices and receipts</h3>
					<p>Print or share the documents already generated for this workspace.</p>
				</div>
				<span class="count">{data.billingDocuments.length}</span>
			</div>
			{#if data.billingDocuments.length === 0}<div class="empty compact">
					<strong>No billing documents yet.</strong>
					<p>Issue an invoice or generate a receipt from a payment.</p>
				</div>{:else}<div class="ledger-list">
					{#each data.billingDocuments.slice(0, 12) as document (document.id)}<div
							class="ledger-row"
						>
							<div>
								<strong>{document.document_number}</strong><small
									>{document.document_type} · {document.issue_date} · {labelFor(
										document.status
									)}</small
								>
							</div>
							<span class={`badge ${document.status}`}>{labelFor(document.status)}</span><b
								>{money(document.total_amount)}<a
									href={resolve(`/workspace/${data.organization.id}/documents/${document.id}`)}
									target="_blank"
									rel="noreferrer">Print →</a
								></b
							>
						</div>{/each}
				</div>{/if}
		</section>
	{:else if tab === 'payments'}
		<div class="section-grid">
			<section class="panel form-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Money received</p>
						<h3>Record a payment</h3>
						<p>Capture the receipt, then match it to the oldest outstanding charges.</p>
					</div>
				</div>
				<form
					data-managed-feedback="true"
					use:enhance={workspaceSubmit}
					method="POST"
					action="?/recordPayment"
					use:submissionKey
					data-reset-on-success="true"
					class="form-stack"
				>
					<div class="form-grid two">
						<label
							>Tenancy<select name="tenancy_id" bind:value={paymentTenancy}
								><option value="">Unallocated / not linked</option
								>{#each data.tenancies as tenancy (tenancy.id)}<option value={tenancy.id}
										>{tenantName(tenancy.id)} · {spaceName(tenancy.space_id)}</option
									>{/each}</select
							></label
						><label
							>Payer<select name="payer_person_id"
								><option value="">Choose payer</option
								>{#each data.people as person (person.id)}<option value={person.id}
										>{person.first_name} {person.last_name}</option
									>{/each}</select
							></label
						>
					</div>
					<div class="form-grid three">
						<label
							>Amount ({data.organization.currency_code})<input
								name="amount"
								type="number"
								min="0.01"
								step="0.01"
								required
							/></label
						><label>Payment date<MushaDatePicker name="payment_date" required /></label><label
							>Method<select name="method"
								><option value="bank_transfer">Bank transfer</option><option value="cash"
									>Cash</option
								><option value="mobile_money">Mobile money</option><option value="card">Card</option
								><option value="manual">Manual</option><option value="other">Other</option></select
							></label
						>
					</div>
					<label>Reference<input name="reference" placeholder="Bank or receipt reference" /></label
					><label
						>Notes<textarea name="notes" rows="2" placeholder="Any allocation or payment notes"
						></textarea></label
					><label class="toggle"
						><input name="auto_allocate" type="checkbox" checked /><span
							><strong>Allocate automatically</strong><small
								>Apply the payment to the oldest open charges for this tenancy.</small
							></span
						></label
					><label class="toggle"
						><input name="generate_receipt" type="checkbox" checked /><span
							><strong>Generate a receipt</strong><small
								>Create a receipt saved with this payment.</small
							></span
						></label
					><button class="primary" type="submit">Record payment <span>→</span></button>
				</form>
			</section>
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Matching queue</p>
						<h3>Unallocated receipts</h3>
						<p>Receipts without a full allocation need a quick review.</p>
					</div>
					<span class="count"
						>{filteredPayments.filter(
							(payment) => amount(payment.amount) > allocatedForPayment(payment.id)
						).length}</span
					>
				</div>
				{#if !filteredPayments.some((payment) => amount(payment.amount) > allocatedForPayment(payment.id))}<div
						class="empty"
					>
						<strong>Nothing to match.</strong>
						<p>Fully allocated payments disappear from this queue.</p>
					</div>{:else}<div class="ledger-list">
						{#each filteredPayments.filter((payment) => amount(payment.amount) > allocatedForPayment(payment.id)) as payment (payment.id)}<div
								class="allocation-row"
							>
								<div>
									<strong>{personName(payment.payer_person_id)}</strong><small
										>{payment.payment_date} · {payment.reference ?? payment.method}</small
									>
								</div>
								<b>{money(amount(payment.amount) - allocatedForPayment(payment.id))} open</b>
								<form
									data-managed-feedback="true"
									use:enhance={workspaceSubmit}
									method="POST"
									action="?/allocatePayment"
									class="allocation-form"
								>
									<input type="hidden" name="payment_id" value={payment.id} /><select
										name="charge_id"
										required
										><option value="">Choose charge</option
										>{#each allIssuedCharges.filter((charge) => outstandingForCharge(charge) > 0) as charge (charge.id)}<option
												value={charge.id}
												>{charge.description} · {tenantName(charge.tenancy_id)} · {money(
													outstandingForCharge(charge)
												)}</option
											>{/each}</select
									><input
										name="amount"
										type="number"
										min="0.01"
										step="0.01"
										placeholder="Amount"
										required
									/><button class="text-action" type="submit">Allocate →</button>
								</form>
							</div>{/each}
					</div>{/if}
			</section>
		</div>
		<section class="panel records-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Payment register</p>
					<h3>Recent payments</h3>
				</div>
				<span class="count">{filteredPayments.length}</span>
			</div>
			<div class="ledger-list">
				{#each filteredPayments.slice(0, 50) as payment (payment.id)}<div class="ledger-row">
						<div>
							<strong>{personName(payment.payer_person_id)}</strong><small
								>{payment.payment_date} · {labelFor(payment.method)} · {payment.reference ??
									'No reference'}</small
							>
						</div>
						<span
							class={`badge ${allocatedForPayment(payment.id) < amount(payment.amount) ? 'partial' : 'paid'}`}
							>{allocatedForPayment(payment.id) < amount(payment.amount)
								? 'Unallocated'
								: 'Allocated'}</span
						><b>{money(payment.amount)}</b>
					</div>{/each}
			</div>
		</section>
	{:else if tab === 'expenses'}
		<div class="section-grid">
			<section class="panel form-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Operating costs</p>
						<h3>Record a property expense</h3>
						<p>Link every cost to the property, space, vendor, and date it belongs to.</p>
					</div>
				</div>
				{#if data.properties.length === 0}<div class="empty">
						<strong>Add a property first.</strong>
						<p>Expenses need a location.</p>
					</div>{:else}<form
						data-managed-feedback="true"
						use:enhance={workspaceSubmit}
						method="POST"
						action="?/addExpense"
						data-reset-on-success="true"
						class="form-stack"
					>
						<div class="form-grid two">
							<label
								>Property<select name="property_id" required
									><option value="">Choose property</option
									>{#each data.properties as property (property.id)}<option value={property.id}
											>{property.name}</option
										>{/each}</select
								></label
							><label
								>Space <small>Optional</small><select name="space_id"
									><option value="">Whole property</option
									>{#each data.spaces as space (space.id)}<option value={space.id}
											>{space.name} · {propertyName(space.property_id)}</option
										>{/each}</select
								></label
							>
						</div>
						<div class="form-grid three">
							<label
								>Category<select name="category" required
									>{#each Object.entries(categoryLabels) as [key, label] (key)}<option value={key}
											>{label}</option
										>{/each}</select
								></label
							><label
								>Amount ({data.organization.currency_code})<input
									name="amount"
									type="number"
									min="0"
									step="0.01"
									required
								/></label
							><label>Expense date<input name="expense_date" type="date" required /></label>
						</div>
						<label
							>Description<input
								name="description"
								required
								placeholder="Council rates, repair, security, utility"
							/></label
						>
						<div class="form-grid two">
							<label
								>Vendor <small>Optional</small><select name="vendor_id"
									><option value="">No vendor linked</option
									>{#each data.maintenanceVendors as vendor (vendor.id)}<option value={vendor.id}
											>{vendor.business_name}</option
										>{/each}</select
								></label
							><label
								>Reference<input name="reference" placeholder="Invoice or receipt number" /></label
							>
						</div>
						<div class="form-grid two">
							<label
								>Payment status<select name="payment_status"
									><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option
										value="partially_paid">Partially paid</option
									><option value="reimbursable">Reimbursable</option></select
								></label
							><label
								>Approval status<select name="approval_status"
									><option value="approved">Approved</option><option value="pending"
										>Pending approval</option
									><option value="rejected">Rejected</option></select
								></label
							>
						</div>
						<label
							>Notes<textarea
								name="notes"
								rows="3"
								placeholder="What was done, who approved it, or when payment is expected"
							></textarea></label
						><button class="primary" type="submit">Record expense <span>→</span></button>
					</form>{/if}
			</section>
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Expense register</p>
						<h3>Recent operating costs</h3>
						<p>Review cost, status, and property impact.</p>
					</div>
					<span class="count">{filteredExpenses.length}</span>
				</div>
				{#if filteredExpenses.length === 0}<div class="empty">
						<strong>No expenses recorded.</strong>
						<p>Rates, utilities, repairs, and vendor costs will appear here.</p>
					</div>{:else}<div class="ledger-list">
						{#each filteredExpenses.slice(0, 50) as expense (expense.id)}<div class="ledger-row">
								<div>
									<strong>{expense.description}</strong><small
										>{propertyName(expense.property_id)} · {categoryLabels[expense.category] ??
											labelFor(expense.category)} · {expense.expense_date}</small
									>
								</div>
								<span class="badge">{labelFor(expense.payment_status ?? 'paid')}</span><b
									>{money(expense.amount)}<small
										>{labelFor(expense.approval_status ?? 'approved')}</small
									></b
								>
							</div>{/each}
					</div>{/if}
			</section>
		</div>
	{:else}
		<div class="section-grid">
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Arrears queue</p>
						<h3>Follow up outstanding balances</h3>
						<p>Keep the next action visible without losing the financial record.</p>
					</div>
					<span class="count">{arrears.length}</span>
				</div>
				{#if arrears.length === 0}<div class="empty">
						<strong>No balances need attention.</strong>
						<p>When a charge becomes overdue, it will appear here.</p>
					</div>{:else}<div class="arrears-list">
						{#each arrears as item (item.tenancy.id)}<article>
								<div>
									<strong>{tenantName(item.tenancy.id)}</strong><small
										>{spaceName(item.tenancy.space_id)} · {item.tenancy.billing_frequency}</small
									>
								</div>
								<b>{money(item.balance)}</b><span class="badge overdue"
									>{item.charges.some((charge) => statusForCharge(charge) === 'overdue')
										? 'Overdue'
										: 'Outstanding'}</span
								>
							</article>{/each}
					</div>{/if}
			</section>
			<section class="panel form-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Collection note</p>
						<h3>Log a follow-up</h3>
						<p>Record a promise, reminder, or decision against the tenancy.</p>
					</div>
				</div>
				{#if data.tenancies.length === 0}<div class="empty">
						<strong>No tenancies available.</strong>
						<p>Create a tenancy before following up.</p>
					</div>{:else}<form
						data-managed-feedback="true"
						use:enhance={workspaceSubmit}
						method="POST"
						action="?/addCollectionFollowup"
						class="form-stack"
					>
						<label
							>Tenancy<select name="tenancy_id" required
								><option value="">Choose tenancy</option
								>{#each data.tenancies as tenancy (tenancy.id)}<option value={tenancy.id}
										>{tenantName(tenancy.id)} · {spaceName(tenancy.space_id)}</option
									>{/each}</select
							></label
						><label
							>Charge <small>Optional</small><select name="charge_id"
								><option value="">General tenancy follow-up</option
								>{#each allIssuedCharges.filter((charge) => outstandingForCharge(charge) > 0) as charge (charge.id)}<option
										value={charge.id}
										>{charge.description} · {tenantName(charge.tenancy_id)} · {money(
											outstandingForCharge(charge)
										)}</option
									>{/each}</select
							></label
						>
						<div class="form-grid two">
							<label
								>Status<select name="status"
									><option value="open">Open</option><option value="promised"
										>Payment promised</option
									><option value="resolved">Resolved</option><option value="written_off"
										>Written off</option
									></select
								></label
							><label>Next action date<input name="next_action_on" type="date" /></label>
						</div>
						<label
							>Follow-up note<textarea
								name="notes"
								rows="4"
								required
								placeholder="Spoke to tenant; payment expected on..."></textarea></label
						><button class="primary" type="submit">Save follow-up <span>→</span></button>
					</form>{/if}
			</section>
		</div>
		<section class="panel records-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Follow-up history</p>
					<h3>Collection notes</h3>
				</div>
				<span class="count">{data.collectionFollowups.length}</span>
			</div>
			{#if data.collectionFollowups.length === 0}<div class="empty compact">
					<strong>No follow-up notes yet.</strong>
					<p>Keep the next action visible when a balance needs attention.</p>
				</div>{:else}<div class="ledger-list">
					{#each data.collectionFollowups as followup (followup.id)}<div class="ledger-row">
							<div>
								<strong>{tenantName(followup.tenancy_id)}</strong><small
									>{followup.notes} · {followup.next_action_on ?? 'No next action date'}</small
								>
							</div>
							<span class={`badge ${followup.status}`}>{labelFor(followup.status)}</span
							>{#if ['open', 'promised'].includes(followup.status)}<form
									method="POST"
									action="?/resolveCollectionFollowup"
									use:enhance={workspaceSubmit}
									data-managed-feedback="true"
								>
									<input name="followup_id" type="hidden" value={followup.id} /><button
										type="submit"
										class="secondary">Resolve follow-up</button
									>
								</form>{/if}
						</div>{/each}
				</div>{/if}
		</section>
	{/if}
</section>

<style>
	.finance-workspace {
		display: grid;
		gap: 16px;
	}
	.finance-intro {
		align-items: flex-end;
		display: flex;
		justify-content: space-between;
		gap: 22px;
	}
	.eyebrow {
		color: #718f82;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.15em;
		margin: 0 0 9px;
		text-transform: uppercase;
	}
	h2,
	h3,
	p {
		margin-top: 0;
	}
	h2 {
		color: #093f3d;
		font-size: clamp(28px, 4vw, 45px);
		letter-spacing: -0.07em;
		line-height: 0.98;
		margin-bottom: 10px;
		max-width: 680px;
	}
	h3 {
		color: #0b4541;
		font-size: 24px;
		letter-spacing: -0.055em;
		margin-bottom: 7px;
	}
	.finance-intro > div > p:last-child,
	.panel-heading p {
		color: #718a7e;
		font-size: 14px;
		line-height: 1.5;
		margin-bottom: 0;
		max-width: 640px;
	}
	.secondary-link {
		color: #4d8062;
		font-size: 12px;
		font-weight: 800;
		text-decoration: none;
		white-space: nowrap;
	}
	.finance-tabs {
		background: #edf4e9;
		border: 1px solid #e0eadd;
		border-radius: 9px;
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		padding: 5px;
	}
	.finance-tabs button {
		background: transparent;
		border: 0;
		border-radius: 6px;
		color: #6c8979;
		cursor: pointer;
		font: inherit;
		font-size: 12px;
		padding: 10px 12px;
	}
	.finance-tabs button.active {
		background: var(--musha-deep);
		color: #fff;
	}
	.metric-row {
		display: grid;
		gap: 10px;
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}
	.metric {
		background: #fff;
		border: 1px solid #e1ebe2;
		border-radius: 10px;
		padding: 15px;
	}
	.metric.emphasis {
		background: var(--musha-deep);
		border-color: var(--musha-deep);
	}
	.metric.attention {
		background: #fff8ea;
		border-color: #f0dfbf;
	}
	.metric span,
	.metric small {
		color: #7b9287;
		display: block;
		font-size: 10px;
	}
	.metric.emphasis span,
	.metric.emphasis small {
		color: #b8d5c4;
	}
	.metric strong {
		color: #244a3b;
		display: block;
		font-size: 22px;
		letter-spacing: -0.06em;
		margin: 9px 0 4px;
		white-space: nowrap;
	}
	.metric.emphasis strong {
		color: #fff;
	}
	.overview-grid,
	.section-grid {
		display: grid;
		gap: 14px;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.panel {
		background: #fff;
		border: 1px solid #e1ebe2;
		border-radius: 12px;
		padding: 25px;
	}
	.panel-heading {
		align-items: flex-start;
		display: flex;
		gap: 15px;
		justify-content: space-between;
		margin-bottom: 19px;
	}
	.count,
	.badge {
		background: #edf4dc;
		border-radius: 99px;
		color: #668a6d;
		font-size: 10px;
		padding: 7px 9px;
		white-space: nowrap;
	}
	.badge {
		text-transform: capitalize;
	}
	.badge.overdue,
	.badge.unpaid {
		background: #fae9e5;
		color: #a45648;
	}
	.badge.partially_paid,
	.badge.partial,
	.badge.promised {
		background: #fff0d5;
		color: #a26e32;
	}
	.badge.paid,
	.badge.resolved {
		background: #e6f2e2;
		color: #4b805c;
	}
	.badge.draft {
		background: #edf0ee;
		color: #71877b;
	}
	.form-stack {
		display: grid;
		gap: 12px;
	}
	.form-grid {
		display: grid;
		gap: 10px;
	}
	.two {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.three {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	label {
		color: #4d7060;
		display: grid;
		font-size: 12px;
		font-weight: 700;
		gap: 6px;
	}
	label small {
		color: #91a499;
		font-size: 10px;
		font-weight: 600;
	}
	input,
	select,
	textarea {
		background: #fbfdfb;
		border: 1px solid #d9e7dc;
		border-radius: 7px;
		box-sizing: border-box;
		color: #204a3b;
		font: inherit;
		font-size: 13px;
		min-width: 0;
		padding: 10px 11px;
		width: 100%;
	}
	textarea {
		resize: vertical;
	}
	.primary {
		align-items: center;
		background: var(--musha-deep);
		border: 0;
		border-radius: 7px;
		color: #fff;
		cursor: pointer;
		display: inline-flex;
		font: inherit;
		font-size: 13px;
		font-weight: 800;
		gap: 12px;
		justify-content: center;
		padding: 12px 15px;
		width: fit-content;
	}
	.primary span {
		color: var(--musha-lime);
		font-size: 17px;
	}
	.toggle {
		align-items: flex-start;
		background: #f7fbf6;
		border: 1px solid #e3eee4;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		gap: 10px;
		padding: 11px;
	}
	.toggle input {
		accent-color: var(--musha-emerald);
		flex: 0 0 auto;
		height: 17px;
		margin: 1px 0 0;
		width: 17px;
	}
	.toggle span,
	.toggle strong,
	.toggle small {
		display: block;
	}
	.toggle strong {
		color: #365b4b;
		font-size: 12px;
	}
	.toggle small {
		color: #82958b;
		font-size: 11px;
		font-weight: 500;
		line-height: 1.4;
		margin-top: 3px;
	}
	.details {
		border: 1px solid #e4eee5;
		border-radius: 8px;
		padding: 10px 12px;
	}
	.details summary {
		color: #4d8062;
		cursor: pointer;
		font-size: 12px;
		font-weight: 800;
	}
	.details[open] summary {
		margin-bottom: 12px;
	}
	.empty {
		align-content: center;
		border: 1px dashed #d9e7dc;
		border-radius: 8px;
		display: grid;
		gap: 5px;
		justify-items: center;
		min-height: 140px;
		text-align: center;
	}
	.empty strong {
		color: #486b5b;
		font-size: 13px;
	}
	.empty p {
		color: #8a9f94;
		font-size: 12px;
		margin: 0;
	}
	.empty.compact {
		min-height: 100px;
	}
	.attention-list,
	.category-list,
	.ledger-list,
	.arrears-list {
		display: grid;
		gap: 7px;
	}
	.attention-list > div,
	.category-list > div,
	.ledger-row,
	.arrears-list article {
		align-items: center;
		border: 1px solid #edf2ed;
		border-radius: 8px;
		display: flex;
		gap: 10px;
		justify-content: space-between;
		padding: 11px 12px;
	}
	.attention-list > div > div,
	.category-list > div > span,
	.ledger-row > div,
	.arrears-list article > div {
		flex: 1;
		min-width: 0;
	}
	.attention-list strong,
	.attention-list small,
	.category-list strong,
	.category-list small,
	.ledger-row strong,
	.ledger-row small,
	.arrears-list strong,
	.arrears-list small {
		display: block;
	}
	.attention-list strong,
	.category-list strong,
	.ledger-row strong,
	.arrears-list strong {
		color: #3b624f;
		font-size: 12px;
	}
	.attention-list small,
	.category-list small,
	.ledger-row small,
	.arrears-list small {
		color: #8a9e94;
		font-size: 10px;
		line-height: 1.4;
		margin-top: 3px;
	}
	.attention-list b,
	.category-list b,
	.ledger-row > b,
	.arrears-list > article > b {
		color: #315f4b;
		font-size: 12px;
		white-space: nowrap;
	}
	.alert-dot {
		align-items: center;
		background: #f4d6c9;
		border-radius: 50%;
		color: #9d5c4e;
		display: inline-flex;
		flex: 0 0 25px;
		height: 25px;
		justify-content: center;
	}
	.alert-dot.neutral {
		background: #f8e9c7;
		color: #a87638;
	}
	.ledger-row > b {
		display: grid;
		gap: 2px;
		text-align: right;
	}
	.ledger-row > b small {
		margin: 0;
	}
	.ledger-row > b a {
		color: #4d8062;
		font-size: 10px;
		text-decoration: none;
	}
	.allocation-row {
		border: 1px solid #edf2ed;
		border-radius: 8px;
		display: grid;
		gap: 9px;
		padding: 12px;
	}
	.allocation-row > div {
		display: flex;
		gap: 12px;
		justify-content: space-between;
	}
	.allocation-row strong {
		color: #3b624f;
		font-size: 12px;
	}
	.allocation-row small {
		color: #8a9e94;
		font-size: 10px;
	}
	.allocation-row > b {
		color: #a56a32;
		font-size: 12px;
	}
	.allocation-form {
		display: grid;
		gap: 7px;
		grid-template-columns: 1.4fr 0.6fr auto;
	}
	.allocation-form input,
	.allocation-form select {
		font-size: 11px;
		padding: 8px;
	}
	.text-action {
		background: #edf4dc;
		border: 0;
		border-radius: 6px;
		color: #47795a;
		cursor: pointer;
		font: inherit;
		font-size: 11px;
		font-weight: 800;
		padding: 8px 9px;
	}
	.arrears-list article {
		align-items: center;
	}
	.records-panel {
		margin-top: 0;
	}
	.due-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 9px;
		margin: 2px 0 18px;
	}
	.due-filters select {
		background: #f9fbf8;
		border: 1px solid #dbe8dd;
		border-radius: 7px;
		color: #416b58;
		font: inherit;
		font-size: 11px;
		font-weight: 700;
		min-width: 178px;
		padding: 9px 30px 9px 11px;
		width: auto;
	}
	.due-table-wrap {
		border: 1px solid #e3ece5;
		border-radius: 9px;
		overflow-x: auto;
	}
	.due-table {
		border-collapse: collapse;
		min-width: 760px;
		width: 100%;
	}
	.due-table th {
		background: #f7faf5;
		border-bottom: 1px solid #e2ebe3;
		color: #789287;
		font-size: 10px;
		letter-spacing: 0.08em;
		padding: 12px 14px;
		text-align: left;
		text-transform: uppercase;
	}
	.due-table td {
		border-bottom: 1px solid #edf2ed;
		color: #547365;
		font-size: 12px;
		padding: 14px;
		vertical-align: middle;
	}
	.due-table tbody tr:last-child td {
		border-bottom: 0;
	}
	.due-table tbody tr:hover {
		background: #fbfdf9;
	}
	.due-table td strong {
		color: #244f40;
		font-size: 12px;
	}
	.charge-status {
		background: #edf4dc;
		border-radius: 99px;
		color: #63846a;
		display: inline-block;
		font-size: 10px;
		font-weight: 800;
		padding: 5px 8px;
		text-transform: capitalize;
	}
	.charge-status.overdue {
		background: #fbe9e4;
		color: #a05748;
	}
	.charge-status.partially_paid {
		background: #fff2d8;
		color: #9a7228;
	}
	.charge-status.paid {
		background: #e3f1e6;
		color: #438057;
	}
	.table-action {
		background: #edf5d9;
		border: 0;
		border-radius: 6px;
		color: #407557;
		cursor: pointer;
		font: inherit;
		font-size: 11px;
		font-weight: 800;
		padding: 8px 10px;
		white-space: nowrap;
	}
	.table-action:hover {
		background: var(--musha-deep);
		color: #fff;
	}
	@media (max-width: 1120px) {
		.metric-row {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (max-width: 820px) {
		.finance-intro {
			align-items: flex-start;
			flex-direction: column;
		}
		.overview-grid,
		.section-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 600px) {
		.metric-row {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.two,
		.three {
			grid-template-columns: 1fr;
		}
		.finance-tabs {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
		}
		.finance-tabs button {
			text-align: left;
		}
		.panel {
			padding: 18px;
		}
		.ledger-row {
			align-items: flex-start;
			flex-wrap: wrap;
		}
		.allocation-form {
			grid-template-columns: 1fr;
		}
		.due-filters select {
			min-width: 150px;
		}
	}
	@media (max-width: 420px) {
		.metric-row {
			grid-template-columns: 1fr;
		}
		.metric strong {
			font-size: 27px;
		}
		.arrears-list article {
			align-items: flex-start;
			flex-wrap: wrap;
		}
	}
	/* Finance: consistent hierarchy, readable ledgers and restrained operational surfaces. */
	.finance-workspace {
		color: #294334;
		gap: 22px;
	}
	.finance-workspace * {
		box-sizing: border-box;
	}
	.finance-intro {
		align-items: center;
		gap: 25px;
	}
	.finance-intro h2 {
		font-size: clamp(28px, 2.8vw, 40px);
		font-weight: 500;
		letter-spacing: -1.4px;
		line-height: 1.2;
		color: #294334;
		max-width: 950px;
		margin: 0 0 12px;
	}
	.finance-intro h2 em {
		font-family: Georgia, serif;
		font-weight: 400;
	}
	.finance-intro > div > p:last-child {
		font-size: 11px;
		line-height: 1.8;
		color: #879775;
		max-width: 700px;
	}
	.eyebrow {
		font-size: 8px;
		letter-spacing: 1.6px;
		font-weight: 500;
		color: #8c9f79;
		margin-bottom: 12px;
	}
	.finance-tabs {
		background: #e9eedf;
		border-color: #dce5cf;
		border-radius: 9px;
		padding: 5px;
		gap: 4px;
		flex-wrap: nowrap;
		overflow-x: auto;
	}
	.finance-tabs button {
		font-size: 10px;
		font-weight: 500;
		padding: 12px 17px;
		color: #81956b;
		border-radius: 6px;
		white-space: nowrap;
	}
	.finance-tabs button.active {
		background: #fffefa;
		color: #456536;
		box-shadow: 0 3px 8px #29433408;
	}
	.operations-filter {
		display: flex;
		align-items: end;
		gap: 14px;
		background: #edf1e5;
		padding: 17px 20px;
		border: 1px solid #dfe6d3;
		border-radius: 10px;
	}
	.operations-filter label {
		display: grid;
		gap: 9px;
		flex: 1;
		min-width: 0;
	}
	.operations-filter .wide-search {
		flex: 2;
	}
	.operations-filter label > span {
		font-size: 8px;
		color: #8da178;
	}
	.operations-filter input,
	.operations-filter select {
		font: inherit;
		font-size: 10px;
		border: 1px solid #d9e3cb;
		background: #fffefa;
		padding: 11px 12px;
		border-radius: 5px;
		color: #67804f;
		min-width: 0;
		width: 100%;
	}
	.operations-filter > button {
		font: inherit;
		font-size: 9px;
		color: #7e9567;
		white-space: nowrap;
		border: 0;
		background: none;
		padding: 13px 5px;
		cursor: pointer;
	}
	.operations-scope {
		font-size: 9px;
		color: #9ba98c;
		line-height: 1.8;
		margin: -10px 0 0;
	}
	.finance-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.primary,
	.secondary {
		font-size: 11px;
		font-weight: 500;
		border-radius: 6px;
		padding: 12px 17px;
	}
	.primary {
		background: #294c38;
		color: #fffefa;
	}
	.secondary {
		background: #edf2e4;
		color: #729255;
		border-color: #d7e3c9;
	}
	.secondary-link,
	.text-action {
		font-size: 10px;
		color: #76945a;
	}
	.metric-row {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 13px;
	}
	.metric {
		padding: 21px 20px;
		background: #fffefa;
		border-color: #dce5cf;
		border-radius: 12px;
	}
	.metric.emphasis {
		background: #294c38;
		border-color: #294c38;
	}
	.metric span,
	.metric small {
		font-size: 9px;
		color: #8a9c75;
		line-height: 1.7;
	}
	.metric strong {
		font-size: 29px;
		letter-spacing: -1px;
		font-weight: 500;
		margin: 12px 0 7px;
		overflow-wrap: anywhere;
	}
	.metric.emphasis span,
	.metric.emphasis small {
		color: #bdcfaa;
	}
	.metric.attention {
		background: #fff9ef;
		border-color: #eee0c5;
	}
	.panel {
		background: #fffefa;
		border-color: #dfe6d3;
		border-radius: 12px;
		padding: 25px;
	}
	.panel-heading h3 {
		font-size: 20px;
		font-weight: 500;
		line-height: 1.35;
		letter-spacing: -0.7px;
		color: #3e5e32;
	}
	.panel-heading p:not(.eyebrow) {
		font-size: 11px;
		color: #8e9e7d;
		line-height: 1.9;
	}
	.overview-grid,
	.section-grid {
		gap: 18px;
	}
	.ledger-row {
		border-color: #e3ead8;
		padding: 17px 0;
	}
	.ledger-row strong,
	.allocation-row strong,
	.attention-list strong,
	.category-list strong {
		font-size: 12px;
		font-weight: 500;
		color: #5a7944;
	}
	.ledger-row small,
	.allocation-row small,
	.attention-list small,
	.category-list small {
		font-size: 9px;
		color: #97a885;
		line-height: 1.8;
	}
	.ledger-row > b,
	.allocation-row > b,
	.attention-list b,
	.category-list b {
		font-size: 13px;
		font-weight: 500;
		color: #76905c;
	}
	.badge,
	.charge-status {
		font-size: 8px;
		font-weight: 500;
		border-radius: 5px;
		background: #edf2e4;
		color: #7f9866;
		padding: 7px 10px;
	}
	.charge-status.overdue {
		background: #f7ecdc;
		color: #a88751;
	}
	.form-stack label,
	.form-grid label {
		font-size: 11px;
		font-weight: 500;
		color: #789361;
		line-height: 1.6;
	}
	.form-stack input,
	.form-stack select,
	.form-stack textarea,
	.form-grid input,
	.form-grid select {
		font-size: 12px;
		background: #fffefa;
		border-color: #dbe5cf;
		border-radius: 5px;
		padding: 12px;
		color: #567641;
	}
	.toggle {
		background: #f1f5e8;
		border-color: #dce7cd;
	}
	.toggle strong {
		font-size: 11px;
		font-weight: 500;
	}
	.toggle small {
		font-size: 10px;
		color: #98aa82;
		line-height: 1.8;
	}
	.due-table th {
		font-size: 9px;
		font-weight: 500;
		background: #edf1e5;
		color: #81976b;
		border-color: #dce5cf;
	}
	.due-table td {
		font-size: 11px;
		color: #719058;
		border-color: #e5ecdc;
		padding: 18px 14px;
	}
	.due-table td strong {
		font-size: 12px;
		font-weight: 500;
		color: #526f3e;
	}
	.due-filters select {
		font-size: 10px;
		background: #fffefa;
		border-color: #dce5cf;
		color: #78965d;
	}
	.table-action {
		font-size: 9px;
		border-radius: 5px;
		background: #edf2e4;
		color: #719354;
		border-color: #d9e5ca;
	}
	.empty {
		background: #f8faf2;
		border-color: #dce7cf;
		border-radius: 10px;
		padding: 30px;
	}
	.empty strong {
		font-size: 13px;
		font-weight: 500;
		color: #6c8a53;
	}
	.empty p {
		font-size: 11px;
		line-height: 1.9;
		color: #9bac88;
	}
	.arrears-list article {
		border-color: #e2ead6;
		background: #fafcf5;
		border-radius: 8px;
		padding: 18px;
	}
	.arrears-list article strong {
		font-size: 12px;
		font-weight: 500;
		color: #67854e;
	}
	.arrears-list small {
		font-size: 10px;
		color: #97ab80;
	}
	.allocation-form {
		gap: 10px;
	}
	.allocation-form select,
	.allocation-form input {
		font-size: 11px;
		padding: 10px;
		background: #fffefa;
		border-color: #dde7d0;
		color: #708f55;
	}
	.finance-workspace a:focus-visible,
	.finance-workspace button:focus-visible,
	.finance-workspace input:focus-visible,
	.finance-workspace select:focus-visible {
		outline: 2px solid #95ad79;
		outline-offset: 3px;
	}
	:global(form[aria-busy='true']) {
		opacity: 0.7;
		cursor: wait;
	}
	:global(form[aria-busy='true']) button {
		cursor: wait;
	}
	@media (max-width: 1000px) {
		.operations-filter {
			flex-wrap: wrap;
		}
		.operations-filter .wide-search {
			flex-basis: 100%;
		}
		.finance-intro {
			align-items: start;
			flex-direction: column;
		}
		.metric-row {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 600px) {
		.finance-intro h2 {
			font-size: 31px;
		}
		.panel {
			padding: 20px 16px;
		}
		.metric {
			padding: 17px 14px;
		}
		.metric strong {
			font-size: 24px;
		}
		.metric-row {
			gap: 10px;
		}
		.operations-filter {
			padding: 16px;
			gap: 15px 10px;
		}
		.operations-filter label {
			flex-basis: 40%;
		}
		.operations-filter .wide-search {
			flex-basis: 100%;
		}
		.finance-tabs button {
			font-size: 10px;
			padding: 12px;
		}
		.finance-actions .primary,
		.finance-actions .secondary {
			font-size: 10px;
			flex: 1;
			white-space: nowrap;
		}
		.ledger-row {
			gap: 12px;
		}
		.allocation-row {
			flex-wrap: wrap;
		}
		.allocation-form {
			width: 100%;
		}
		.operations-scope {
			font-size: 9px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.finance-workspace * {
			transition: none !important;
		}
	}
</style>
