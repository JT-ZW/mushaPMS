<script lang="ts">
	import MarketingHeader from '$lib/components/MarketingHeader.svelte';
	import MarketingFooter from '$lib/components/MarketingFooter.svelte';
	import { resolve } from '$app/paths';

	type View =
		| 'overview'
		| 'properties'
		| 'setup'
		| 'people'
		| 'finance'
		| 'maintenance'
		| 'reports'
		| 'settings';
	let view = $state<View>('overview');
	let selectedProperty = $state('Mabel Court');
	let collected = $state(false);
	let requestDone = $state(false);
	const properties = [
		{
			name: 'Mabel Court',
			location: 'Borrowdale, Harare',
			units: 12,
			occupancy: 92,
			tone: 'mabel'
		},
		{ name: 'Acacia Place', location: 'Avondale, Harare', units: 8, occupancy: 88, tone: 'acacia' },
		{
			name: 'The Grove',
			location: 'Mount Pleasant, Harare',
			units: 4,
			occupancy: 100,
			tone: 'grove'
		}
	];
	const nav: { key: View; label: string; icon: string }[] = [
		{ key: 'overview', label: 'Overview', icon: '⌂' },
		{ key: 'properties', label: 'Properties', icon: '▦' },
		{ key: 'setup', label: 'Add property', icon: '+' },
		{ key: 'people', label: 'People & leases', icon: '◌' },
		{ key: 'finance', label: 'Finance & collections', icon: '$' },
		{ key: 'maintenance', label: 'Maintenance', icon: '⌁' },
		{ key: 'reports', label: 'Reports', icon: '↗' },
		{ key: 'settings', label: 'Organization setup', icon: '⚙' }
	];
	const active = $derived(
		properties.find((property) => property.name === selectedProperty) ?? properties[0]
	);
	const monthCollected = $derived(collected ? '$18,970' : '$18,420');
	const openRequests = $derived(requestDone ? 1 : 2);
</script>

<svelte:head
	><title>Interactive demo · Musha PMS</title><meta
		name="description"
		content="Explore a frontend-only Musha PMS demo workspace."
	/></svelte:head
>
<MarketingHeader />
<main>
	<div class="demo-intro">
		<div>
			<p>INTERACTIVE PRODUCT TOUR</p>
			<h1>Take Musha for<br /><em>a walk.</em></h1>
		</div>
		<span
			>This is a safe, frontend-only demo using fictional data. Click around and see how a property
			team could run its day.</span
		>
	</div>
	<section class="app-shell" aria-label="Interactive Musha demo workspace">
		<aside>
			<a class="demo-brand" href={resolve('/')}
				><img src="/logo.png" alt="" /><span>Musha<small>Demo workspace</small></span></a
			>
			<p class="workspace-name">Mushonga<br />Properties</p>
			<div class="nav">
				{#each nav as item (item.key)}<button
						class:active={view === item.key}
						onclick={() => (view = item.key)}><i>{item.icon}</i>{item.label}</button
					>{/each}
			</div>
			<div class="aside-foot"><span>Demo mode</span><small>All data is fictional</small></div>
		</aside>
		<div class="workspace">
			<header class="work-header">
				<div>
					<p>
						{view === 'overview'
							? 'Good morning, Jeffrey'
							: nav.find((item) => item.key === view)?.label}
					</p>
					<span
						>{view === 'overview'
							? 'Here is how Mushonga Properties is moving today.'
							: 'Explore a working Musha module.'}</span
					>
				</div>
				<div class="demo-badge"><i></i> Interactive demo</div>
			</header>
			{#if view === 'overview'}
				<section class="overview-view">
					<div class="metrics">
						<article>
							<small>Collected this month</small><strong>{monthCollected}</strong><span
								class:confirmed={collected}
								>{collected ? 'New payment recorded' : '↑ 12.5% from last month'}</span
							>
						</article>
						<article>
							<small>Portfolio occupancy</small><strong>91<sup>%</sup></strong>
							<div class="meter"><i></i></div>
						</article>
						<article>
							<small>Open maintenance</small><strong>{openRequests}</strong><span
								>{requestDone ? 'One request resolved' : 'Needs attention today'}</span
							>
						</article>
					</div>
					<div class="overview-grid">
						<article class="chart-card">
							<div class="card-head">
								<span><small>Collections</small><strong>Monthly income</strong></span><button
									onclick={() => (view = 'finance')}>View finance →</button
								>
							</div>
							<div class="bars">
								{#each [42, 58, 49, 70, 61, 82, 92] as height, i (i)}<i
										style={`height:${height}%`}
										class:last={i === 6}
									></i>{/each}
							</div>
							<div class="months">
								<span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span
								><span>Sep</span><span>Oct</span>
							</div>
						</article>
						<article class="attention">
							<div class="card-head">
								<span
									><small>Needs your attention</small><strong>{openRequests} things to move</strong
									></span
								><button onclick={() => (view = 'maintenance')}>See all →</button>
							</div>
							<button
								class:done={requestDone}
								class="request"
								onclick={() => (requestDone = !requestDone)}
								><i>{requestDone ? '✓' : '2'}</i><span
									><b>{requestDone ? 'Plumbing visit completed' : 'Plumbing request'}</b><small
										>Unit 04 · Mabel Court</small
									></span
								><em>{requestDone ? 'Reopen' : 'Mark done'}</em></button
							>
							<div class="renewal">
								<i>1</i><span
									><b>Lease renewal due</b><small>Acacia Place · 8 days left</small></span
								>
							</div>
						</article>
					</div>
					<div class="property-summary">
						<div class="card-head">
							<span><small>Your properties</small><strong>Three places, one view</strong></span
							><button onclick={() => (view = 'properties')}>Manage properties →</button>
						</div>
						<div class="property-row">
							{#each properties as property (property.name)}<button
									class:chosen={selectedProperty === property.name}
									onclick={() => (selectedProperty = property.name)}
									><i class={property.tone}></i><span
										><b>{property.name}</b><small
											>{property.units} units · {property.occupancy}% occupied</small
										></span
									><em>→</em></button
								>{/each}
						</div>
					</div>
				</section>
			{:else if view === 'properties'}
				<section class="module">
					<div class="module-title">
						<div>
							<small>PROPERTY DIRECTORY</small>
							<h2>Places you manage</h2>
						</div>
						<button class="add">+ Add property</button>
					</div>
					<div class="property-list">
						{#each properties as property (property.name)}<button
								class:chosen={selectedProperty === property.name}
								onclick={() => (selectedProperty = property.name)}
								><i class={property.tone}></i><span
									><b>{property.name}</b><small>{property.location}</small></span
								><strong
									>{property.occupancy}%<small>occupied · {property.units} units</small></strong
								><em>→</em></button
							>{/each}
					</div>
					<article class="property-detail">
						<div>
							<small>SELECTED PROPERTY</small>
							<h3>{active.name}</h3>
							<p>{active.location} · A well-kept residential community managed in Musha.</p>
						</div>
						<div><b>{active.units}</b><span>Total units</span></div>
						<div>
							<b>{Math.round((active.units * active.occupancy) / 100)}</b><span>Occupied</span>
						</div>
						<div>
							<b>{active.units - Math.round((active.units * active.occupancy) / 100)}</b><span
								>Available</span
							>
						</div>
					</article>
				</section>
			{:else if view === 'setup'}
				<section class="module">
					<div class="module-title">
						<div>
							<small>PROPERTY REGISTRATION</small>
							<h2>Add a property</h2>
						</div>
						<span class="step">Step 2 of 4</span>
					</div>
					<div class="setup-grid">
						<article class="setup-form">
							<label>Property name<input value="New property" /></label><label
								>Property type<select
									><option>Residential</option><option>Commercial</option><option
										>Student accommodation</option
									></select
								></label
							><label>Address<input value="Harare, Zimbabwe" /></label>
							<div class="setup-actions">
								<button onclick={() => (view = 'properties')}>Save sample property →</button><span
									>This demo does not save real data.</span
								>
							</div>
						</article>
						<article class="setup-steps">
							<small>REGISTRATION FLOW</small>
							<p class="complete"><i>✓</i> Choose property type</p>
							<p class="current"><i>2</i> Add location details</p>
							<p><i>3</i> Add spaces and rental model</p>
							<p><i>4</i> Review and activate</p>
						</article>
					</div>
				</section>
			{:else if view === 'people'}
				<section class="module">
					<div class="module-title">
						<div>
							<small>PEOPLE & LEASES</small>
							<h2>Everyone in the picture</h2>
						</div>
						<button class="add">+ Invite person</button>
					</div>
					<div class="table">
						<div class="table-head">
							<span>Resident</span><span>Home</span><span>Lease status</span><span>Balance</span>
						</div>
						{#each [['Tariro Moyo', 'Mabel Court · Unit 04', 'Active', 'Paid'], ['Kudzai Ncube', 'Acacia Place · Unit 07', 'Renewal due', 'Due 08 Oct'], ['Peter Dube', 'The Grove · House 02', 'Active', 'Paid']] as person (person[0])}<div
								class="table-row"
							>
								<span><i>{person[0].slice(0, 1)}</i><b>{person[0]}</b></span><span>{person[1]}</span
								><span class:warning={person[2] === 'Renewal due'}>{person[2]}</span><span
									class:due={person[3] !== 'Paid'}>{person[3]}</span
								>
							</div>{/each}
					</div>
				</section>
			{:else if view === 'finance'}
				<section class="module">
					<div class="module-title">
						<div>
							<small>FINANCE</small>
							<h2>Collections with context</h2>
						</div>
						<button class="add" onclick={() => (collected = true)}>+ Record payment</button>
					</div>
					<div class="finance-grid">
						<article>
							<small>Collected this month</small><strong>{monthCollected}</strong><span
								>{collected
									? 'Payment from Tariro Moyo added'
									: '91% of expected collections'}</span
							>
						</article>
						<article>
							<small>Outstanding</small><strong>$1,740</strong><span
								>3 residents need a follow-up</span
							>
						</article>
						<article>
							<small>Next collection run</small><strong>28 Oct</strong><span
								>Rent invoices will be prepared</span
							>
						</article>
					</div>
					<div class="invoice">
						<div>
							<i>↑</i><span
								><b>{collected ? 'Payment successfully recorded' : 'Tariro Moyo · Unit 04'}</b
								><small
									>{collected
										? 'The collection dashboard has been updated.'
										: 'Rent payment of $550 is awaiting collection.'}</small
								></span
							>
						</div>
						<button onclick={() => (collected = !collected)}
							>{collected ? 'Undo sample payment' : 'Record $550 payment'}</button
						>
					</div>
				</section>
			{:else if view === 'reports'}
				<section class="module">
					<div class="module-title">
						<div>
							<small>REPORTING DESK</small>
							<h2>Portfolio reporting</h2>
						</div>
						<button class="add">Export report</button>
					</div>
					<div class="report-grid">
						<article>
							<small>OCCUPANCY</small><strong>91%</strong>
							<div class="report-bar"><i style="width:91%"></i></div>
							<span>24 of 26 spaces occupied</span>
						</article>
						<article>
							<small>COLLECTION RATE</small><strong>{collected ? '94%' : '91%'}</strong>
							<div class="report-bar"><i style={`width:${collected ? 94 : 91}%`}></i></div>
							<span>October income performance</span>
						</article>
						<article>
							<small>MAINTENANCE SLA</small><strong>88%</strong>
							<div class="report-bar"><i style="width:88%"></i></div>
							<span>Requests actioned on time</span>
						</article>
					</div>
					<div class="report-list">
						<div>
							<span
								><i>▣</i><b>Rent roll</b><small>Current leases, rent amounts and balances</small
								></span
							><button>Open →</button>
						</div>
						<div>
							<span
								><i>◫</i><b>Collections report</b><small
									>Charges, payments and outstanding balances</small
								></span
							><button>Open →</button>
						</div>
						<div>
							<span
								><i>⌁</i><b>Maintenance performance</b><small
									>Open work, vendors and response times</small
								></span
							><button>Open →</button>
						</div>
					</div>
				</section>
			{:else if view === 'settings'}
				<section class="module">
					<div class="module-title">
						<div>
							<small>ORGANIZATION SETUP</small>
							<h2>Keep your Musha in shape</h2>
						</div>
						<button class="add">Save changes</button>
					</div>
					<div class="settings-grid">
						<article>
							<small>ORGANIZATION PROFILE</small><label
								>Organization name<input value="Mushonga Properties" /></label
							><label
								>Default currency<select
									><option>USD — United States Dollar</option><option>ZIG — Zimbabwe Gold</option
									></select
								></label
							>
						</article>
						<article>
							<small>OPERATING DEFAULTS</small><label>Invoice due days<input value="7" /></label
							><label
								>Notice period<select><option>30 days</option><option>60 days</option></select
								></label
							>
						</article>
						<article class="modules">
							<small>ENABLED MODULES</small>
							<p><i>✓</i> Residential</p>
							<p><i>✓</i> Finance & collections</p>
							<p><i>✓</i> Maintenance</p>
						</article>
					</div>
				</section>
			{:else}
				<section class="module">
					<div class="module-title">
						<div>
							<small>MAINTENANCE</small>
							<h2>Keep the small things moving</h2>
						</div>
						<button class="add">+ New request</button>
					</div>
					<div class="maintenance-grid">
						<article>
							<small>OPEN REQUESTS</small><strong>{openRequests}</strong><span
								>Across two properties</span
							>
						</article>
						<article>
							<small>AVERAGE RESPONSE</small><strong>3h 40m</strong><span
								>Within your 24h target</span
							>
						</article>
					</div>
					<div class="tickets">
						<button class:done={requestDone} onclick={() => (requestDone = !requestDone)}
							><i>{requestDone ? '✓' : '↗'}</i><span
								><b>{requestDone ? 'Plumbing visit completed' : 'Leaking kitchen pipe'}</b><small
									>Mabel Court · Unit 04 · Reported 2h ago</small
								></span
							><em>{requestDone ? 'Completed' : 'In progress'}</em></button
						><button
							><i class="warm">!</i><span
								><b>Replace corridor light</b><small
									>Acacia Place · Block B · Reported yesterday</small
								></span
							><em>Assigned</em></button
						>
					</div>
				</section>
			{/if}
		</div>
	</section>
	<section class="demo-cta">
		<div>
			<p>LIKE WHAT YOU SEE?</p>
			<h2>Make it your<br /><em>own Musha.</em></h2>
		</div>
		<a href={resolve('/contact')}>Request beta access →</a>
	</section>
</main>
<MarketingFooter />

<style>
	:global(body) {
		margin: 0;
		background: #fbfaf7;
		color: #163f37;
		font-family: var(--font-body);
	}
	main {
		background: #f7f8f4;
	}
	.demo-intro {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 40px;
		padding: 78px clamp(24px, 8vw, 150px) 48px;
		background:
			radial-gradient(circle at 84% 15%, #f5d3a2, transparent 21%),
			linear-gradient(120deg, #eef4e8, #faf7f0);
	}
	.demo-intro p,
	.module-title small,
	.property-detail small {
		color: #58836d;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.16em;
	}
	.demo-intro h1 {
		margin: 16px 0 0;
		font-size: clamp(48px, 6vw, 78px);
		line-height: 0.87;
		letter-spacing: -0.095em;
	}
	.demo-intro em,
	.demo-cta em {
		color: #29856b;
		font-style: normal;
	}
	.demo-intro > span {
		max-width: 380px;
		color: #6c8178;
		font-size: 15px;
		line-height: 1.7;
	}
	.app-shell {
		display: grid;
		grid-template-columns: 218px 1fr;
		max-width: 1280px;
		min-height: 720px;
		margin: 0 auto 80px;
		overflow: hidden;
		border: 1px solid #dce5dc;
		border-radius: 16px;
		background: #fff;
		box-shadow: 0 25px 52px #26473814;
	}
	aside {
		display: flex;
		flex-direction: column;
		padding: 20px 13px;
		background: #0d4e43;
		color: #dcebdd;
	}
	.demo-brand {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #f3f7ee;
		font-size: 17px;
		font-weight: 800;
		text-decoration: none;
	}
	.demo-brand img {
		width: 29px;
		height: 29px;
		border-radius: 8px;
	}
	.demo-brand small {
		display: block;
		margin-top: 2px;
		color: #9fc8a4;
		font-size: 7px;
		font-weight: 700;
		letter-spacing: 0.11em;
		text-transform: uppercase;
	}
	.workspace-name {
		margin: 39px 10px 16px;
		color: #a4c6ae;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.12em;
		line-height: 1.55;
		text-transform: uppercase;
	}
	.nav {
		display: grid;
		gap: 3px;
	}
	.nav button {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 11px 10px;
		border: 0;
		border-radius: 7px;
		background: transparent;
		color: #aac5b4;
		font: inherit;
		font-size: 12px;
		text-align: left;
		cursor: pointer;
	}
	.nav button i {
		display: grid;
		place-items: center;
		width: 18px;
		color: #b4d978;
		font-size: 16px;
		font-style: normal;
	}
	.nav button.active {
		background: #246453;
		color: #fff;
	}
	.aside-foot {
		margin-top: auto;
		padding: 13px 10px;
		border-top: 1px solid #ffffff1c;
	}
	.aside-foot span,
	.aside-foot small {
		display: block;
	}
	.aside-foot span {
		color: #b4d978;
		font-size: 10px;
		font-weight: 700;
	}
	.aside-foot small {
		margin-top: 5px;
		color: #8eb19c;
		font-size: 9px;
	}
	.workspace {
		padding: 35px;
		background: #fcfdfb;
	}
	.work-header {
		display: flex;
		align-items: start;
		justify-content: space-between;
		margin-bottom: 30px;
	}
	.work-header p {
		margin: 0;
		color: #234f43;
		font-size: 23px;
		font-weight: 800;
		letter-spacing: -0.05em;
	}
	.work-header span {
		display: block;
		margin-top: 7px;
		color: #80938a;
		font-size: 12px;
	}
	.demo-badge {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 7px 9px;
		border-radius: 99px;
		background: #e7f1dc;
		color: #598468;
		font-size: 10px;
		font-weight: 800;
	}
	.demo-badge i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #63aa71;
	}
	.metrics,
	.overview-grid,
	.finance-grid,
	.maintenance-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}
	.metrics article,
	.finance-grid article,
	.maintenance-grid article {
		padding: 17px;
		border: 1px solid #e1eae0;
		border-radius: 10px;
		background: #fff;
	}
	.metrics small,
	.finance-grid small,
	.maintenance-grid small,
	.card-head small {
		display: block;
		color: #82948c;
		font-size: 10px;
	}
	.metrics strong,
	.finance-grid strong,
	.maintenance-grid strong {
		display: block;
		margin-top: 8px;
		color: #2d5d4e;
		font-size: 26px;
		letter-spacing: -0.06em;
	}
	.metrics sup {
		font-size: 13px;
	}
	.metrics span,
	.finance-grid span,
	.maintenance-grid span {
		display: block;
		margin-top: 8px;
		color: #65906e;
		font-size: 9px;
	}
	.metrics span.confirmed {
		color: #2e8963;
	}
	.meter {
		height: 5px;
		margin-top: 13px;
		border-radius: 4px;
		background: #dcebd5;
	}
	.meter i {
		display: block;
		width: 91%;
		height: 100%;
		border-radius: inherit;
		background: #5aa26c;
	}
	.overview-grid {
		grid-template-columns: 1.16fr 0.84fr;
		margin-top: 10px;
	}
	.chart-card,
	.attention,
	.property-summary {
		padding: 19px;
		border: 1px solid #e1eae0;
		border-radius: 10px;
		background: #fff;
	}
	.card-head {
		display: flex;
		align-items: start;
		justify-content: space-between;
	}
	.card-head strong {
		display: block;
		margin-top: 5px;
		color: #355f51;
		font-size: 15px;
	}
	.card-head button {
		border: 0;
		background: transparent;
		color: #50836a;
		font: inherit;
		font-size: 10px;
		cursor: pointer;
	}
	.bars {
		height: 145px;
		display: flex;
		align-items: end;
		gap: 11px;
		padding: 20px 8px 0;
		border-bottom: 1px solid #deebde;
	}
	.bars i {
		flex: 1;
		border-radius: 4px 4px 0 0;
		background: #dcebd5;
	}
	.bars i.last {
		background: #72b66e;
	}
	.months {
		display: flex;
		justify-content: space-between;
		padding: 9px 5px 0;
		color: #9aa9a0;
		font-size: 8px;
	}
	.request,
	.renewal {
		display: flex;
		align-items: center;
		gap: 9px;
		width: 100%;
		margin-top: 18px;
		padding: 10px;
		border: 1px solid #f0dfcc;
		border-radius: 8px;
		background: #fff9f2;
		color: #476a5b;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.request i,
	.renewal i {
		display: grid;
		place-items: center;
		width: 25px;
		height: 25px;
		border-radius: 7px;
		background: #f5d8bc;
		color: #936249;
		font-size: 10px;
		font-style: normal;
		font-weight: 800;
	}
	.request span,
	.renewal span {
		flex: 1;
	}
	.request b,
	.request small,
	.renewal b,
	.renewal small {
		display: block;
	}
	.request b,
	.renewal b {
		font-size: 10px;
	}
	.request small,
	.renewal small {
		margin-top: 3px;
		color: #83958c;
		font-size: 9px;
	}
	.request em {
		color: #528067;
		font-size: 9px;
		font-style: normal;
	}
	.request.done {
		border-color: #d4ead7;
		background: #f8fdf7;
	}
	.request.done i {
		background: #dcefd3;
		color: #468064;
	}
	.renewal {
		margin-top: 9px;
		border-color: #e8eeee;
		background: #fbfcfb;
	}
	.renewal i {
		background: #e1eddb;
		color: #547e5e;
	}
	.property-summary {
		margin-top: 10px;
	}
	.property-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 17px;
	}
	.property-row button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px;
		border: 1px solid #e4ece2;
		border-radius: 8px;
		background: #fcfdfb;
		color: #406454;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.property-row button.chosen {
		border-color: #8cbe84;
		background: #f3f9ee;
	}
	.property-row i,
	.property-list i {
		width: 24px;
		height: 24px;
		border-radius: 7px;
		background: #91b77f;
	}
	.property-row i.acacia,
	.property-list i.acacia {
		background: #e5bc86;
	}
	.property-row i.grove,
	.property-list i.grove {
		background: #7ea8a0;
	}
	.property-row span {
		flex: 1;
	}
	.property-row b,
	.property-row small {
		display: block;
	}
	.property-row b {
		font-size: 10px;
	}
	.property-row small {
		margin-top: 3px;
		color: #82938b;
		font-size: 8px;
	}
	.property-row em {
		font-style: normal;
	}
	.module-title {
		display: flex;
		align-items: end;
		justify-content: space-between;
		margin-bottom: 25px;
	}
	.module-title h2 {
		margin: 8px 0 0;
		font-size: 27px;
		letter-spacing: -0.06em;
	}
	.add,
	.invoice button {
		padding: 10px 12px;
		border: 0;
		border-radius: 7px;
		background: #0e594b;
		color: #fff;
		font: inherit;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
	}
	.property-list,
	.tickets {
		display: grid;
		gap: 7px;
	}
	.property-list > button {
		display: flex;
		align-items: center;
		gap: 13px;
		padding: 15px;
		border: 1px solid #e2eae1;
		border-radius: 9px;
		background: #fff;
		color: #416354;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.property-list > button.chosen {
		border-color: #87b77e;
		background: #f4faef;
	}
	.property-list span {
		flex: 1;
	}
	.property-list b,
	.property-list small,
	.property-list strong small {
		display: block;
	}
	.property-list b {
		font-size: 13px;
	}
	.property-list small {
		margin-top: 4px;
		color: #82938b;
		font-size: 10px;
	}
	.property-list strong {
		color: #447b5e;
		font-size: 13px;
		text-align: right;
	}
	.property-list strong small {
		font-size: 9px;
	}
	.property-list em {
		font-style: normal;
	}
	.property-detail {
		display: flex;
		align-items: center;
		gap: 34px;
		margin-top: 20px;
		padding: 22px;
		border-radius: 11px;
		background: #e9f1e0;
	}
	.property-detail > div:first-child {
		flex: 1;
	}
	.property-detail h3 {
		margin: 7px 0;
		color: #2f5d4e;
		font-size: 21px;
	}
	.property-detail p {
		margin: 0;
		color: #6c8277;
		font-size: 11px;
	}
	.property-detail > div:not(:first-child) {
		display: grid;
		gap: 3px;
	}
	.property-detail > div:not(:first-child) b {
		color: #3d765a;
		font-size: 22px;
	}
	.property-detail > div:not(:first-child) span {
		color: #758b80;
		font-size: 9px;
	}
	.table {
		border: 1px solid #e3ebe2;
		border-radius: 10px;
		overflow: hidden;
	}
	.table-head,
	.table-row {
		display: grid;
		grid-template-columns: 1.2fr 1.25fr 1fr 0.7fr;
		gap: 10px;
		align-items: center;
		padding: 13px 16px;
	}
	.table-head {
		background: #f4f8f1;
		color: #789087;
		font-size: 9px;
		font-weight: 800;
		text-transform: uppercase;
	}
	.table-row {
		border-top: 1px solid #edf1eb;
		color: #5d766b;
		font-size: 11px;
	}
	.table-row > span:first-child {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #385f51;
	}
	.table-row i {
		display: grid;
		place-items: center;
		width: 25px;
		height: 25px;
		border-radius: 50%;
		background: #d8ebcf;
		color: #4a805e;
		font-size: 9px;
		font-style: normal;
	}
	.table-row .warning {
		color: #a66b4e;
	}
	.table-row .due {
		color: #b2694d;
	}
	.finance-grid,
	.maintenance-grid {
		margin-bottom: 10px;
	}
	.invoice {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px;
		border-radius: 10px;
		background: #f0d7bc;
	}
	.invoice > div {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.invoice i {
		display: grid;
		place-items: center;
		width: 33px;
		height: 33px;
		border-radius: 9px;
		background: #f8e8d6;
		color: #9c674d;
		font-style: normal;
	}
	.invoice b,
	.invoice small {
		display: block;
	}
	.invoice b {
		font-size: 12px;
	}
	.invoice small {
		margin-top: 4px;
		color: #7f7b70;
		font-size: 10px;
	}
	.invoice button {
		background: #8e5e47;
	}
	.tickets button {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 15px;
		border: 1px solid #e2eae1;
		border-radius: 9px;
		background: #fff;
		color: #426657;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.tickets button > i {
		display: grid;
		place-items: center;
		width: 29px;
		height: 29px;
		border-radius: 8px;
		background: #dfeeca;
		color: #4d825f;
		font-style: normal;
	}
	.tickets button > i.warm {
		background: #f1d5b7;
		color: #95624b;
	}
	.tickets span {
		flex: 1;
	}
	.tickets b,
	.tickets small {
		display: block;
	}
	.tickets b {
		font-size: 11px;
	}
	.tickets small {
		margin-top: 4px;
		color: #82938b;
		font-size: 9px;
	}
	.tickets em {
		color: #5d896d;
		font-size: 10px;
		font-style: normal;
	}
	.tickets button.done {
		border-color: #b9dbb9;
		background: #f8fcf7;
	}
	.demo-cta {
		display: flex;
		align-items: end;
		justify-content: space-between;
		padding: 80px clamp(24px, 8vw, 150px);
		background: #e0edcf;
	}
	.demo-cta p {
		color: #5c866e;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.16em;
	}
	.demo-cta h2 {
		margin: 15px 0 0;
		font-size: clamp(42px, 5vw, 66px);
		line-height: 0.9;
		letter-spacing: -0.08em;
	}
	.demo-cta a {
		padding: 15px 17px;
		border-radius: 8px;
		background: #0d5548;
		color: #fff;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
	}
	@media (max-width: 900px) {
		.app-shell {
			grid-template-columns: 1fr;
			margin: 0 20px 55px;
		}
		aside {
			display: none;
		}
		.demo-intro {
			padding: 65px 24px 40px;
		}
		.workspace {
			padding: 24px;
		}
		.demo-intro {
			display: block;
		}
		.demo-intro > span {
			margin-top: 25px;
		}
		.demo-cta {
			padding: 65px 24px;
		}
		.overview-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 600px) {
		.metrics,
		.finance-grid,
		.maintenance-grid,
		.property-row {
			grid-template-columns: 1fr;
		}
		.work-header {
			display: block;
		}
		.demo-badge {
			width: max-content;
			margin-top: 13px;
		}
		.table {
			overflow: auto;
		}
		.table-head,
		.table-row {
			min-width: 600px;
		}
		.property-detail {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 17px;
		}
		.property-detail > div:first-child {
			grid-column: 1/-1;
		}
		.demo-cta {
			display: block;
		}
		.demo-cta a {
			display: inline-block;
			margin-top: 24px;
		}
		.app-shell {
			margin-left: 12px;
			margin-right: 12px;
		}
		.workspace {
			padding: 17px;
		}
	}

	.step {
		padding: 7px 10px;
		border-radius: 99px;
		background: #e8f1de;
		color: #5e886c;
		font-size: 10px;
		font-weight: 800;
	}
	.setup-grid,
	.settings-grid {
		display: grid;
		grid-template-columns: 1.2fr 0.8fr;
		gap: 10px;
	}
	.setup-form,
	.setup-steps,
	.settings-grid article {
		padding: 22px;
		border: 1px solid #e1eae0;
		border-radius: 10px;
		background: #fff;
	}
	.setup-form,
	.settings-grid article {
		display: grid;
		gap: 14px;
	}
	.setup-form label,
	.settings-grid label {
		display: grid;
		gap: 6px;
		color: #647c71;
		font-size: 10px;
		font-weight: 700;
	}
	.setup-form input,
	.setup-form select,
	.settings-grid input,
	.settings-grid select {
		width: 100%;
		padding: 10px;
		border: 1px solid #dce6da;
		border-radius: 7px;
		background: #fcfdfb;
		color: #355e50;
		font: inherit;
		font-size: 12px;
	}
	.setup-actions {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 7px;
	}
	.setup-actions button {
		padding: 11px 13px;
		border: 0;
		border-radius: 7px;
		background: #0e594b;
		color: #fff;
		font: inherit;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
	}
	.setup-actions span {
		color: #82958b;
		font-size: 9px;
	}
	.setup-steps small,
	.settings-grid article > small {
		color: #668a76;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.12em;
	}
	.setup-steps p {
		display: flex;
		align-items: center;
		gap: 9px;
		margin: 19px 0;
		color: #84968d;
		font-size: 11px;
	}
	.setup-steps i {
		display: grid;
		place-items: center;
		width: 21px;
		height: 21px;
		border: 1px solid #d9e6d9;
		border-radius: 50%;
		font-size: 9px;
		font-style: normal;
	}
	.setup-steps p.complete {
		color: #528265;
	}
	.setup-steps p.complete i {
		border: 0;
		background: #def0d4;
	}
	.setup-steps p.current {
		color: #28654f;
		font-weight: 800;
	}
	.setup-steps p.current i {
		border: 0;
		background: #b9df7e;
	}
	.report-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}
	.report-grid article {
		padding: 18px;
		border: 1px solid #e0e9df;
		border-radius: 10px;
		background: #fff;
	}
	.report-grid small {
		color: #80938a;
		font-size: 10px;
	}
	.report-grid strong {
		display: block;
		margin-top: 8px;
		color: #315e50;
		font-size: 28px;
		letter-spacing: -0.06em;
	}
	.report-grid span {
		display: block;
		margin-top: 9px;
		color: #7f9389;
		font-size: 9px;
	}
	.report-bar {
		height: 6px;
		margin-top: 14px;
		overflow: hidden;
		border-radius: 6px;
		background: #e2ecde;
	}
	.report-bar i {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: #65a46b;
	}
	.report-list {
		display: grid;
		gap: 7px;
		margin-top: 11px;
	}
	.report-list > div {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 15px;
		border: 1px solid #e1eae1;
		border-radius: 9px;
		background: #fff;
	}
	.report-list span {
		display: grid;
		grid-template-columns: 28px 1fr;
		column-gap: 9px;
	}
	.report-list i {
		grid-row: span 2;
		display: grid;
		place-items: center;
		width: 27px;
		height: 27px;
		border-radius: 7px;
		background: #e7f0df;
		color: #4e8262;
		font-style: normal;
	}
	.report-list b {
		color: #3e6557;
		font-size: 11px;
	}
	.report-list small {
		margin-top: 3px;
		color: #84968d;
		font-size: 9px;
	}
	.report-list button {
		border: 0;
		background: transparent;
		color: #57836a;
		font: inherit;
		font-size: 10px;
		cursor: pointer;
	}
	.settings-grid {
		grid-template-columns: 1fr 1fr 1fr;
	}
	.modules p {
		display: flex;
		align-items: center;
		gap: 7px;
		margin: 11px 0 0;
		color: #567064;
		font-size: 11px;
	}
	.modules i {
		display: grid;
		place-items: center;
		width: 18px;
		height: 18px;
		border-radius: 5px;
		background: #def0d4;
		color: #4b8260;
		font-size: 10px;
		font-style: normal;
	}
	@media (max-width: 700px) {
		.setup-grid,
		.settings-grid,
		.report-grid {
			grid-template-columns: 1fr;
		}
		.setup-actions {
			align-items: flex-start;
			flex-direction: column;
		}
		.report-list > div {
			align-items: flex-start;
		}
		.report-list button {
			padding-top: 5px;
		}
	}
</style>
