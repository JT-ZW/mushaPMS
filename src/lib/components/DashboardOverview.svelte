<script lang="ts">
	import { resolve } from '$app/paths';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import type { DashboardSnapshot } from '$lib/dashboard/snapshot';
	let {
		snapshot,
		periods = {},
		organization,
		months = [],
		demo = false
	} = $props<{
		snapshot: DashboardSnapshot;
		periods?: Record<
			string,
			Pick<
				DashboardSnapshot,
				'month' | 'finance' | 'monthly' | 'categories' | 'expenseTotal' | 'recentPayments'
			>
		>;
		organization: { id: string; name: string; currency_code: string };
		months?: string[];
		demo?: boolean;
	}>();
	let financialMonth = $state<string | null>(null);
	const s: DashboardSnapshot = $derived({
		...snapshot,
		...periods[financialMonth ?? snapshot.month]
	});
	function changeMonth(event: Event) {
		const month = (event.currentTarget as HTMLSelectElement).value;
		if (!periods[month]) return;
		financialMonth = month;
		selectedMonth = null;
		const url = new URL(page.url);
		url.searchParams.set('month', month);
		// Preserve the already resolved current route while updating its query.
  // eslint-disable-next-line svelte/no-navigation-without-resolve
  replaceState(url, page.state);
	}
	let search = $state('');
	let selectedMonth = $state<string | null>(null);
	let refreshing = $state(false);
	let refreshError = $state(false);
	const money = (amount: number) =>
		new Intl.NumberFormat('en', {
			style: 'currency',
			currency: organization.currency_code,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(amount);
	const compact = (amount: number) =>
		new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(amount);
	const monthLabel = (month: string, short = false) =>
		new Intl.DateTimeFormat('en', {
			month: short ? 'short' : 'long',
			year: short ? undefined : 'numeric',
			timeZone: 'UTC'
		}).format(new Date(`${month}-01T00:00:00Z`));
	const dateLabel = (value: string) =>
		new Intl.DateTimeFormat('en', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
	const href = (section: string) =>
		demo
			? `${resolve('/demo')}?view=${section}`
			: resolve(`/workspace/${organization.id}/${section}`);
	const maxValue = $derived(
		Math.max(
			1,
			...s.monthly.flatMap((row: DashboardSnapshot['monthly'][number]) => [
				row.charges,
				row.receipts
			])
		)
	);
	const activeMonth = $derived(
		s.monthly.find((row: DashboardSnapshot['monthly'][number]) => row.month === selectedMonth) ??
			s.monthly[s.monthly.length - 1]
	);
	const filtered = $derived(
		s.propertyHealth.filter((row: DashboardSnapshot['propertyHealth'][number]) =>
			`${row.name} ${row.city ?? ''}`.toLowerCase().includes(search.toLowerCase())
		)
	);
	const occupancy = $derived(
		s.counts.rentableSpaces
			? Math.round((s.counts.occupiedSpaces / s.counts.rentableSpaces) * 100)
			: null
	);
	const colors = ['#365c49', '#c8d7b2', '#d8c9a7', '#9caaa3'];
	const labels: Record<string, string> = {
		occupied: 'Occupied',
		vacant: 'Vacant',
		reserved: 'Reserved',
		maintenance: 'Maintenance'
	};
	const donut = $derived.by(() => {
		let position = 0;
		return s.counts.rentableSpaces
			? `conic-gradient(${s.occupancy
					.map((row: DashboardSnapshot['occupancy'][number], i: number) => {
						const start = position;
						position += (row.count / s.counts.rentableSpaces) * 100;
						return `${colors[i]} ${start}% ${position}%`;
					})
					.join(',')})`
			: '#edf0e7';
	});
	const pretty = (value: string) => value.replaceAll('_', ' ').replace(/^client |^workspace /, '');
	const activitySection = (entity: string) =>
		entity.includes('payment') || entity.includes('charge')
			? 'finance'
			: entity.includes('maintenance')
				? 'maintenance'
				: entity === 'property' || entity === 'space'
					? 'properties'
					: entity === 'tenancy' || entity === 'person'
						? 'people'
						: 'settings';
	async function refresh() {
		refreshing = true;
		refreshError = false;
		try {
			await invalidateAll();
		} catch {
			refreshError = true;
		} finally {
			refreshing = false;
		}
	}
</script>

<!-- All workspace links are resolved in the href helper above. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<div class="manager-dashboard">
	<header class="dashboard-heading">
		<div>
			<p class="eyebrow">
				WORKSPACE / OVERVIEW {#if demo}<span class="demo-tag">SAMPLE DATA</span>{/if}
			</p>
			<h1>A clearer view of <em>your portfolio.</em></h1>
			<p>{organization.name} <span>·</span> Operations as of {dateLabel(s.today)}</p>
		</div>
		<div class="heading-actions">
			<button
				class="refresh"
				type="button"
				disabled={refreshing}
				onclick={refresh}
				aria-label="Refresh dashboard">{refreshing ? 'Refreshing…' : '↻ Refresh'}</button
			><a class="primary" href={href('new-property')}>+ Add property</a>
		</div>
	</header>
	{#if refreshError}<p role="alert" class="notice">
			Refresh did not complete. Please try again.
		</p>{/if}
	<div class="period-toolbar">
		<div>
			<span class="live-dot"></span><span
				>Current portfolio <b>·</b> Financial period: <strong>{monthLabel(s.month)}</strong></span
			>
		</div>
		{#if !demo}<div class="month-control">
				<label for="dashboard-month">Financial month</label><select
					id="dashboard-month"
					name="month"
					value={s.month}
					onchange={changeMonth}
					>{#each months as month (month)}<option value={month}>{monthLabel(month)}</option
						>{/each}</select
				>
			</div>{:else}<span class="period-note">Illustrative workspace · no live records</span>{/if}
	</div>
	<section class="metric-grid" aria-label="Key portfolio metrics">
		<a class="metric" href={href('properties')}
			><div class="metric-label">
				<span>Active properties</span><span class="metric-symbol" aria-hidden="true">▦</span>
			</div>
			<strong>{s.counts.properties}</strong>
			<p>
				{s.counts.rentableSpaces} rentable spaces
				<span>· {s.counts.activeTenancies} active leases</span>
			</p>
			<span class="metric-link">Explore portfolio ↗</span></a
		>
		<a class="metric received-metric" href={href('finance')}
			><div class="metric-label">
				<span>Cash received</span><span class="metric-symbol" aria-hidden="true">↙</span>
			</div>
			<strong>{money(s.finance.receipts)}</strong>
			<p>
				{s.finance.receiptCount} receipts in {monthLabel(s.month, true)}
				<span>· {organization.currency_code}</span>
			</p>
			<span class="metric-link">View receipts ↗</span></a
		>
		<a class="metric" class:warning={s.finance.overdue > 0} href={href('finance')}
			><div class="metric-label">
				<span>Overdue balance</span><span class="metric-symbol" aria-hidden="true">◷</span>
			</div>
			<strong>{money(s.finance.overdue)}</strong>
			<p>{s.finance.overdueCount} unpaid or partially paid charges</p>
			<span class="metric-link">All periods · due before today ↗</span></a
		>
		<a class="metric" href={href('maintenance')}
			><div class="metric-label">
				<span>Open maintenance</span><span class="metric-symbol" aria-hidden="true">⌁</span>
			</div>
			<strong>{s.counts.openMaintenance}<small>requests</small></strong>
			<p>
				{s.counts.urgentMaintenance
					? `${s.counts.urgentMaintenance} urgent · needs attention`
					: 'No urgent requests'} <span>· current</span>
			</p>
			<span class="metric-link">View work queue ↗</span></a
		>
	</section>
	<div class="dashboard-row chart-row">
		<section class="panel cashflow-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">FINANCIAL PERSPECTIVE</p>
					<h2>Charges & cash receipts</h2>
				</div>
				<a href={href('reports')}>Reports ↗</a>
			</div>
			<div class="chart-summary">
				<div>
					<span>{monthLabel(activeMonth.month)}</span><strong
						>{money(activeMonth.receipts)} <small>received</small></strong
					>
				</div>
				<div class="chart-legend">
					<span><i class="due-key"></i> Charges due</span><span
						><i class="received-key"></i> Cash received</span
					>
				</div>
			</div>
			<div class="bar-graph" aria-label="Six-month charges and cash receipts">
				<div class="y-labels" aria-hidden="true">
					<span>{compact(maxValue)}</span><span>{compact(maxValue / 2)}</span><span>0</span>
				</div>
				<div class="graph-columns">
					{#each s.monthly as month (month.month)}<button
							type="button"
							class="month-column"
							class:selected={activeMonth.month === month.month}
							aria-pressed={activeMonth.month === month.month}
							aria-label={`${monthLabel(month.month)}: charges ${money(month.charges)}, receipts ${money(month.receipts)}`}
							title={`${monthLabel(month.month)} · Due ${money(month.charges)} · Received ${money(month.receipts)}`}
							onclick={() => (selectedMonth = month.month)}
							><span class="bar-pair"
								><i class="charge-bar" style:height={`${(month.charges / maxValue) * 100}%`}></i><i
									class="receipt-bar"
									style:height={`${(month.receipts / maxValue) * 100}%`}
								></i></span
							><span class="month-label">{monthLabel(month.month, true)}</span></button
						>{/each}
				</div>
			</div>
			<p class="chart-note">
				Charges by due month; receipts by payment date. These measure different flows.
			</p>
			<details class="chart-data">
				<summary>View exact chart values</summary>
				<table>
					<caption>Six-month charges and receipts ({organization.currency_code})</caption><thead
						><tr><th>Month</th><th>Charges due</th><th>Cash received</th></tr></thead
					><tbody
						>{#each s.monthly as row (row.month)}<tr
								><th>{monthLabel(row.month)}</th><td>{money(row.charges)}</td><td
									>{money(row.receipts)}</td
								></tr
							>{/each}</tbody
					>
				</table>
			</details>
		</section>
		<section class="panel occupancy-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">SPACE TO PERFORM</p>
					<h2>Occupancy snapshot</h2>
				</div>
				<a href={href('properties')} aria-label="View property occupancy">↗</a>
			</div>
			<div class="occupancy-content">
				<div
					class="donut"
					style:background={donut}
					role="img"
					aria-label={occupancy === null
						? 'No rentable spaces'
						: `${occupancy}% occupied, ${s.counts.occupiedSpaces} of ${s.counts.rentableSpaces} rentable spaces`}
				>
					<div>
						<strong>{occupancy === null ? '—' : `${occupancy}%`}</strong><small
							>{occupancy === null ? 'No spaces yet' : 'occupied'}</small
						>
					</div>
				</div>
				<div class="occupancy-legend">
					{#each s.occupancy as row, i (row.status)}<div>
							<span><i style:background={colors[i]}></i>{labels[row.status]}</span><strong
								>{row.count}</strong
							>
						</div>{/each}
				</div>
			</div>
			<p class="chart-note">
				Current space status. Counts active terminal spaces in active properties, excluding
				subdivided parents.
			</p>
		</section>
	</div>
	<div class="settlement-strip">
		<div>
			<span class="eyebrow">CHARGE SETTLEMENT / {monthLabel(s.month).toUpperCase()}</span><strong
				>{s.finance.settlementRate === null
					? 'No charges due'
					: `${s.finance.settlementRate}% settled`}</strong
			>
		</div>
		<div class="settlement-progress">
			<div class="progress-track"><i style:width={`${s.finance.settlementRate ?? 0}%`}></i></div>
			<p>{money(s.finance.settled)} allocated against {money(s.finance.due)} due this month</p>
		</div>
		<a href={href('finance')}>Open collections ↗</a>
	</div>
	<div class="dashboard-row">
		<section class="panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">MONEY IN MOTION</p>
					<h2>Recent receipts</h2>
				</div>
				<a href={href('finance')}>All receipts ↗</a>
			</div>
			{#if s.recentPayments.length}<div class="record-list">
					{#each s.recentPayments as payment (payment.id)}<a
							class="record-row"
							href={href('finance')}
							><span class="record-icon" aria-hidden="true">↙</span>
							<div>
								<strong>{payment.location}</strong><small
									>{dateLabel(payment.payment_date)} · {pretty(payment.method)}</small
								>
							</div>
							<b>{money(payment.amount)}</b></a
						>{/each}
				</div>{:else}<div class="empty-state">
					<span>↙</span><strong>No receipts in this period.</strong>
					<p>Recorded payments will appear here with their property context.</p>
					<a href={href('finance')}>Record a payment ↗</a>
				</div>{/if}
		</section>
		<section class="panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">CARE & FOLLOW-THROUGH</p>
					<h2>Maintenance queue</h2>
				</div>
				<a href={href('maintenance')}>All requests ↗</a>
			</div>
			{#if s.maintenance.length}<div class="record-list">
					{#each s.maintenance as request (request.id)}<a
							class="record-row"
							href={href('maintenance')}
							><span
								class="priority-indicator"
								class:urgent={request.priority === 'urgent'}
								aria-hidden="true">{request.priority === 'urgent' ? '!' : '⌁'}</span
							>
							<div>
								<strong>{request.title}</strong><small
									>{request.location} · {pretty(request.status)}</small
								>
							</div>
							<span class="priority" class:urgent={request.priority === 'urgent'}
								>{request.overdue ? 'Past SLA' : request.priority}</span
							></a
						>{/each}
				</div>{:else}<div class="empty-state">
					<span>✓</span><strong>No open maintenance.</strong>
					<p>Reported issues appear here, ordered by priority and age.</p>
				</div>{/if}
		</section>
	</div>
	<div class="dashboard-row chart-row">
		<section class="panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">PROPERTY BY PROPERTY</p>
					<h2>Portfolio performance</h2>
				</div>
				<a href={href('properties')}>View all ↗</a>
			</div>
			<label class="property-search"
				><span>Search properties</span><input
					type="search"
					bind:value={search}
					placeholder="Property name or city"
				/></label
			>
			<div class="property-grid">
				{#each filtered as property, i (property.id)}<a
						class="property-card"
						href={demo
							? resolve('/demo')
							: resolve(`/workspace/${organization.id}/properties/${property.id}`)}
						><div class="property-card-top">
							<span class="property-monogram" aria-hidden="true"
								>{property.name.slice(0, 2).toUpperCase()}</span
							><span class="property-index">{String(i + 1).padStart(2, '0')} ↗</span>
						</div>
						<h3>{property.name}</h3>
						<p>{property.city || property.country || 'Location not set'}</p>
						<div class="property-occupancy">
							<strong
								>{property.spaces
									? `${Math.round((property.occupied / property.spaces) * 100)}%`
									: '—'}</strong
							><span>{property.occupied}/{property.spaces} spaces occupied</span>
						</div>
						<div class="progress-track">
							<i
								style:width={`${property.spaces ? (property.occupied / property.spaces) * 100 : 0}%`}
							></i>
						</div>
						<small
							>{property.maintenance
								? `${property.maintenance} open maintenance requests`
								: 'No open maintenance'}</small
						></a
					>{:else}<div class="empty-state">
						<strong>{search ? 'No matching properties.' : 'Your portfolio starts here.'}</strong>
						<p>
							{search
								? 'Try another name or city.'
								: 'Add a property and its spaces to start building the picture.'}
						</p>
						{#if !search}<a href={href('new-property')}>Add your first property ↗</a>{/if}
					</div>{/each}
			</div>
		</section>
		<section class="panel expense-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">OPERATING COSTS</p>
					<h2>Expense breakdown</h2>
				</div>
				<a href={href('reports')} aria-label="View expense reports">↗</a>
			</div>
			<div class="expense-total">
				<strong>{money(s.expenseTotal)}</strong><span
					>Approved expenses · {monthLabel(s.month, true)}</span
				>
			</div>
			{#if s.categories.length}<div class="expense-categories">
					{#each s.categories as category, i (category.category)}<div>
							<div>
								<span>{pretty(category.category)}</span><strong>{money(category.amount)}</strong>
							</div>
							<div class="progress-track">
								<i
									style:width={`${(category.amount / s.expenseTotal) * 100}%`}
									style:background={colors[i % colors.length]}
								></i>
							</div>
						</div>{/each}
				</div>{:else}<p class="empty-copy">No approved expenses recorded for this period.</p>{/if}
			<p class="chart-note">
				Based on approved expense records through today, regardless of payment status. Maintenance
				estimates are excluded.
			</p>
		</section>
	</div>
	<div class="dashboard-row">
		<section class="panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">YOUR NEXT MOVES</p>
					<h2>Needs attention</h2>
				</div>
				<span class="count-badge"
					>{s.finance.overdueCount + s.counts.urgentMaintenance + s.counts.renewals}</span
				>
			</div>
			{#if s.watchlist.length}<div class="record-list">
					{#each s.watchlist as item (`${item.kind}-${item.id}`)}<a
							class="record-row"
							href={href(item.section)}
							><span class="record-icon" aria-hidden="true"
								>{item.kind === 'maintenance' ? '!' : item.kind === 'arrears' ? '$' : '◷'}</span
							>
							<div><strong>{item.title}</strong><small>{item.detail}</small></div>
							<span aria-hidden="true">↗</span></a
						>{/each}
				</div>
				<p class="chart-note">
					Up to six items: urgent maintenance, unpaid overdue charges and leases ending within 60
					days.
				</p>{:else}<div class="empty-state">
					<span>✓</span><strong>No priority items right now.</strong>
					<p>Urgent requests, overdue balances and upcoming lease expiries appear here.</p>
				</div>{/if}
		</section>
		<section class="panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">THE WORKING RECORD</p>
					<h2>Recent activity</h2>
				</div>
				<span class="period-note">Latest 5 events</span>
			</div>
			{#if s.activity.length}<div class="record-list">
					{#each s.activity as item (item.id)}<a
							class="record-row activity-row"
							href={href(activitySection(item.entity_type))}
							><span class="activity-dot"></span>
							<div>
								<strong>{pretty(item.action)}</strong><small
									>{new Intl.DateTimeFormat('en', {
										dateStyle: 'medium',
										timeStyle: 'short',
										timeZone: 'UTC'
									}).format(new Date(item.created_at))} UTC</small
								>
							</div>
							<span aria-hidden="true">↗</span></a
						>{/each}
				</div>{:else}<div class="empty-state">
					<strong>Your workspace story starts here.</strong>
					<p>Updates appear as your team adds and changes records.</p>
				</div>{/if}
		</section>
	</div>
	<footer class="dashboard-foot">
		<span
			>Amounts in {organization.currency_code} · Financial records through {dateLabel(
				s.today
			)}</span
		><span>Portfolio and maintenance show current status.</span>
	</footer>
</div>

<style>
	.manager-dashboard {
		--ink: #243e33;
		--muted: #75806c;
		--line: #e0e4d9;
		color: var(--ink);
		font-family: var(--font-body);
	}
	.manager-dashboard * {
		box-sizing: border-box;
	}
	.manager-dashboard h1,
	.manager-dashboard h2,
	.manager-dashboard h3,
	.manager-dashboard p {
		margin-top: 0;
	}
	.dashboard-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 25px;
		margin-bottom: 26px;
	}
	.eyebrow {
		font-size: 8px;
		font-weight: 600;
		letter-spacing: 1.5px;
		color: #7d886f;
		margin: 0 0 10px;
	}
	.demo-tag {
		background: #e4ebd7;
		padding: 5px 7px;
		margin-left: 10px;
	}
	.dashboard-heading h1 {
		font-size: clamp(25px, 2.6vw, 39px);
		font-weight: 500;
		letter-spacing: -1.4px;
		line-height: 1.2;
		margin-bottom: 10px;
	}
	.dashboard-heading h1 em {
		font-family: Georgia, serif;
		font-weight: 400;
	}
	.dashboard-heading > div > p:last-child {
		font-size: 11px;
		color: var(--muted);
		margin: 0;
		line-height: 1.8;
	}
	.dashboard-heading p > span {
		margin: 0 8px;
	}
	.heading-actions {
		display: flex;
		gap: 9px;
		align-items: center;
	}
	.primary {
		display: inline-flex;
		background: #264636;
		color: #fff;
		border: 1px solid #264636;
		padding: 12px 16px;
		border-radius: 6px;
		font-size: 11px;
		text-decoration: none;
		white-space: nowrap;
	}
	.refresh {
		background: transparent;
		border: 0;
		color: #69775e;
		font: inherit;
		font-size: 10px;
		padding: 11px;
		cursor: pointer;
	}
	.refresh:disabled {
		opacity: 0.5;
		cursor: wait;
	}
	.period-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 19px;
		font-size: 10px;
		color: var(--muted);
	}
	.period-toolbar > div {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.live-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #6f8b55;
	}
	.period-toolbar b {
		margin: 0 7px;
		font-weight: 400;
	}
	.period-toolbar strong {
		font-weight: 500;
		color: #4b6040;
	}
	.period-toolbar .month-control {
		display: flex;
		align-items: center;
		gap: 7px;
	}
	.period-toolbar label {
		font-size: 9px;
	}
	.period-toolbar select {
		border: 1px solid #d9dfd0;
		background: #fffef9;
		border-radius: 5px;
		padding: 9px;
		font: inherit;
		font-size: 10px;
		color: #485e3c;
	}
	.period-note {
		font-size: 9px;
		color: #87917c;
		line-height: 1.6;
	}
	.metric-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 13px;
		margin-bottom: 18px;
	}
	.metric {
		padding: 20px 18px 15px;
		background: #fffefa;
		border: 1px solid var(--line);
		border-radius: 13px;
		text-decoration: none;
		color: inherit;
		min-width: 0;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}
	.metric:hover {
		transform: translateY(-3px);
		box-shadow: 0 10px 25px #203d320a;
	}
	.metric-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		font-size: 11px;
	}
	.metric-symbol {
		font-size: 17px;
		display: grid;
		place-items: center;
		width: 29px;
		height: 29px;
		border-radius: 50%;
		background: #edf0e6;
		color: #627750;
	}
	.metric > strong {
		display: block;
		font-size: clamp(22px, 2.2vw, 33px);
		letter-spacing: -1.2px;
		font-weight: 600;
		margin: 16px 0 10px;
		font-variant-numeric: tabular-nums;
		overflow-wrap: anywhere;
	}
	.metric strong small {
		font-size: 10px;
		font-weight: 400;
		letter-spacing: 0;
		margin-left: 10px;
		color: #7b866f;
	}
	.metric > p {
		font-size: 9px;
		color: #7a866e;
		line-height: 1.7;
		min-height: 30px;
		margin: 0 0 12px;
	}
	.metric-link {
		display: block;
		border-top: 1px solid #e5e9df;
		padding-top: 11px;
		font-size: 9px;
		color: #6e7e5e;
	}
	.received-metric {
		background: #284a39;
		border-color: #284a39;
		color: #fff;
	}
	.received-metric .metric-symbol {
		background: #ffffff14;
		color: #d6e5bc;
	}
	.received-metric p,
	.received-metric .metric-link {
		color: #c0d0b4;
	}
	.received-metric .metric-link {
		border-color: #ffffff24;
	}
	.metric.warning .metric-symbol {
		background: #f6ebd9;
		color: #9a7145;
	}
	.metric.warning > strong {
		color: #91613c;
	}
	.dashboard-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 18px;
		margin-bottom: 18px;
	}
	.chart-row {
		grid-template-columns: 1.6fr 1fr;
	}
	.panel {
		padding: 24px;
		background: #fffefa;
		border: 1px solid var(--line);
		border-radius: 14px;
		min-width: 0;
	}
	.panel-heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 18px;
		margin-bottom: 22px;
	}
	.panel-heading h2 {
		font-size: 17px;
		font-weight: 500;
		letter-spacing: -0.5px;
		margin: 0;
		line-height: 1.3;
	}
	.panel-heading .eyebrow {
		font-size: 7px;
		margin-bottom: 9px;
	}
	.panel-heading > a {
		font-size: 10px;
		white-space: nowrap;
		color: #748365;
		text-decoration: none;
		padding: 3px 0;
	}
	.chart-summary {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 24px;
	}
	.chart-summary > div > span {
		font-size: 9px;
		color: #7e8973;
	}
	.chart-summary strong {
		display: block;
		font-size: 23px;
		font-weight: 500;
		letter-spacing: -0.8px;
		margin-top: 8px;
	}
	.chart-summary strong small {
		font-size: 10px;
		font-weight: 400;
		letter-spacing: 0;
		color: #86917b;
		margin-left: 5px;
	}
	.chart-legend {
		display: flex;
		gap: 14px;
		font-size: 8px;
		color: #7c8770;
	}
	.chart-legend span {
		display: flex;
		gap: 5px;
		align-items: center;
	}
	.chart-legend i {
		width: 7px;
		height: 7px;
		border-radius: 2px;
	}
	.due-key {
		background: #d8e3c9;
	}
	.received-key {
		background: #3d634c;
	}
	.bar-graph {
		display: flex;
		gap: 12px;
		height: 180px;
	}
	.y-labels {
		width: 35px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		color: #88937d;
		font-size: 8px;
		padding-bottom: 25px;
	}
	.graph-columns {
		display: flex;
		flex: 1;
		min-width: 0;
		gap: 14px;
		background: repeating-linear-gradient(
			to top,
			transparent 0,
			transparent 76px,
			#e9ecdf 77px,
			#e9ecdf 78px
		);
		background-size: 100% 155px;
		background-repeat: no-repeat;
	}
	.month-column {
		padding: 0;
		flex: 1;
		min-width: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
		color: #89947d;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: end;
		font: inherit;
	}
	.bar-pair {
		height: 155px;
		display: flex;
		gap: 4px;
		align-items: end;
		width: 100%;
		max-width: 58px;
	}
	.bar-pair i {
		display: block;
		flex: 1;
		border-radius: 5px 5px 0 0;
		transition:
			height 0.5s,
			background 0.2s;
	}
	.charge-bar {
		background: #e4ebda;
	}
	.receipt-bar {
		background: #9bb18c;
	}
	.month-column.selected .receipt-bar {
		background: repeating-linear-gradient(135deg, #3c654b 0, #3c654b 5px, #658468 6px, #3c654b 7px);
	}
	.month-column.selected .charge-bar {
		background: #cadbb6;
	}
	.month-column:hover .receipt-bar {
		background: #476a50;
	}
	.month-label {
		display: block;
		text-align: center;
		font-size: 9px;
		height: 25px;
		padding-top: 13px;
	}
	.month-column.selected .month-label {
		color: #314c32;
		font-weight: 600;
	}
	.chart-note {
		font-size: 9px;
		line-height: 1.8;
		color: #8a947d;
		margin: 18px 0 0;
	}
	.chart-data {
		margin-top: 12px;
		color: #7a886b;
		font-size: 9px;
	}
	.chart-data summary {
		cursor: pointer;
	}
	.chart-data table {
		border-collapse: collapse;
		width: 100%;
		margin-top: 15px;
		font-size: 9px;
	}
	.chart-data th,
	.chart-data td {
		text-align: right;
		padding: 9px 4px;
		border-top: 1px solid var(--line);
	}
	.chart-data th:first-child {
		text-align: left;
	}
	.chart-data caption {
		text-align: left;
		margin-bottom: 10px;
	}
	.occupancy-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 28px;
		padding: 16px 0 12px;
	}
	.donut {
		width: 165px;
		height: 165px;
		border-radius: 50%;
		padding: 21px;
		flex: none;
		transform: rotate(-0.01deg);
	}
	.donut > div {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: #fffefa;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.donut strong {
		font-size: 32px;
		letter-spacing: -1.8px;
		font-weight: 500;
	}
	.donut small {
		font-size: 9px;
		color: #859277;
		margin-top: 7px;
	}
	.occupancy-legend {
		display: grid;
		gap: 17px;
		width: 130px;
	}
	.occupancy-legend > div {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		font-size: 10px;
	}
	.occupancy-legend span {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #7e8c6f;
	}
	.occupancy-legend i {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex: none;
	}
	.occupancy-legend strong {
		font-size: 12px;
		font-weight: 500;
	}
	.settlement-strip {
		border: 1px solid #dce4ce;
		background: #e9efde;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 30px;
		padding: 23px 25px;
		margin-bottom: 18px;
	}
	.settlement-strip .eyebrow {
		display: block;
		font-size: 7px;
	}
	.settlement-strip > div > strong {
		font-size: 20px;
		font-weight: 500;
		letter-spacing: -0.6px;
	}
	.settlement-progress {
		flex: 1;
		max-width: 400px;
	}
	.progress-track {
		height: 5px;
		background: #e6ebdc;
		border-radius: 5px;
		overflow: hidden;
	}
	.progress-track i {
		display: block;
		height: 100%;
		background: #6d8a55;
		border-radius: 5px;
	}
	.settlement-progress .progress-track {
		background: #d4dfc3;
	}
	.settlement-progress p {
		font-size: 9px;
		color: #7d8e69;
		margin: 10px 0 0;
		line-height: 1.6;
	}
	.settlement-strip > a {
		color: #5b714b;
		font-size: 10px;
		text-decoration: none;
		white-space: nowrap;
	}
	.record-list {
		display: grid;
	}
	.record-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px 0;
		border-top: 1px solid #e9ecdf;
		text-decoration: none;
		color: inherit;
		min-width: 0;
	}
	.record-row > div {
		flex: 1;
		min-width: 0;
	}
	.record-row strong {
		font-size: 11px;
		font-weight: 500;
		display: block;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}
	.record-row small {
		display: block;
		color: #8b967f;
		font-size: 9px;
		line-height: 1.7;
		margin-top: 5px;
	}
	.record-row > b {
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.record-row > span:last-child {
		font-size: 13px;
		color: #849375;
	}
	.record-icon,
	.priority-indicator {
		width: 31px;
		height: 31px;
		flex: none;
		display: grid;
		place-items: center;
		background: #edf1e5;
		border-radius: 9px;
		color: #748c5a;
		font-size: 17px;
	}
	.priority-indicator.urgent {
		background: #f6e7dc;
		color: #ae6547;
	}
	.priority {
		font-size: 8px !important;
		color: #758963 !important;
		background: #eef2e6;
		border-radius: 4px;
		padding: 6px 8px;
		white-space: nowrap;
		text-transform: capitalize;
	}
	.priority.urgent {
		background: #f7eadd;
		color: #a36a3c !important;
	}
	.empty-state {
		padding: 30px 6px;
		text-align: center;
		display: grid;
		justify-items: center;
		gap: 10px;
	}
	.empty-state > span {
		display: grid;
		place-items: center;
		background: #edf1e4;
		border-radius: 50%;
		width: 38px;
		height: 38px;
		color: #799360;
		font-size: 18px;
	}
	.empty-state strong {
		font-size: 12px;
		font-weight: 500;
	}
	.empty-state p {
		font-size: 10px;
		color: #8b967d;
		line-height: 1.8;
		max-width: 300px;
		margin: 0;
	}
	.empty-state a {
		font-size: 10px;
		color: #5a7445;
		text-decoration: none;
		padding: 8px;
	}
	.property-search {
		display: flex;
		align-items: center;
		gap: 18px;
		justify-content: space-between;
		border-bottom: 1px solid var(--line);
		padding-bottom: 18px;
		margin-bottom: 18px;
	}
	.property-search > span {
		font-size: 9px;
		color: #869279;
	}
	.property-search input {
		font: inherit;
		font-size: 10px;
		color: #5c704a;
		background: #f6f7ef;
		border: 1px solid #e2e6d8;
		border-radius: 5px;
		padding: 10px 12px;
		max-width: 65%;
		min-width: 0;
	}
	.property-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
		max-height: 530px;
		overflow: auto;
	}
	.property-card {
		display: block;
		border: 1px solid #e2e7d9;
		border-radius: 10px;
		text-decoration: none;
		color: inherit;
		padding: 18px;
		background: #fafbf5;
		transition: background 0.2s;
	}
	.property-card:hover {
		background: #eff3e6;
	}
	.property-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20px;
	}
	.property-monogram {
		font-size: 16px;
		letter-spacing: -1px;
		background: #e5ecda;
		color: #6d8255;
		border-radius: 7px;
		padding: 12px 10px;
		line-height: 1;
	}
	.property-index {
		font-size: 8px;
		color: #9aa58e;
	}
	.property-card h3 {
		font-size: 14px;
		letter-spacing: -0.3px;
		line-height: 1.4;
		font-weight: 500;
		margin: 0 0 6px;
		overflow-wrap: anywhere;
	}
	.property-card > p {
		font-size: 9px;
		color: #98a18d;
		margin-bottom: 18px;
	}
	.property-occupancy {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		align-items: center;
		margin-bottom: 10px;
	}
	.property-occupancy strong {
		font-size: 20px;
		font-weight: 500;
		letter-spacing: -0.7px;
	}
	.property-occupancy span {
		font-size: 8px;
		color: #89967b;
	}
	.property-card > small {
		display: block;
		font-size: 8px;
		color: #81916e;
		margin-top: 12px;
	}
	.expense-total {
		padding: 2px 0 24px;
	}
	.expense-total > strong {
		display: block;
		font-size: 30px;
		font-weight: 500;
		letter-spacing: -1.2px;
		overflow-wrap: anywhere;
	}
	.expense-total > span {
		display: block;
		font-size: 9px;
		color: #859573;
		margin-top: 9px;
	}
	.expense-categories {
		display: grid;
		gap: 21px;
	}
	.expense-categories > div > div:first-child {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 15px;
		font-size: 10px;
		margin-bottom: 10px;
	}
	.expense-categories span {
		text-transform: capitalize;
		color: #81916f;
	}
	.expense-categories strong {
		font-size: 10px;
		font-weight: 500;
	}
	.empty-copy {
		font-size: 11px;
		line-height: 1.9;
		color: #8b987d;
	}
	.count-badge {
		font-size: 11px;
		background: #eef2e4;
		padding: 6px 9px;
		border-radius: 7px;
	}
	.activity-dot {
		height: 7px;
		width: 7px;
		flex: none;
		border-radius: 50%;
		background: #a8bd93;
		margin: 0 8px;
	}
	.activity-row strong {
		text-transform: capitalize;
	}
	.dashboard-foot {
		display: flex;
		justify-content: space-between;
		gap: 20px;
		margin-top: 30px;
		color: #98a18a;
		font-size: 8px;
		line-height: 1.8;
	}
	.notice {
		padding: 15px;
		background: #fbecdd;
		color: #9d653f;
		font-size: 12px;
	}
	a:focus-visible,
	button:focus-visible,
	select:focus-visible,
	input:focus-visible,
	summary:focus-visible {
		outline: 2px solid #8a9e70;
		outline-offset: 4px;
	}
	.record-row:hover strong,
	.panel-heading > a:hover {
		color: #436629;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	@media (min-width: 1600px) {
		.metric > strong {
			font-size: 32px;
		}
	}
	@media (max-width: 1200px) {
		.metric-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.chart-row {
			grid-template-columns: 1.3fr 1fr;
		}
		.occupancy-content {
			flex-direction: column;
			gap: 20px;
		}
		.occupancy-legend {
			width: 100%;
			grid-template-columns: 1fr 1fr;
			gap: 14px;
		}
		.chart-legend {
			flex-direction: column;
			gap: 8px;
		}
		.panel {
			padding: 20px;
		}
		.settlement-strip {
			gap: 20px;
		}
		.period-toolbar label {
			display: none;
		}
	}
	@media (max-width: 950px) {
		.dashboard-row,
		.chart-row {
			grid-template-columns: 1fr;
		}
		.occupancy-content {
			flex-direction: row;
		}
		.occupancy-legend {
			width: 180px;
			grid-template-columns: 1fr;
		}
		.dashboard-heading {
			align-items: start;
			flex-direction: column;
		}
		.dashboard-heading h1 {
			font-size: 32px;
		}
		.period-toolbar {
			flex-wrap: wrap;
		}
		.heading-actions {
			width: 100%;
			justify-content: end;
		}
		.settlement-strip {
			flex-wrap: wrap;
		}
		.settlement-progress {
			max-width: none;
			flex-basis: 50%;
		}
		.dashboard-foot {
			flex-direction: column;
			gap: 5px;
		}
	}
	@media (max-width: 520px) {
		.dashboard-heading h1 {
			font-size: 29px;
		}
		.heading-actions {
			justify-content: space-between;
		}
		.metric-grid {
			gap: 9px;
		}
		.metric {
			padding: 15px 12px;
		}
		.metric-label {
			font-size: 10px;
		}
		.metric-symbol {
			width: 23px;
			height: 23px;
			font-size: 15px;
		}
		.metric > strong {
			font-size: 23px;
			letter-spacing: -1px;
		}
		.metric strong small {
			display: block;
			margin: 4px 0 0;
		}
		.metric > p {
			font-size: 8px;
		}
		.metric > p > span {
			display: none;
		}
		.metric-link {
			font-size: 8px;
		}
		.period-toolbar > div {
			font-size: 9px;
		}
		.period-toolbar .month-control {
			width: 100%;
			justify-content: space-between;
		}
		.period-toolbar select {
			flex: 1;
		}
		.panel {
			padding: 20px 16px;
		}
		.panel-heading h2 {
			font-size: 16px;
		}
		.panel-heading .eyebrow {
			font-size: 6px;
		}
		.chart-summary {
			align-items: start;
		}
		.chart-summary strong {
			font-size: 20px;
		}
		.chart-summary strong small {
			display: block;
			margin: 5px 0 0;
		}
		.graph-columns {
			gap: 9px;
		}
		.bar-pair {
			gap: 3px;
		}
		.y-labels {
			width: 28px;
		}
		.chart-legend {
			font-size: 7px;
		}
		.occupancy-content {
			gap: 22px;
		}
		.donut {
			width: 140px;
			height: 140px;
			padding: 18px;
		}
		.donut strong {
			font-size: 29px;
		}
		.occupancy-legend {
			width: 130px;
			gap: 14px;
		}
		.occupancy-legend > div {
			font-size: 9px;
		}
		.settlement-strip {
			padding: 20px;
		}
		.settlement-progress {
			flex-basis: 100%;
		}
		.record-row {
			gap: 9px;
		}
		.record-row > b {
			font-size: 10px;
			white-space: normal;
			text-align: right;
			max-width: 30%;
			overflow-wrap: anywhere;
		}
		.record-icon,
		.priority-indicator {
			width: 27px;
			height: 27px;
		}
		.record-row strong {
			font-size: 10px;
		}
		.priority {
			font-size: 7px !important;
		}
		.property-grid {
			grid-template-columns: 1fr;
			max-height: 600px;
		}
		.property-card {
			padding: 17px;
		}
		.property-search > span {
			font-size: 8px;
		}
		.property-card-top {
			margin-bottom: 15px;
		}
		.metric-link {
			line-height: 1.7;
		}
		.dashboard-heading p > span {
			margin: 0 5px;
		}
		.chart-data th,
		.chart-data td {
			font-size: 8px;
		}
		.dashboard-heading .eyebrow {
			font-size: 7px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.manager-dashboard * {
			transition: none !important;
		}
	}
</style>
