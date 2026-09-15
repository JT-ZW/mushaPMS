<script lang="ts">
	import WorkspaceChrome from '$lib/components/WorkspaceChrome.svelte';
	import { resolve } from '$app/paths';
	let { data, form } = $props();
	// The tab is intentionally writable because the setup sidebar changes it locally.
	// eslint-disable-next-line svelte/prefer-writable-derived
	let tab = $state('properties');
	$effect(() => {
		tab = data.defaultTab ?? 'properties';
	});
	const setupAreas = $derived([
		{ key: 'properties', label: 'Properties', done: data.properties.length > 0 },
		{ key: 'spaces', label: 'Units & spaces', done: data.spaces.length > 0 },
		{
			key: 'people',
			label: 'People & leases',
			done: data.people.length > 0 && data.tenancies.some((tenancy) => tenancy.status === 'active')
		},
		{
			key: 'review',
			label: 'Review workspace',
			done:
				data.properties.length > 0 &&
				data.spaces.length > 0 &&
				data.tenancies.some((tenancy) => tenancy.status === 'active')
		}
	]);
	const completedSetupAreas = $derived(setupAreas.filter((area) => area.done).length);
	const setupProgress = $derived(Math.round((completedSetupAreas / setupAreas.length) * 100));
</script>

<svelte:head><title>Organization setup · {data.organization.name} · Musha</title></svelte:head>

<WorkspaceChrome
	organization={data.organization}
	modules={data.modules}
	active="setup"
	role={data.membership.role}
>
	<section class="heading">
		<div>
			<p class="eyebrow">Organization setup</p>
			<h1>Make your workspace yours<span>.</span></h1>
			<p>
				Set up your portfolio and operating records. Your progress updates automatically as records
				are added.
			</p>
		</div>
		<span class="role">{data.membership.role}</span>
	</section>
	{#if form?.message}<div class:failure={!form.success} class="notice">{form.message}</div>{/if}
	<section class="readiness-card" aria-label="Workspace setup readiness">
		<div>
			<p class="eyebrow">Setup readiness</p>
			<h2>{completedSetupAreas} of {setupAreas.length} areas ready</h2>
			<p>Musha updates this picture from your actual properties, spaces, and active leases.</p>
		</div>
		<div class="readiness-meter" aria-label={`${setupProgress}% complete`}>
			<strong>{setupProgress}%</strong>
			<div><span style={`width: ${setupProgress}%`}></span></div>
		</div>
		<div class="setup-actions">
			<a href={resolve(`/workspace/${data.organization.id}/properties`)}>Manage portfolio</a>
			<a href={resolve(`/workspace/${data.organization.id}/new-tenant`)}>Add tenant</a>
			<a href={resolve(`/workspace/${data.organization.id}/settings`)}>Open settings</a>
		</div>
	</section>
	<div class="setup-layout">
		<aside class="steps">
			<p class="eyebrow">Setup areas</p>
			<button class:active={tab === 'properties'} onclick={() => (tab = 'properties')}
				>01 <span>Properties</span><b>{data.properties.length ? '✓' : '—'}</b></button
			><button class:active={tab === 'spaces'} onclick={() => (tab = 'spaces')}
				>02 <span>Units & spaces</span><b>{data.spaces.length ? '✓' : '—'}</b></button
			><button class:active={tab === 'people'} onclick={() => (tab = 'people')}
				>03 <span>People & leases</span><b
					>{data.people.length || data.tenancies.length ? '✓' : '—'}</b
				></button
			><button class:active={tab === 'review'} onclick={() => (tab = 'review')}
				>04 <span>Review workspace</span><b>→</b></button
			>
		</aside>
		<section class="work-panel">
			{#if tab === 'properties'}
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Portfolio</p>
						<h2>Add properties</h2>
						<p>Buildings, locations, residences, shops, or listings.</p>
					</div>
					<span class="count">{data.properties.length}</span>
				</div>
				<form method="POST" action="?/addProperty" class="inline-form">
					<input name="name" required placeholder="Property name" /><input
						name="code"
						placeholder="Code"
					/><input name="city" placeholder="City" /><button class="primary" type="submit"
						>Add property <span>→</span></button
					>
				</form>
				{#if data.properties.length === 0}<div class="empty">
						No properties have been added yet.
					</div>{:else}<div class="records">
						{#each data.properties as property (property.id)}<div class="record">
								<span class="record-icon">⌂</span>
								<div>
									<strong>{property.name}</strong><small
										>{property.code ?? 'No code'} · {property.city ?? 'No city'}</small
									>
								</div>
								<span class="status">{property.status}</span>
							</div>{/each}
					</div>{/if}
			{:else if tab === 'spaces'}
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Inventory</p>
						<h2>Add units and spaces</h2>
						<p>Define the rentable inventory under each property.</p>
					</div>
					<span class="count">{data.spaces.length}</span>
				</div>
				{#if data.properties.length === 0}<div class="notice">
						Add at least one property before creating units.
					</div>{:else}<form method="POST" action="?/addSpace" class="space-form">
						<select name="property_id" required
							><option value="">Choose property</option
							>{#each data.properties as property (property.id)}<option value={property.id}
									>{property.name}</option
								>{/each}</select
						><input name="name" required placeholder="Unit name or number" /><input
							name="monthly_rent"
							type="number"
							min="0"
							step="0.01"
							placeholder={`Monthly rent (${data.organization.currency_code})`}
						/><button class="primary" type="submit">Add unit <span>→</span></button>
					</form>{/if}
				{#if data.spaces.length === 0}<div class="empty">
						No units have been added yet.
					</div>{:else}<div class="records">
						{#each data.spaces as space (space.id)}<div class="record">
								<span class="record-icon">◌</span>
								<div>
									<strong>{space.name}</strong><small
										>{space.kind} · {space.monthly_rent ?? 'Rent not set'}</small
									>
								</div>
								<span class="status">{space.status}</span>
							</div>{/each}
					</div>{/if}
			{:else if tab === 'people'}
				<div class="panel-heading">
					<div>
						<p class="eyebrow">People & leases</p>
						<h2>Bring in your people</h2>
						<p>
							Tenants, students, occupiers, guests, suppliers, and lease records will live here.
						</p>
					</div>
					<span class="count">{data.people.length + data.tenancies.length}</span>
				</div>
				<div class="future-card">
					<div>↗</div>
					<strong>Open the people and lease workspace.</strong>
					<p>
						Add tenants and contacts, create leases against the exact room or unit, and set rent,
						deposit, billing and start dates.
					</p>
					<a class="primary" href={resolve(`/workspace/${data.organization.id}/people`)}
						>Manage people & leases <span>→</span></a
					>
				</div>
			{:else}
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Review</p>
						<h2>Your workspace is taking shape</h2>
						<p>These records will appear across your dashboard as you add them.</p>
					</div>
				</div>
				<div class="review-list">
					<div>
						<span>Properties</span><strong>{data.properties.length ? 'Ready' : 'Next'}</strong>
					</div>
					<div>
						<span>Units & spaces</span><strong>{data.spaces.length ? 'Ready' : 'Next'}</strong>
					</div>
					<div>
						<span>People & leases</span><strong
							>{data.people.length || data.tenancies.length ? 'Ready' : 'Next'}</strong
						>
					</div>
					<div><span>Workspace modules</span><strong>{data.modules.length} enabled</strong></div>
				</div>
			{/if}
		</section>
	</div>
</WorkspaceChrome>

<style>
	.heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 30px;
	}
	.eyebrow {
		color: #7b9588;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.16em;
		margin: 0 0 9px;
		text-transform: uppercase;
	}
	h1,
	h2,
	p {
		margin-top: 0;
	}
	h1 {
		font-size: clamp(36px, 5vw, 62px);
		line-height: 0.95;
		letter-spacing: -0.08em;
		margin-bottom: 14px;
	}
	h1 span {
		color: var(--musha-lime);
	}
	.heading > div > p:last-child {
		color: #718a7e;
		font-size: 15px;
		line-height: 1.6;
		margin: 0;
	}
	.role,
	.count {
		padding: 8px 10px;
		border-radius: 99px;
		background: #edf4dc;
		color: #668a6d;
		font-size: 12px;
		text-transform: capitalize;
	}
	.notice {
		padding: 12px 15px;
		margin: -10px 0 18px;
		border-radius: 8px;
		background: #e5f2e5;
		color: #376b4a;
		font-size: 13px;
	}
	.notice.failure {
		background: #fae9e5;
		color: #9a5548;
	}
	.readiness-card {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 160px auto;
		align-items: center;
		gap: 26px;
		margin-bottom: 18px;
		padding: 22px 24px;
		border: 1px solid #dce8dc;
		border-radius: 12px;
		background: linear-gradient(120deg, #f1f8e6, #ffffff 68%);
	}
	.readiness-card h2 {
		margin: 0 0 5px;
		color: var(--musha-ink);
		font-size: 25px;
		letter-spacing: -0.06em;
	}
	.readiness-card p:not(.eyebrow) {
		margin: 0;
		color: #6f8e80;
		font-size: 14px;
		line-height: 1.5;
	}
	.readiness-meter {
		display: grid;
		gap: 9px;
	}
	.readiness-meter strong {
		color: var(--musha-ink);
		font-size: 30px;
		letter-spacing: -0.06em;
	}
	.readiness-meter > div {
		height: 8px;
		overflow: hidden;
		border-radius: 999px;
		background: #dcead7;
	}
	.readiness-meter span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--musha-lime);
		transition: width 240ms ease;
	}
	.setup-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: end;
		gap: 8px;
	}
	.setup-actions a {
		border-bottom: 1px solid #a6c686;
		color: #3e755b;
		font-size: 13px;
		font-weight: 700;
		padding: 4px 0;
		text-decoration: none;
	}
	.setup-layout {
		display: grid;
		grid-template-columns: 208px minmax(0, 1fr);
		gap: 14px;
		align-items: start;
	}
	.steps {
		padding: 20px 11px;
		border-radius: 10px;
		background: var(--musha-ink);
	}
	.steps .eyebrow {
		padding: 0 10px;
		color: #87b39d;
	}
	.steps button {
		width: 100%;
		display: grid;
		grid-template-columns: 24px 1fr 16px;
		align-items: center;
		gap: 5px;
		border: 0;
		border-radius: 7px;
		padding: 11px 10px;
		background: transparent;
		color: #8bb19e;
		text-align: left;
		cursor: pointer;
		font: inherit;
		font-size: 12px;
	}
	.steps button span {
		font-size: 13px;
	}
	.steps button b {
		color: #769d8a;
		font-size: 12px;
		text-align: right;
	}
	.steps button.active {
		background: #235447;
		color: #fff;
	}
	.steps button.active b {
		color: var(--musha-lime);
	}
	.work-panel {
		min-height: 450px;
		padding: 26px;
		border: 1px solid #e4ebe4;
		border-radius: 10px;
		background: #fff;
	}
	.panel-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 15px;
	}
	.panel-heading h2 {
		font-size: 26px;
		letter-spacing: -0.06em;
		margin: 0 0 9px;
	}
	.panel-heading p:not(.eyebrow) {
		color: #7d9188;
		font-size: 14px;
		line-height: 1.5;
		margin: 0;
	}
	.inline-form,
	.space-form {
		display: grid;
		grid-template-columns: 1.4fr 0.75fr 1fr auto;
		gap: 8px;
		margin: 26px 0 16px;
	}
	.inline-form input,
	.space-form input,
	.space-form select {
		min-width: 0;
		border: 1px solid #dfe9e1;
		border-radius: 6px;
		background: #fbfcfa;
		color: #426456;
		padding: 10px;
		font: inherit;
		font-size: 13px;
	}
	.primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 14px;
		border: 0;
		border-radius: 7px;
		background: var(--musha-deep);
		color: #fff;
		padding: 11px 14px;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
		cursor: pointer;
		white-space: nowrap;
	}
	.primary span {
		color: var(--musha-lime);
		font-size: 17px;
	}
	.records {
		display: grid;
		gap: 7px;
	}
	.record {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 11px;
		border: 1px solid #edf2ed;
		border-radius: 7px;
	}
	.record-icon {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: #edf4dc;
		color: #63896a;
	}
	.record > div:nth-child(2) {
		min-width: 0;
		flex: 1;
	}
	.record strong,
	.record small {
		display: block;
	}
	.record strong {
		color: #345b4b;
		font-size: 13px;
	}
	.record small {
		color: #93a299;
		font-size: 11px;
		margin-top: 4px;
	}
	.status {
		padding: 5px 8px;
		border-radius: 99px;
		background: #edf4dc;
		color: #668a6d;
		font-size: 10px;
		text-transform: capitalize;
	}
	.empty {
		display: grid;
		place-content: center;
		min-height: 210px;
		color: #8b9e94;
		font-size: 13px;
		text-align: center;
		border: 1px dashed #dce8dd;
		border-radius: 7px;
		margin-top: 20px;
	}
	.future-card {
		display: grid;
		place-content: center;
		justify-items: center;
		min-height: 270px;
		text-align: center;
	}
	.future-card div {
		display: grid;
		place-items: center;
		width: 50px;
		height: 50px;
		border-radius: 50%;
		background: #edf4dc;
		color: #668d6d;
		font-size: 21px;
		margin-bottom: 13px;
	}
	.future-card strong {
		color: #46695a;
		font-size: 15px;
	}
	.future-card p {
		color: #92a198;
		font-size: 13px;
		margin: 7px 0 0;
	}
	.future-card .primary {
		margin-top: 18px;
	}
	.review-list {
		display: grid;
		gap: 8px;
		max-width: 530px;
		margin: 28px 0;
	}
	.review-list div {
		display: flex;
		justify-content: space-between;
		padding: 13px;
		border: 1px solid #edf2ed;
		border-radius: 7px;
	}
	.review-list span {
		color: #7d9188;
		font-size: 13px;
	}
	.review-list strong {
		color: #668a6d;
		font-size: 13px;
	}
	@media (max-width: 800px) {
		.readiness-card {
			grid-template-columns: 1fr;
		}
		.setup-actions {
			justify-content: start;
		}
		.heading {
			display: block;
		}
		.role {
			display: inline-block;
			margin-top: 20px;
		}
		.setup-layout {
			grid-template-columns: 1fr;
		}
		.steps {
			display: flex;
			overflow-x: auto;
			gap: 5px;
			padding: 12px;
		}
		.steps .eyebrow {
			display: none;
		}
		.steps button {
			min-width: 155px;
		}
		.inline-form,
		.space-form {
			grid-template-columns: 1fr 1fr;
		}
		.inline-form button,
		.space-form button {
			grid-column: span 2;
		}
	}
	@media (max-width: 520px) {
		.work-panel {
			padding: 18px;
		}
		.inline-form,
		.space-form {
			grid-template-columns: 1fr;
		}
		.inline-form button,
		.space-form button {
			grid-column: auto;
		}
	}
</style>
