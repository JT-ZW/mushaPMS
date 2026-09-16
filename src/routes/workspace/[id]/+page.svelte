<script lang="ts">
	import WorkspaceChrome from '$lib/components/WorkspaceChrome.svelte';
	import { resolve } from '$app/paths';
	let { data } = $props();

	const currencyCode = $derived(data.organization.currency_code);
	const money = (amount: number) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currencyCode,
			maximumFractionDigits: 0
		}).format(amount);
	const occupancy = $derived(
		data.counts.rentableSpaces
			? Math.round((data.counts.occupiedSpaces / data.counts.rentableSpaces) * 100)
			: 0
	);
	const collectedRate = $derived(
		data.finance.dueThisMonth
			? Math.min(
					100,
					Math.round((data.finance.receivedThisMonth / data.finance.dueThisMonth) * 100)
				)
			: 0
	);
	const actionLabel = (action: string) =>
		action
			.replaceAll('_', ' ')
			.replace(/^client /, '')
			.replace(/^workspace /, '');
	const actionLink = (entity: string) => {
		if (entity === 'property' || entity === 'space') return 'portfolio';
		if (entity === 'person' || entity === 'tenancy') return 'people';
		if (entity.includes('payment') || entity.includes('charge')) return 'finance';
		if (entity.includes('maintenance')) return 'maintenance';
		return 'settings';
	};
</script>

<svelte:head><title>{data.organization.name} · Musha workspace</title></svelte:head>

<WorkspaceChrome
	organization={data.organization}
	modules={data.modules}
	active="overview"
	role={data.membership.role}
	supportMode={data.supportMode}
>
	<section class="topbar">
		<div>
			<p class="eyebrow">{data.organization.name} · {data.organization.currency_code}</p>
			<h1>Your operation, in view<span>.</span></h1>
			<p>A live picture of your portfolio, money, occupancies and work needing attention.</p>
		</div>
		<div class="quick-actions">
			<a class="secondary" href={resolve(`/workspace/${data.organization.id}/people`)}
				>Add tenancy</a
			><a class="primary" href={resolve(`/workspace/${data.organization.id}/finance`)}
				>Record payment <span>→</span></a
			>
		</div>
	</section>

	<section class="metric-grid" aria-label="Portfolio overview">
		<article class="metric feature">
			<span>Occupancy</span><strong>{occupancy}%</strong><small
				>{data.counts.occupiedSpaces} of {data.counts.rentableSpaces} rentable spaces occupied</small
			>
			<div class="meter"><i style={`width: ${occupancy}%`}></i></div>
		</article>
		<article class="metric">
			<span>Active tenancies</span><strong>{data.counts.activeTenancies}</strong><small
				>{data.counts.people} people on record</small
			>
		</article>
		<article class="metric">
			<span>Due this month</span><strong>{money(data.finance.dueThisMonth)}</strong><small
				>{collectedRate}% collected against due charges</small
			>
		</article>
		<article class="metric">
			<span>Received this month</span><strong>{money(data.finance.receivedThisMonth)}</strong><small
				>{data.recentPayments.length} recent payment entries</small
			>
		</article>
		<article class:attention={data.counts.openMaintenance > 0} class="metric">
			<span>Open maintenance</span><strong>{data.counts.openMaintenance}</strong><small
				>{data.counts.openMaintenance ? 'Requests in progress' : 'No open requests'}</small
			>
		</article>
	</section>

	<div class="dashboard-grid primary-grid">
		<section class="panel finance-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Collection pulse</p>
					<h2>Money at a glance</h2>
				</div>
				<a href={resolve(`/workspace/${data.organization.id}/finance`)}>Open collections →</a>
			</div>
			<div class="collection-summary">
				<div>
					<span>Outstanding picture</span><strong>{money(data.finance.outstanding)}</strong><small
						>Recorded charges less payments</small
					>
				</div>
				<div>
					<span>This month’s collection rate</span><strong>{collectedRate}%</strong><small
						>{money(data.finance.receivedThisMonth)} received of {money(
							data.finance.dueThisMonth
						)}</small
					>
				</div>
			</div>
			<div class="bar-chart">
				<div>
					<span>Due</span>
					<div class="track"><i class="due" style="width: 100%"></i></div>
					<b>{money(data.finance.dueThisMonth)}</b>
				</div>
				<div>
					<span>Received</span>
					<div class="track"><i class="received" style={`width: ${collectedRate}%`}></i></div>
					<b>{money(data.finance.receivedThisMonth)}</b>
				</div>
			</div>
			{#if data.finance.dueThisMonth === 0}<p class="quiet">
					Add charges or leases to begin seeing collection activity.
				</p>{/if}
		</section>
		<section class="panel watch-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Watchlist</p>
					<h2>Needs your attention</h2>
				</div>
				<span class="count">{data.watchlist.length}</span>
			</div>
			{#if data.watchlist.length === 0}<div class="all-clear">
					<span>✓</span><strong>You are clear for now.</strong>
					<p>Urgent maintenance, expiring leases, and overdue charge prompts will appear here.</p>
				</div>{:else}<div class="watch-list">
					{#each data.watchlist as item, index (`${item.kind}-${index}`)}<a
							href={resolve(`/workspace/${data.organization.id}${item.href}`)}
							><span class:urgent={item.kind === 'urgent'}
								>{item.kind === 'urgent' ? '!' : item.kind === 'lease' ? '◷' : '$'}</span
							>
							<div><strong>{item.title}</strong><small>{item.detail}</small></div>
							<b>→</b></a
						>{/each}
				</div>{/if}
		</section>
	</div>

	<div class="dashboard-grid portfolio-grid">
		<section class="panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Portfolio health</p>
					<h2>How each property is doing</h2>
				</div>
				<a href={resolve(`/workspace/${data.organization.id}/portfolio`)}>View portfolio →</a>
			</div>
			{#if data.propertyHealth.length === 0}<div class="empty">
					<strong>Your portfolio starts with a property.</strong>
					<p>Add your first managed location, then build its units, rooms or beds.</p>
					<a class="primary" href={resolve(`/workspace/${data.organization.id}/portfolio`)}
						>Add property <span>→</span></a
					>
				</div>{:else}<div class="property-list">
					{#each data.propertyHealth as property (property.id)}<article>
							<div class="property-title">
								<span>⌂</span>
								<div>
									<strong>{property.name}</strong><small
										>{property.city ?? property.country ?? 'Location not set'} · {property.status}</small
									>
								</div>
							</div>
							<div class="property-stats">
								<span>{property.occupied}/{property.spaces} occupied</span><span
									class:warning={property.maintenance > 0}
									>{property.maintenance
										? `${property.maintenance} request${property.maintenance === 1 ? '' : 's'}`
										: 'No maintenance'}</span
								>
							</div>
							<div class="property-meter">
								<i
									style={`width: ${property.spaces ? Math.round((property.occupied / property.spaces) * 100) : 0}%`}
								></i>
							</div>
						</article>{/each}
				</div>{/if}
		</section>
		<section class="panel readiness-panel">
			<p class="eyebrow">Workspace readiness</p>
			<h2>{data.setup.complete} of {data.setup.total} core records in place</h2>
			<p>Portfolio, spaces, people, active tenancies, and charges build your operating picture.</p>
			<div class="readiness-meter">
				<i style={`width: ${(data.setup.complete / data.setup.total) * 100}%`}></i>
			</div>
			<a class="primary full" href={resolve(`/workspace/${data.organization.id}/setup`)}
				>Continue setup <span>→</span></a
			>
			<div class="readiness-meta">
				<span>{data.counts.properties} properties</span><span>{data.counts.spaces} spaces</span
				><span>{data.counts.teamMembers} team members</span>
			</div>
		</section>
	</div>

	<div class="dashboard-grid bottom-grid">
		<section class="panel activity-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Recent activity</p>
					<h2>What changed in the workspace</h2>
				</div>
			</div>
			{#if data.activity.length === 0}<p class="quiet">
					Activity will appear as your team adds and updates records.
				</p>{:else}<div class="activity-list">
					{#each data.activity.slice(0, 5) as entry (entry.id)}<a
							href={resolve(`/workspace/${data.organization.id}/${actionLink(entry.entity_type)}`)}
							><span>·</span>
							<div>
								<strong>{actionLabel(entry.action)}</strong><small
									>{new Date(entry.created_at).toLocaleString()}</small
								>
							</div>
							<b>→</b></a
						>{/each}
				</div>{/if}
		</section>
		<section class="panel module-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Your operating model</p>
					<h2>Enabled modules</h2>
				</div>
				<a href={resolve(`/workspace/${data.organization.id}/settings`)}>Settings →</a>
			</div>
			<div class="module-list">
				{#each data.modules as module (module.module_key)}<div>
						<span
							>{module.module_key === 'residential'
								? '⌂'
								: module.module_key === 'commercial'
									? '▦'
									: module.module_key === 'student'
										? '◫'
										: '◉'}</span
						>
						<div>
							<strong>{module.module_key.replace('_', ' ')}</strong><small
								>{module.module_key === 'residential'
									? 'Homes, rooms, tenancies and rent'
									: module.module_key === 'commercial'
										? 'Offices, shops and occupiers'
										: module.module_key === 'student'
											? 'Rooms, beds, students and terms'
											: 'Listings, stays and guest operations'}</small
							>
						</div>
					</div>{/each}
			</div>
		</section>
	</div>
</WorkspaceChrome>

<style>
	.topbar {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 24px;
		margin-bottom: 32px;
	}
	.eyebrow {
		color: #789286;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.15em;
		margin: 0 0 9px;
		text-transform: uppercase;
	}
	h1,
	h2,
	p {
		margin-top: 0;
	}
	h1 {
		font-size: clamp(38px, 5vw, 62px);
		line-height: 0.94;
		letter-spacing: -0.08em;
		margin-bottom: 14px;
	}
	h1 span {
		color: var(--musha-lime);
	}
	.topbar > div > p:last-child {
		color: #718a7e;
		font-size: 15px;
		line-height: 1.55;
		margin-bottom: 0;
	}
	.quick-actions {
		display: flex;
		gap: 8px;
	}
	.primary,
	.secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		border-radius: 7px;
		font-size: 13px;
		font-weight: 800;
		padding: 12px 14px;
		text-decoration: none;
		white-space: nowrap;
	}
	.primary {
		background: var(--musha-deep);
		color: #fff;
	}
	.primary span {
		color: var(--musha-lime);
		font-size: 17px;
	}
	.secondary {
		border: 1px solid #d5e3d7;
		color: #476c5a;
		background: #fff;
	}
	.metric-grid {
		display: grid;
		grid-template-columns: 1.22fr repeat(4, 1fr);
		gap: 10px;
		margin-bottom: 14px;
	}
	.metric {
		min-height: 132px;
		border: 1px solid #e1ebe2;
		border-radius: 10px;
		background: #fff;
		padding: 16px;
	}
	.metric span,
	.metric small {
		display: block;
		color: #7c9489;
		font-size: 11px;
	}
	.metric strong {
		display: block;
		color: #214a3b;
		font-size: 28px;
		letter-spacing: -0.07em;
		margin: 15px 0 5px;
	}
	.metric.feature {
		background: var(--musha-deep);
		border-color: var(--musha-deep);
	}
	.metric.feature strong {
		color: #fff;
	}
	.metric.feature span,
	.metric.feature small {
		color: #b3cfbe;
	}
	.metric.attention {
		background: #fff6e5;
		border-color: #f0dfba;
	}
	.meter,
	.property-meter,
	.readiness-meter {
		height: 5px;
		overflow: hidden;
		border-radius: 99px;
		background: rgb(255 255 255 / 18%);
		margin-top: 13px;
	}
	.meter i,
	.property-meter i,
	.readiness-meter i {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--musha-lime);
	}
	.metric:not(.feature) .meter {
		background: #edf3e9;
	}
	.dashboard-grid {
		display: grid;
		gap: 14px;
		margin-bottom: 14px;
	}
	.primary-grid {
		grid-template-columns: 1.25fr 0.75fr;
	}
	.portfolio-grid {
		grid-template-columns: 1.3fr 0.7fr;
	}
	.bottom-grid {
		grid-template-columns: 1.15fr 0.85fr;
	}
	.panel {
		border: 1px solid #e1ebe2;
		border-radius: 11px;
		background: #fff;
		padding: 23px;
	}
	.panel-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}
	.panel-heading h2,
	.readiness-panel h2 {
		color: #173f32;
		font-size: 23px;
		letter-spacing: -0.06em;
		margin: 0;
	}
	.panel-heading a {
		color: #517965;
		font-size: 12px;
		text-decoration: none;
	}
	.count {
		border-radius: 99px;
		background: #edf4dc;
		color: #648466;
		font-size: 11px;
		padding: 7px 9px;
	}
	.collection-summary {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 9px;
		margin: 21px 0 17px;
	}
	.collection-summary > div {
		border: 1px solid #edf2ed;
		border-radius: 8px;
		padding: 13px;
	}
	.collection-summary span,
	.collection-summary small {
		display: block;
		color: #84988e;
		font-size: 11px;
	}
	.collection-summary strong {
		display: block;
		color: #315746;
		font-size: 21px;
		letter-spacing: -0.05em;
		margin: 7px 0 4px;
	}
	.bar-chart {
		display: grid;
		gap: 10px;
	}
	.bar-chart > div {
		display: grid;
		grid-template-columns: 55px 1fr auto;
		align-items: center;
		gap: 9px;
		color: #708a7d;
		font-size: 11px;
	}
	.bar-chart b {
		color: #426856;
		font-size: 11px;
	}
	.track {
		height: 8px;
		overflow: hidden;
		border-radius: 99px;
		background: #eef3ee;
	}
	.track i {
		display: block;
		height: 100%;
		border-radius: inherit;
	}
	.track .due {
		background: #c6d8b1;
	}
	.track .received {
		background: #4e916c;
	}
	.quiet {
		color: #8b9d94;
		font-size: 12px;
		margin: 18px 0 0;
	}
	.all-clear {
		display: grid;
		place-content: center;
		justify-items: center;
		min-height: 191px;
		text-align: center;
	}
	.all-clear > span {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		border-radius: 13px;
		background: #eaf4d9;
		color: #5d8e60;
		font-size: 19px;
	}
	.all-clear strong {
		color: #486c5a;
		font-size: 14px;
		margin-top: 11px;
	}
	.all-clear p {
		color: #91a197;
		font-size: 11px;
		line-height: 1.45;
		margin: 5px 0 0;
	}
	.watch-list {
		display: grid;
		gap: 7px;
		margin-top: 19px;
	}
	.watch-list a,
	.activity-list a {
		display: flex;
		align-items: center;
		gap: 9px;
		border: 1px solid #edf2ed;
		border-radius: 8px;
		color: inherit;
		padding: 10px;
		text-decoration: none;
	}
	.watch-list a > span {
		display: grid;
		place-items: center;
		width: 27px;
		height: 27px;
		border-radius: 7px;
		background: #f2f5e8;
		color: #658267;
		font-size: 12px;
		font-weight: 800;
	}
	.watch-list a > span.urgent {
		background: #fce8df;
		color: #b3604b;
	}
	.watch-list div,
	.activity-list div {
		min-width: 0;
		flex: 1;
	}
	.watch-list strong,
	.watch-list small,
	.activity-list strong,
	.activity-list small {
		display: block;
	}
	.watch-list strong,
	.activity-list strong {
		color: #426756;
		font-size: 12px;
	}
	.watch-list small,
	.activity-list small {
		color: #91a198;
		font-size: 10px;
		margin-top: 3px;
	}
	.watch-list b,
	.activity-list b {
		color: #71957b;
		font-size: 14px;
	}
	.property-list {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 8px;
		margin-top: 20px;
	}
	.property-list article {
		border: 1px solid #edf2ed;
		border-radius: 8px;
		padding: 12px;
	}
	.property-title {
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.property-title > span {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 8px;
		background: #edf4dc;
		color: #668a6d;
	}
	.property-title strong,
	.property-title small {
		display: block;
	}
	.property-title strong {
		color: #355b4b;
		font-size: 13px;
	}
	.property-title small {
		color: #90a097;
		font-size: 10px;
		margin-top: 3px;
		text-transform: capitalize;
	}
	.property-stats {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		color: #6e887b;
		font-size: 10px;
		margin-top: 14px;
	}
	.property-stats .warning {
		color: #b26950;
	}
	.property-meter {
		background: #edf3eb;
		margin-top: 7px;
	}
	.property-meter i {
		background: #5a976c;
	}
	.empty {
		display: grid;
		justify-items: start;
		gap: 7px;
		padding: 32px 8px 4px;
	}
	.empty strong {
		color: #486c5a;
		font-size: 14px;
	}
	.empty p {
		color: #8c9e95;
		font-size: 12px;
		line-height: 1.5;
		margin-bottom: 8px;
	}
	.readiness-panel {
		background: #eff6df;
		border-color: #dfeacb;
	}
	.readiness-panel > p:not(.eyebrow) {
		color: #6d8872;
		font-size: 13px;
		line-height: 1.55;
		margin: 13px 0 19px;
	}
	.readiness-meter {
		background: #d7e5c3;
		margin: 0 0 19px;
	}
	.readiness-meter i {
		background: #5f9867;
	}
	.full {
		width: 100%;
	}
	.readiness-panel .primary.full {
		position: relative;
		box-sizing: border-box;
		max-width: 100%;
		min-height: 52px;
		padding: 0 54px 0 20px;
		text-align: center;
	}
	.readiness-panel .primary.full span {
		position: absolute;
		right: 19px;
		top: 50%;
		transform: translateY(-50%);
	}
	.readiness-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
		margin-top: 17px;
	}
	.readiness-meta span {
		color: #66806a;
		font-size: 10px;
	}
	.activity-list {
		display: grid;
		gap: 7px;
		margin-top: 18px;
	}
	.activity-list a > span {
		color: var(--musha-lime);
		font-size: 26px;
		line-height: 10px;
	}
	.module-list {
		display: grid;
		gap: 8px;
		margin-top: 18px;
	}
	.module-list > div {
		display: flex;
		align-items: flex-start;
		gap: 9px;
		border: 1px solid #edf2ed;
		border-radius: 8px;
		padding: 11px;
	}
	.module-list > div > span {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		background: #edf4dc;
		color: #5e8b63;
	}
	.module-list strong,
	.module-list small {
		display: block;
	}
	.module-list strong {
		color: #426756;
		font-size: 12px;
		text-transform: capitalize;
	}
	.module-list small {
		color: #8d9f95;
		font-size: 10px;
		line-height: 1.4;
		margin-top: 3px;
	}
	@media (max-width: 1100px) {
		.metric-grid {
			grid-template-columns: repeat(3, 1fr);
		}
		.primary-grid,
		.portfolio-grid,
		.bottom-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 720px) {
		.topbar {
			align-items: flex-start;
			flex-direction: column;
		}
		.metric-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.property-list {
			grid-template-columns: 1fr;
		}
		.panel {
			padding: 18px;
		}
	}
	@media (max-width: 480px) {
		.quick-actions,
		.collection-summary,
		.metric-grid {
			width: 100%;
			grid-template-columns: 1fr;
		}
		.quick-actions {
			display: grid;
		}
		.quick-actions a {
			width: 100%;
		}
		.metric-grid {
			display: grid;
		}
		.bar-chart > div {
			grid-template-columns: 46px 1fr;
		}
		.bar-chart b {
			grid-column: 2;
		}
		.property-stats {
			display: grid;
			gap: 4px;
		}
	}
</style>
