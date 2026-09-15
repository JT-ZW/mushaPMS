<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, svelte/prefer-svelte-reactivity, svelte/require-each-key, svelte/no-navigation-without-resolve */
	let { data } = $props();
	type Row = Record<string, any>;
	const properties: Row[] = $derived(data.properties ?? []);
	const spaces: Row[] = $derived(data.spaces ?? []);
	const people: Row[] = $derived(data.people ?? []);
	const tenancies: Row[] = $derived(data.tenancies ?? []);
	const parties: Row[] = $derived(data.parties ?? []);
	const charges: Row[] = $derived(data.charges ?? []);
	const payments: Row[] = $derived(data.payments ?? []);
	const allocations: Row[] = $derived(data.paymentAllocations ?? []);
	const maintenance: Row[] = $derived(data.maintenance ?? []);
	const vendors: Row[] = $derived(data.maintenanceVendors ?? []);
	const expenses: Row[] = $derived(data.propertyExpenses ?? []);
	const today = new Date();
	const iso = (date: Date) => date.toISOString().slice(0, 10);
	let period = $state('this_month');
	let customStart = $state(iso(new Date(today.getFullYear(), today.getMonth(), 1)));
	let customEnd = $state(iso(today));
	let view = $state('overview');
	let propertyFilter = $state('all');
	const currency = $derived(data.organization?.currency_code ?? 'USD');
	const money = (value: number | string | null | undefined) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency,
			maximumFractionDigits: 0
		}).format(Number(value ?? 0));
	const number = (value: number | string | null | undefined) =>
		new Intl.NumberFormat('en-US').format(Number(value ?? 0));
	const dateLabel = (value: string | null | undefined) =>
		value
			? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(
					new Date(`${value.slice(0, 10)}T00:00:00`)
				)
			: '—';
	const sum = (items: Row[], key = 'amount') =>
		items.reduce((total, item) => total + Number(item[key] ?? 0), 0);
	const range = () => {
		const start = new Date(today.getFullYear(), today.getMonth(), 1);
		const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
		if (period === 'last_month') {
			start.setMonth(start.getMonth() - 1);
			end.setDate(0);
		}
		if (period === 'this_quarter') {
			start.setMonth(Math.floor(today.getMonth() / 3) * 3);
			end.setMonth(start.getMonth() + 3, 0);
		}
		if (period === 'this_year') {
			start.setMonth(0, 1);
			end.setMonth(11, 31);
		}
		if (period === 'custom') return { start: customStart, end: customEnd };
		return { start: iso(start), end: iso(end) };
	};
	const inRange = (value: string | null | undefined) => {
		if (!value) return false;
		const r = range();
		return value.slice(0, 10) >= r.start && value.slice(0, 10) <= r.end;
	};
	const allocationForCharge = (chargeId: string) =>
		sum(allocations.filter((item) => item.charge_id === chargeId));
	const allocationForPayment = (paymentId: string) =>
		sum(allocations.filter((item) => item.payment_id === paymentId));
	const tenancyForSpace = (spaceId: string) =>
		tenancies.find(
			(item) => item.space_id === spaceId && ['active', 'ending_soon'].includes(item.status)
		);
	const propertyName = (id: string) =>
		properties.find((item) => item.id === id)?.name ?? 'Unassigned';
	const personName = (id: string | null | undefined) => {
		const person = people.find((item) => item.id === id);
		return person ? `${person.first_name} ${person.last_name}` : 'Unassigned';
	};
	const activeSpaces = $derived(spaces.filter((space) => space.status !== 'inactive'));
	const occupiedSpaces = $derived(
		activeSpaces.filter((space) => space.status === 'occupied' || tenancyForSpace(space.id))
	);
	const periodCharges = $derived(charges.filter((charge) => inRange(charge.due_on)));
	const periodPayments = $derived(payments.filter((payment) => inRange(payment.payment_date)));
	const periodExpenses = $derived(expenses.filter((expense) => inRange(expense.expense_date)));
	const openMaintenance = $derived(
		maintenance.filter((item) => !['completed', 'closed'].includes(item.status))
	);
	const overdueMaintenance = $derived(
		openMaintenance.filter((item) => item.sla_due_at && new Date(item.sla_due_at) < today)
	);
	const billed = $derived(sum(periodCharges));
	const collected = $derived(sum(periodPayments));
	const outstanding = $derived(
		Math.max(
			0,
			sum(
				periodCharges.map((charge) => ({
					amount: Number(charge.amount) - allocationForCharge(charge.id)
				}))
			)
		)
	);
	const maintenanceCost = $derived(
		sum(periodExpenses.filter((item) => ['repairs', 'contractor'].includes(item.category))) +
			sum(
				maintenance.filter((item) => inRange(item.completed_at ?? item.created_at)),
				'actual_cost'
			)
	);
	const propertyRows = () =>
		properties.map((property) => {
			const propertySpaces = activeSpaces.filter((space) => space.property_id === property.id);
			const propertyTenancyIds = tenancies
				.filter((tenancy) => propertySpaces.some((space) => space.id === tenancy.space_id))
				.map((tenancy) => tenancy.id);
			const propertyCharges = periodCharges.filter((charge) =>
				propertyTenancyIds.includes(charge.tenancy_id)
			);
			const propertyPayments = periodPayments.filter((payment) =>
				propertyTenancyIds.includes(payment.tenancy_id)
			);
			const propertyExpenses = periodExpenses.filter(
				(expense) => expense.property_id === property.id
			);
			const propertyMaintenance = maintenance.filter(
				(item) => item.property_id === property.id && inRange(item.completed_at ?? item.created_at)
			);
			const expenseTotal = sum(propertyExpenses) + sum(propertyMaintenance, 'actual_cost');
			return {
				property,
				spaces: propertySpaces.length,
				occupied: propertySpaces.filter(
					(space) => space.status === 'occupied' || tenancyForSpace(space.id)
				).length,
				potential: sum(propertySpaces, 'monthly_rent'),
				billed: sum(propertyCharges),
				collected: sum(propertyPayments),
				arrears: Math.max(
					0,
					sum(
						propertyCharges.map((charge) => ({
							amount: Number(charge.amount) - allocationForCharge(charge.id)
						}))
					)
				),
				maintenance: sum(propertyMaintenance, 'actual_cost'),
				expenses: expenseTotal,
				net: sum(propertyPayments) - expenseTotal
			};
		});
	const tenantRows = () =>
		people
			.filter((person) => person.person_type === 'tenant')
			.map((person) => {
				const personTenancyIds = parties
					.filter((party) => party.person_id === person.id)
					.map((party) => party.tenancy_id);
				const personTenancies = tenancies.filter((tenancy) =>
					personTenancyIds.includes(tenancy.id)
				);
				const personCharges = charges.filter((charge) =>
					personTenancyIds.includes(charge.tenancy_id)
				);
				return {
					person,
					tenancies: personTenancies,
					active: personTenancies.some((tenancy) =>
						['active', 'ending_soon'].includes(tenancy.status)
					),
					balance: Math.max(
						0,
						sum(
							personCharges.map((charge) => ({
								amount: Number(charge.amount) - allocationForCharge(charge.id)
							}))
						)
					),
					paid: sum(payments.filter((payment) => personTenancyIds.includes(payment.tenancy_id))),
					latest: personTenancies[0]
				};
			});
	const leaseExpiry = (days: number) =>
		tenancies.filter(
			(tenancy) =>
				tenancy.end_date &&
				tenancy.end_date >= iso(today) &&
				tenancy.end_date <=
					iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + days))
		);
	const categories = $derived([...new Set(maintenance.map((item) => item.category))]);
	const maintenanceByCategory = () =>
		categories
			.map((category) => ({
				category,
				count: maintenance.filter((item) => item.category === category).length,
				cost: sum(
					maintenance.filter((item) => item.category === category),
					'actual_cost'
				)
			}))
			.sort((a, b) => b.count - a.count);
	const dataQuality = () =>
		[
			{
				label: 'Properties without coordinates',
				count: properties.filter(
					(item) =>
						item.latitude === null ||
						item.latitude === undefined ||
						item.longitude === null ||
						item.longitude === undefined
				).length,
				href: 'portfolio'
			},
			{
				label: 'Spaces without rent values',
				count: activeSpaces.filter(
					(item) => item.monthly_rent === null || item.monthly_rent === undefined
				).length,
				href: 'portfolio'
			},
			{
				label: 'Active spaces without leases',
				count: activeSpaces.filter(
					(item) => item.status === 'occupied' && !tenancyForSpace(item.id)
				).length,
				href: 'people'
			},
			{
				label: 'Leases without end dates',
				count: tenancies.filter(
					(item) => ['active', 'ending_soon'].includes(item.status) && !item.end_date
				).length,
				href: 'people'
			},
			{
				label: 'Charges without allocations',
				count: periodCharges.filter((item) => allocationForCharge(item.id) === 0).length,
				href: 'finance'
			},
			{
				label: 'Requests without an assignee',
				count: openMaintenance.filter((item) => !item.assigned_person_id && !item.vendor_id).length,
				href: 'maintenance'
			},
			{
				label: 'Requests without SLA targets',
				count: openMaintenance.filter((item) => !item.sla_due_at).length,
				href: 'maintenance'
			},
			{
				label: 'Vendors without contact details',
				count: vendors.filter((item) => !item.email && !item.phone).length,
				href: 'maintenance'
			}
		].filter((item) => item.count > 0);
	const views = [
		['overview', 'Executive overview'],
		['properties', 'Property performance'],
		['tenants', 'Tenants & leases'],
		['revenue', 'Revenue & collections'],
		['maintenance', 'Maintenance analytics'],
		['finance', 'Operating finance'],
		['quality', 'Data quality']
	];
</script>

<div class="reports-shell">
	<div class="report-toolbar">
		<div>
			<p class="eyebrow">Decision centre</p>
			<h2>Reports that keep the portfolio honest<span>.</span></h2>
			<p class="muted">
				Every view is calculated from properties, leases, charges, payments, work orders and
				expenses.
			</p>
		</div>
		<div class="period-control">
			<label
				>Reporting period<select bind:value={period}
					><option value="this_month">This month</option><option value="last_month"
						>Last month</option
					><option value="this_quarter">This quarter</option><option value="this_year"
						>This year</option
					><option value="custom">Custom period</option></select
				></label
			>{#if period === 'custom'}<label>From<input type="date" bind:value={customStart} /></label
				><label>To<input type="date" bind:value={customEnd} /></label>{/if}
		</div>
	</div>
	<nav class="report-tabs" aria-label="Report views">
		{#each views as item}<button
				class:active={view === item[0]}
				type="button"
				onclick={() => (view = item[0])}>{item[1]}</button
			>{/each}
	</nav>

	{#if view === 'overview'}
		<div class="metric-grid">
			<div class="metric accent">
				<span>Rentable spaces</span><strong>{number(activeSpaces.length)}</strong><small
					>{number(occupiedSpaces.length)} occupied · {number(
						activeSpaces.length - occupiedSpaces.length
					)} vacant</small
				>
			</div>
			<div class="metric">
				<span>Occupancy rate</span><strong
					>{activeSpaces.length
						? Math.round((occupiedSpaces.length / activeSpaces.length) * 100)
						: 0}%</strong
				><small>Across the selected portfolio</small>
			</div>
			<div class="metric">
				<span>Active tenancies</span><strong
					>{number(
						tenancies.filter((item) => ['active', 'ending_soon'].includes(item.status)).length
					)}</strong
				><small>{number(leaseExpiry(30).length)} expiry within 30 days</small>
			</div>
			<div class="metric">
				<span>Rent billed</span><strong>{money(billed)}</strong><small
					>{money(outstanding)} currently outstanding</small
				>
			</div>
			<div class="metric">
				<span>Rent collected</span><strong>{money(collected)}</strong><small
					>{billed ? Math.round((collected / billed) * 100) : 0}% collection rate</small
				>
			</div>
			<div class="metric">
				<span>Maintenance watch</span><strong>{number(openMaintenance.length)}</strong><small
					>{number(overdueMaintenance.length)} overdue · {money(maintenanceCost)} cost</small
				>
			</div>
		</div>
		<div class="report-grid two">
			<section class="report-card">
				<div class="card-heading">
					<div>
						<p class="eyebrow">Portfolio pulse</p>
						<h3>What needs a decision?</h3>
					</div>
					<span class="signal">{dataQuality().length} data checks</span>
				</div>
				<div class="insight-list">
					<div>
						<span>Leases expiring in 30 / 60 / 90 days</span><strong
							>{leaseExpiry(30).length} / {leaseExpiry(60).length} / {leaseExpiry(90)
								.length}</strong
						>
					</div>
					<div>
						<span>Overdue maintenance work</span><strong>{overdueMaintenance.length}</strong>
					</div>
					<div>
						<span>Top arrears account</span><strong
							>{tenantRows().sort((a, b) => b.balance - a.balance)[0]?.person
								? `${tenantRows().sort((a, b) => b.balance - a.balance)[0].person.first_name} · ${money(tenantRows().sort((a, b) => b.balance - a.balance)[0].balance)}`
								: 'No arrears recorded'}</strong
						>
					</div>
					<div>
						<span>Highest maintenance category</span><strong
							>{maintenanceByCategory()[0]?.category?.replaceAll('_', ' ') ??
								'No requests yet'}</strong
						>
					</div>
				</div>
			</section>
			<section class="report-card">
				<div class="card-heading">
					<div>
						<p class="eyebrow">Collections</p>
						<h3>Rent performance</h3>
					</div>
					<strong class="big-number">{billed ? Math.round((collected / billed) * 100) : 0}%</strong>
				</div>
				<div class="progress">
					<span style={`width:${billed ? Math.min(100, (collected / billed) * 100) : 0}%`}></span>
				</div>
				<div class="split">
					<span>Collected <strong>{money(collected)}</strong></span><span
						>Outstanding <strong>{money(outstanding)}</strong></span
					>
				</div>
				<p class="muted">
					Payment allocation is used for charge-level arrears, so the number remains explainable.
				</p>
			</section>
		</div>
	{:else if view === 'properties'}
		<section class="report-card">
			<div class="card-heading">
				<div>
					<p class="eyebrow">Property performance</p>
					<h3>Which locations are carrying the portfolio?</h3>
				</div>
				<select bind:value={propertyFilter}
					><option value="all">All properties</option>{#each properties as property}<option
							value={property.id}>{property.name}</option
						>{/each}</select
				>
			</div>
			<div class="table-wrap">
				<table>
					<thead
						><tr
							><th>Property</th><th>Spaces</th><th>Occupancy</th><th>Rent potential</th><th
								>Billed</th
							><th>Collected</th><th>Arrears</th><th>Net position</th></tr
						></thead
					><tbody
						>{#each propertyRows().filter((row) => propertyFilter === 'all' || row.property.id === propertyFilter) as row}<tr
								><td
									><strong>{row.property.name}</strong><small
										>{row.property.city ?? 'Location not set'}</small
									></td
								><td>{row.occupied} / {row.spaces}</td><td
									>{row.spaces ? Math.round((row.occupied / row.spaces) * 100) : 0}%</td
								><td>{money(row.potential)}</td><td>{money(row.billed)}</td><td
									>{money(row.collected)}</td
								><td class:warning={row.arrears > 0}>{money(row.arrears)}</td><td
									class:positive={row.net >= 0}
									class:warning={row.net < 0}>{money(row.net)}</td
								></tr
							>{:else}<tr
								><td colspan="8" class="empty"
									>Add properties and spaces to start comparing performance.</td
								></tr
							>{/each}</tbody
					>
				</table>
			</div>
		</section>
	{:else if view === 'tenants'}
		<div class="metric-grid compact">
			<div class="metric">
				<span>Active tenants</span><strong>{tenantRows().filter((row) => row.active).length}</strong
				>
			</div>
			<div class="metric">
				<span>New in period</span><strong
					>{tenancies.filter((item) => inRange(item.start_date)).length}</strong
				>
			</div>
			<div class="metric">
				<span>Move-outs in period</span><strong
					>{tenancies.filter((item) => inRange(item.end_date)).length}</strong
				>
			</div>
			<div class="metric">
				<span>Lease expiries · 90 days</span><strong>{leaseExpiry(90).length}</strong>
			</div>
		</div>
		<section class="report-card">
			<div class="card-heading">
				<div>
					<p class="eyebrow">Tenant and lease analytics</p>
					<h3>Occupancy relationships and balances</h3>
				</div>
				<a class="text-link" href={`/workspace/${data.organization.id}/people`}
					>Open people & leases →</a
				>
			</div>
			<div class="table-wrap">
				<table>
					<thead
						><tr
							><th>Tenant</th><th>Current space</th><th>Lease status</th><th>Start / end</th><th
								>Paid in period</th
							><th>Balance</th></tr
						></thead
					><tbody
						>{#each tenantRows() as row}<tr
								><td
									><strong>{row.person.first_name} {row.person.last_name}</strong><small
										>{row.person.email ?? 'No email'}</small
									></td
								><td
									>{row.latest
										? `${propertyName(spaces.find((space) => space.id === row.latest.space_id)?.property_id)} · ${spaces.find((space) => space.id === row.latest.space_id)?.name ?? 'Space'}`
										: 'No tenancy'}</td
								><td
									><span class="tag" class:tag-good={row.active}
										>{row.active ? 'Active' : 'Historical'}</span
									></td
								><td
									>{row.latest
										? `${dateLabel(row.latest.start_date)} → ${dateLabel(row.latest.end_date)}`
										: '—'}</td
								><td>{money(row.paid)}</td><td class:warning={row.balance > 0}
									>{money(row.balance)}</td
								></tr
							>{:else}<tr
								><td colspan="6" class="empty"
									>Add tenant and lease records to see tenant analytics.</td
								></tr
							>{/each}</tbody
					>
				</table>
			</div>
		</section>
	{:else if view === 'revenue'}
		<div class="report-grid two">
			<section class="report-card">
				<div class="card-heading">
					<div>
						<p class="eyebrow">Revenue and collections</p>
						<h3>Money in the selected period</h3>
					</div>
				</div>
				<div class="finance-lines">
					<div><span>Rent billed</span><strong>{money(billed)}</strong></div>
					<div><span>Rent collected</span><strong>{money(collected)}</strong></div>
					<div>
						<span>Outstanding rent</span><strong class="warning-text">{money(outstanding)}</strong>
					</div>
					<div>
						<span>Deposits and other charges</span><strong
							>{money(sum(periodCharges.filter((item) => item.charge_type !== 'rent')))}</strong
						>
					</div>
				</div>
				<div class="method-list">
					{#each [...new Set(periodPayments.map((item) => item.method))] as method}<div>
							<span>{method.replaceAll('_', ' ')}</span><strong
								>{money(sum(periodPayments.filter((item) => item.method === method)))}</strong
							>
						</div>{:else}<p class="muted">No payments recorded for this period.</p>{/each}
				</div>
			</section>
			<section class="report-card">
				<div class="card-heading">
					<div>
						<p class="eyebrow">Payment allocation</p>
						<h3>Match receipts to charges</h3>
						<p class="muted">Linking payments to charges makes arrears auditable.</p>
					</div>
				</div>
				<form method="POST" action="?/allocatePayment" class="form-stack">
					<label
						>Payment<select name="payment_id" required
							><option value="">Choose payment</option
							>{#each payments.filter((payment) => allocationForPayment(payment.id) < Number(payment.amount)) as payment}<option
									value={payment.id}
									>{dateLabel(payment.payment_date)} · {money(payment.amount)} · {payment.reference ??
										payment.method}</option
								>{/each}</select
						></label
					><label
						>Charge<select name="charge_id" required
							><option value="">Choose charge</option>{#each periodCharges as charge}<option
									value={charge.id}
									>{dateLabel(charge.due_on)} · {charge.description} · {money(
										charge.amount - allocationForCharge(charge.id)
									)} open</option
								>{/each}</select
						></label
					><label>Amount<input name="amount" type="number" step="0.01" min="0.01" required /></label
					><button class="primary" type="submit">Allocate payment <span>→</span></button>
				</form>
			</section>
		</div>
	{:else if view === 'maintenance'}
		<div class="metric-grid compact">
			<div class="metric"><span>Open requests</span><strong>{openMaintenance.length}</strong></div>
			<div class="metric">
				<span>Completed in period</span><strong
					>{maintenance.filter(
						(item) =>
							['completed', 'closed'].includes(item.status) &&
							inRange(item.completed_at ?? item.updated_at)
					).length}</strong
				>
			</div>
			<div class="metric">
				<span>Overdue SLA</span><strong class:warning-text={overdueMaintenance.length > 0}
					>{overdueMaintenance.length}</strong
				>
			</div>
			<div class="metric">
				<span>Maintenance cost</span><strong>{money(maintenanceCost)}</strong>
			</div>
		</div>
		<div class="report-grid two">
			<section class="report-card">
				<div class="card-heading">
					<div>
						<p class="eyebrow">By category</p>
						<h3>Where work is concentrated</h3>
					</div>
				</div>
				{#each maintenanceByCategory() as item}<div class="bar-line">
						<span>{item.category.replaceAll('_', ' ')}</span><strong
							>{item.count} · {money(item.cost)}</strong
						><i
							style={`width:${maintenance.length ? Math.max(6, (item.count / maintenance.length) * 100) : 0}%`}
						></i>
					</div>{:else}<p class="empty">No maintenance requests recorded.</p>{/each}
			</section>
			<section class="report-card">
				<div class="card-heading">
					<div>
						<p class="eyebrow">By vendor</p>
						<h3>Delivery and spend</h3>
					</div>
					<a class="text-link" href={`/workspace/${data.organization.id}/maintenance`}
						>Open maintenance →</a
					>
				</div>
				{#each vendors as vendor}<div class="insight-row">
						<span
							>{vendor.business_name}<small
								>{vendor.specialties?.join?.(', ') ?? 'General contractor'}</small
							></span
						><strong
							>{money(
								sum(
									maintenance.filter((item) => item.vendor_id === vendor.id),
									'actual_cost'
								)
							)}</strong
						>
					</div>{:else}<p class="empty">Add vendors to compare contractor cost.</p>{/each}
			</section>
		</div>
	{:else if view === 'finance'}
		<div class="report-grid two">
			<section class="report-card">
				<div class="card-heading">
					<div>
						<p class="eyebrow">Operating finance</p>
						<h3>Record a property expense</h3>
						<p class="muted">
							Rates, insurance, utilities, security, staff and contractor costs roll into net
							position.
						</p>
					</div>
				</div>
				<form method="POST" action="?/addExpense" class="form-stack">
					<div class="form-grid two">
						<label
							>Property<select name="property_id" required
								><option value="">Choose property</option>{#each properties as property}<option
										value={property.id}>{property.name}</option
									>{/each}</select
							></label
						><label
							>Category<select name="category" required
								>{#each ['rates', 'insurance', 'utilities', 'security', 'cleaning', 'staff', 'repairs', 'contractor', 'management_fee', 'other'] as category}<option
										value={category}>{category.replaceAll('_', ' ')}</option
									>{/each}</select
							></label
						>
					</div>
					<div class="form-grid two">
						<label
							>Description<input
								name="description"
								required
								placeholder="City rates — September"
							/></label
						><label>Amount<input name="amount" type="number" min="0" step="0.01" required /></label>
					</div>
					<div class="form-grid two">
						<label>Date<input name="expense_date" type="date" value={iso(today)} required /></label
						><label
							>Reference<input name="reference" placeholder="Invoice or receipt number" /></label
						>
					</div>
					<button class="primary" type="submit">Record expense <span>→</span></button>
				</form>
			</section>
			<section class="report-card">
				<div class="card-heading">
					<div>
						<p class="eyebrow">Net operating position</p>
						<h3>Revenue less property costs</h3>
					</div>
				</div>
				<div class="finance-lines">
					<div><span>Collected revenue</span><strong>{money(collected)}</strong></div>
					<div><span>Operating expenses</span><strong>{money(sum(periodExpenses))}</strong></div>
					<div><span>Maintenance costs</span><strong>{money(maintenanceCost)}</strong></div>
					<div class="total-line">
						<span>Net operating position</span><strong
							class:positive={collected - sum(periodExpenses) - maintenanceCost >= 0}
							>{money(collected - sum(periodExpenses) - maintenanceCost)}</strong
						>
					</div>
				</div>
				<p class="muted">This is an operating view. It excludes financing, tax and depreciation.</p>
			</section>
		</div>
		<section class="report-card">
			<div class="card-heading">
				<div>
					<p class="eyebrow">Expense ledger</p>
					<h3>Recent operating costs</h3>
				</div>
			</div>
			<div class="table-wrap">
				<table>
					<thead
						><tr
							><th>Date</th><th>Property</th><th>Category</th><th>Description</th><th>Amount</th
							></tr
						></thead
					><tbody
						>{#each periodExpenses as expense}<tr
								><td>{dateLabel(expense.expense_date)}</td><td
									>{propertyName(expense.property_id)}</td
								><td>{expense.category.replaceAll('_', ' ')}</td><td
									>{expense.description}<small>{expense.reference ?? ''}</small></td
								><td>{money(expense.amount)}</td></tr
							>{:else}<tr><td colspan="5" class="empty">No expenses in this period.</td></tr
							>{/each}</tbody
					>
				</table>
			</div>
		</section>
	{:else}
		<section class="report-card">
			<div class="card-heading">
				<div>
					<p class="eyebrow">Operational controls</p>
					<h3>Data quality alerts</h3>
					<p class="muted">Resolve these gaps to improve the reliability of your reports.</p>
				</div>
				<span class="signal">{dataQuality().length} open checks</span>
			</div>
			<div class="quality-list">
				{#each dataQuality() as item}<a href={`/workspace/${data.organization.id}/${item.href}`}
						><span><strong>{item.count}</strong>{item.label}</span><span>Review →</span></a
					>{:else}<div class="empty">
						Your core records are complete for the selected checks.
					</div>{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	.reports-shell {
		display: grid;
		gap: 1.15rem;
	}
	.report-toolbar {
		display: flex;
		justify-content: space-between;
		gap: 1.5rem;
		align-items: end;
	}
	.report-toolbar h2 {
		margin: 0.15rem 0 0.35rem;
		font-size: clamp(1.65rem, 3vw, 2.7rem);
		letter-spacing: -0.06em;
	}
	.report-toolbar h2 span {
		color: #b6d84a;
	}
	.muted {
		color: #6e8790;
	}
	.period-control {
		display: flex;
		gap: 0.6rem;
		align-items: end;
		flex-wrap: wrap;
	}
	.period-control label {
		font-size: 0.75rem;
		color: #6e8790;
	}
	.period-control select,
	.period-control input {
		display: block;
		margin-top: 0.3rem;
		min-width: 145px;
	}
	.report-tabs {
		display: flex;
		gap: 0.35rem;
		overflow: auto;
		padding-bottom: 0.15rem;
	}
	.report-tabs button {
		border: 1px solid #dce6df;
		background: #fff;
		color: #54737a;
		border-radius: 999px;
		padding: 0.65rem 0.9rem;
		white-space: nowrap;
		cursor: pointer;
	}
	.report-tabs button.active {
		background: #084f48;
		color: #fff;
		border-color: #084f48;
	}
	.metric-grid {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 0.8rem;
	}
	.metric-grid.compact {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}
	.metric {
		background: #fff;
		border: 1px solid #dce6df;
		border-radius: 16px;
		padding: 1rem;
		min-height: 114px;
	}
	.metric.accent {
		background: #084f48;
		color: #fff;
		border-color: #084f48;
	}
	.metric span,
	.metric small {
		display: block;
		color: #779099;
		font-size: 0.76rem;
	}
	.metric.accent span,
	.metric.accent small {
		color: #c7dfd6;
	}
	.metric strong {
		display: block;
		font-size: 1.65rem;
		letter-spacing: -0.05em;
		margin: 0.45rem 0;
	}
	.report-grid {
		display: grid;
		gap: 1rem;
	}
	.report-grid.two {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.report-card {
		background: #fff;
		border: 1px solid #dce6df;
		border-radius: 18px;
		padding: 1.25rem;
		min-width: 0;
	}
	.card-heading {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: flex-start;
		margin-bottom: 1rem;
	}
	.card-heading h3 {
		margin: 0.2rem 0;
		font-size: 1.35rem;
		letter-spacing: -0.04em;
	}
	.card-heading select {
		max-width: 220px;
	}
	.eyebrow {
		font-size: 0.7rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #5c8584;
		margin: 0;
	}
	.signal,
	.tag {
		background: #edf4d7;
		color: #597c45;
		border-radius: 999px;
		padding: 0.4rem 0.65rem;
		font-size: 0.75rem;
		white-space: nowrap;
	}
	.big-number {
		font-size: 2rem;
		color: #084f48;
	}
	.progress {
		height: 12px;
		background: #edf1ed;
		border-radius: 20px;
		overflow: hidden;
	}
	.progress span {
		display: block;
		height: 100%;
		background: #9bc84a;
		border-radius: 20px;
	}
	.split {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin: 1rem 0;
	}
	.split span,
	.finance-lines span {
		color: #6e8790;
	}
	.split strong,
	.finance-lines strong {
		display: block;
		color: #123e3b;
		margin-top: 0.25rem;
	}
	.insight-list,
	.finance-lines,
	.method-list,
	.quality-list {
		display: grid;
		gap: 0.15rem;
	}
	.insight-list > div,
	.finance-lines > div,
	.method-list > div,
	.insight-row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.8rem 0;
		border-bottom: 1px solid #edf1ed;
	}
	.warning,
	.warning-text {
		color: #b75538 !important;
	}
	.positive {
		color: #388353 !important;
	}
	.total-line {
		border-top: 2px solid #dce6df;
		margin-top: 0.4rem;
		padding-top: 1rem !important;
	}
	.table-wrap {
		overflow: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		min-width: 760px;
	}
	th,
	td {
		text-align: left;
		padding: 0.8rem 0.65rem;
		border-bottom: 1px solid #edf1ed;
		font-size: 0.86rem;
		vertical-align: top;
	}
	th {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #799198;
	}
	td small,
	.insight-row small {
		display: block;
		color: #8aa0a4;
		margin-top: 0.25rem;
	}
	.tag-good {
		background: #e3f4e8;
		color: #27784c;
	}
	.bar-line {
		position: relative;
		display: flex;
		justify-content: space-between;
		padding: 0.8rem 0;
		border-bottom: 1px solid #edf1ed;
		text-transform: capitalize;
	}
	.bar-line i {
		position: absolute;
		left: 0;
		bottom: 0;
		height: 3px;
		background: #9bc84a;
		border-radius: 2px;
	}
	.form-stack {
		display: grid;
		gap: 0.75rem;
	}
	.form-stack label {
		display: grid;
		gap: 0.35rem;
		color: #3f6165;
		font-size: 0.8rem;
	}
	.form-grid {
		display: grid;
		gap: 0.75rem;
	}
	.form-grid.two {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.primary {
		border: 0;
		background: #084f48;
		color: #fff;
		border-radius: 10px;
		padding: 0.85rem 1rem;
		font-weight: 700;
		cursor: pointer;
		justify-self: start;
	}
	.primary span {
		color: #c4e442;
		margin-left: 0.5rem;
	}
	.text-link {
		color: #397c77;
		text-decoration: none;
		white-space: nowrap;
	}
	.empty {
		padding: 1.5rem;
		text-align: center;
		color: #799198;
	}
	.quality-list a {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid #e4ece5;
		border-radius: 12px;
		color: #255e5a;
		text-decoration: none;
	}
	.quality-list a:hover {
		background: #f5f9f0;
	}
	.quality-list strong {
		display: inline-grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: #edf4d7;
		margin-right: 0.65rem;
		color: #567c45;
	}
	@media (max-width: 1100px) {
		.metric-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (max-width: 760px) {
		.report-toolbar {
			display: grid;
		}
		.period-control {
			align-items: stretch;
		}
		.period-control label {
			flex: 1;
		}
		.period-control select,
		.period-control input {
			width: 100%;
			min-width: 0;
		}
		.metric-grid,
		.metric-grid.compact,
		.report-grid.two,
		.form-grid.two {
			grid-template-columns: 1fr;
		}
		.report-card {
			padding: 1rem;
		}
		.split {
			display: grid;
		}
		.report-tabs {
			margin-inline: -0.25rem;
			padding-inline: 0.25rem;
		}
	}
</style>
