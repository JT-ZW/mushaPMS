<script lang="ts">
	import AdminChrome from '$lib/components/AdminChrome.svelte';
	import OrganizationChrome from '$lib/components/OrganizationChrome.svelte';
	import { resolve } from '$app/paths';
	let { data, form } = $props();

	const moduleLabels = {
		residential: 'Residential',
		commercial: 'Commercial',
		student: 'Student accommodation',
		short_stay: 'Short stay / Airbnb'
	} as const;
</script>

<svelte:head
	><title>{data.organization?.name ?? 'Organization'} · Musha platform</title></svelte:head
>

<AdminChrome active="organizations">
	{#if data.access === 'denied'}
		<section class="blocked">
			<p class="eyebrow">Permission required</p>
			<h1>Platform access required.</h1>
			<a class="secondary" href={resolve('/admin')}>Back to dashboard</a>
		</section>
	{:else}
		<OrganizationChrome organization={data.organization} active="overview">
			<section class="heading">
				<div>
					<a class="back" href={resolve('/admin/organizations')}>← Organizations</a>
					<p class="eyebrow">Organization overview</p>
					<h1>{data.organization.name}<span>.</span></h1>
					<p>
						{data.organization.slug} · {data.organization.currency_code} · {data.organization
							.timezone}
					</p>
				</div>
				<div class="heading-actions">
					<span class="status {data.organization.status}">{data.organization.status}</span>
					<a class="primary" href={resolve(`/admin/organizations/${data.organization.id}/setup`)}
						>Open setup <span>→</span></a
					>
				</div>
			</section>
			{#if data.created}<div class="success">
					Organization created. Review the setup workspace before handoff.
				</div>{/if}
			{#if form?.message}<div class:failure={!form.success} class="success">
					{form.message}
				</div>{/if}

			<section class="metric-row">
				<div>
					<span>Properties</span><strong>{data.counts.properties}</strong><small
						>Portfolio records</small
					>
				</div>
				<div>
					<span>Units & spaces</span><strong>{data.counts.spaces}</strong><small
						>Rentable inventory</small
					>
				</div>
				<div>
					<span>People</span><strong>{data.counts.people}</strong><small>Contacts and tenants</small
					>
				</div>
				<div>
					<span>Tenancies</span><strong>{data.counts.tenancies}</strong><small>Lease records</small>
				</div>
				<div class="attention">
					<span>Open maintenance</span><strong>{data.counts.maintenance}</strong><small
						>Requests needing attention</small
					>
				</div>
			</section>

			<div class="overview-grid">
				<section class="panel setup-panel">
					<div class="panel-heading">
						<div>
							<p class="eyebrow">Automatic readiness</p>
							<h2>Setup progress</h2>
						</div>
						<span class="progress-count"
							>{data.setupProgress.completed}/{data.setupProgress.total}</span
						>
					</div>
					<p class="panel-copy">
						Progress updates from the organization’s real records and access state.
					</p>
					<div class="progress-track">
						<span
							style={`width: ${(data.setupProgress.completed / data.setupProgress.total) * 100}%`}
						></span>
					</div>
					<div class="readiness-list">
						{#each data.setupSteps as step, index (step.key)}
							<div class:complete={step.complete} class="readiness-row">
								<span class="readiness-mark">{step.complete ? '✓' : index + 1}</span>
								<div><strong>{step.title}</strong><small>{step.detail}</small></div>
							</div>
						{/each}
					</div>
				</section>

				<section class="panel modules-panel">
					<div class="panel-heading">
						<div>
							<p class="eyebrow">Product access</p>
							<h2>Allocated modules</h2>
						</div>
						<span class="progress-count">{data.modules.length}</span>
					</div>
					<p class="panel-copy">These are the operating areas available in the client workspace.</p>
					<div class="module-list">
						{#each data.modules as module (module.module_key)}
							<div class="module-chip">
								<span>✓</span>{moduleLabels[module.module_key as keyof typeof moduleLabels]}
							</div>
						{/each}
					</div>
					<a class="small-link" href={resolve(`/admin/organizations/${data.organization.id}/setup`)}
						>Manage setup →</a
					>
				</section>
			</div>

			<div class="overview-grid lower">
				<section class="panel">
					<div class="panel-heading">
						<div>
							<p class="eyebrow">Lifecycle</p>
							<h2>Organization status</h2>
						</div>
					</div>
					<p class="panel-copy">
						Suspending or archiving blocks client-member access while preserving the organization’s
						records.
					</p>
					<form method="POST" action="?/updateStatus" class="status-form">
						<select name="status" value={data.organization.status}
							><option value="onboarding">Onboarding</option><option value="active">Active</option
							><option value="suspended">Suspended</option><option value="archived">Archived</option
							></select
						>
						<button class="secondary" type="submit">Save status</button>
					</form>
					<form method="POST" action="?/markHandoff">
						<button class="primary full" type="submit">Mark ready for handoff <span>→</span></button
						>
					</form>
				</section>
				<section class="panel">
					<div class="panel-heading">
						<div>
							<p class="eyebrow">Attention</p>
							<h2>Next best actions</h2>
						</div>
					</div>
					<div class="action-list">
						<a href={resolve(`/admin/organizations/${data.organization.id}/setup?tab=properties`)}
							><span>01</span>
							<div>
								<strong>Build the portfolio</strong><small
									>Add properties, units, and rentable spaces.</small
								>
							</div>
							→</a
						>
						<a href={resolve(`/admin/organizations/${data.organization.id}/setup?tab=people`)}
							><span>02</span>
							<div>
								<strong>Bring in people and leases</strong><small
									>Continue tenant and tenancy setup.</small
								>
							</div>
							→</a
						>
						<a href={resolve(`/admin/organizations/${data.organization.id}/setup?tab=review`)}
							><span>03</span>
							<div>
								<strong>Review before handoff</strong><small
									>Confirm the workspace is ready for the client.</small
								>
							</div>
							→</a
						>
					</div>
				</section>
			</div>
		</OrganizationChrome>
	{/if}
</AdminChrome>

<style>
	.eyebrow {
		color: #7b9588;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.16em;
		margin: 0 0 9px;
		text-transform: uppercase;
	}
	.heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 30px;
	}
	.back {
		display: block;
		color: #6f8b7d;
		font-size: 13px;
		margin-bottom: 24px;
		text-decoration: none;
	}
	h1 {
		font-size: clamp(36px, 5vw, 62px);
		line-height: 0.95;
		letter-spacing: -0.08em;
		margin: 0 0 14px;
	}
	h1 span {
		color: var(--musha-lime);
	}
	.heading p:not(.eyebrow) {
		color: #718a7e;
		font-size: 15px;
		margin: 0;
	}
	.heading-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.status {
		width: fit-content;
		padding: 7px 10px;
		border-radius: 99px;
		background: #edf4dc;
		color: #668a6d;
		font-size: 11px;
		font-weight: 700;
		text-transform: capitalize;
	}
	.status.suspended {
		background: #faedd7;
		color: #9a7955;
	}
	.status.archived {
		background: #eef0ee;
		color: #899790;
	}
	.primary,
	.secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 13px;
		border-radius: 7px;
		padding: 11px 14px;
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		cursor: pointer;
		white-space: nowrap;
	}
	.primary {
		border: 0;
		background: var(--musha-deep);
		color: #fff;
	}
	.primary span {
		color: var(--musha-lime);
		font-size: 16px;
	}
	.secondary {
		border: 1px solid #dce7df;
		background: #fff;
		color: #557568;
	}
	.success {
		padding: 12px 15px;
		margin: -10px 0 18px;
		border-radius: 8px;
		background: #e5f2e5;
		color: #376b4a;
		font-size: 13px;
	}
	.success.failure {
		background: #fae9e5;
		color: #9a5548;
	}
	.metric-row {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 9px;
		margin-bottom: 14px;
	}
	.metric-row > div {
		min-height: 106px;
		padding: 16px;
		border: 1px solid #e4ebe4;
		border-radius: 9px;
		background: #fff;
	}
	.metric-row span,
	.metric-row small {
		display: block;
		color: #7d9489;
		font-size: 11px;
	}
	.metric-row strong {
		display: block;
		margin: 12px 0 4px;
		font-size: 30px;
		letter-spacing: -0.07em;
	}
	.metric-row .attention {
		background: var(--musha-deep);
		border-color: var(--musha-deep);
		color: #fff;
	}
	.metric-row .attention span,
	.metric-row .attention small {
		color: #a9c5b4;
	}
	.overview-grid {
		display: grid;
		grid-template-columns: 1.2fr 0.8fr;
		gap: 14px;
		margin-bottom: 14px;
	}
	.overview-grid.lower {
		grid-template-columns: 1fr 1fr;
	}
	.panel {
		padding: 23px;
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
		font-size: 24px;
		letter-spacing: -0.06em;
		margin: 0;
	}
	.panel-copy {
		color: #789085;
		font-size: 14px;
		line-height: 1.6;
		margin: 15px 0 18px;
	}
	.progress-count {
		padding: 8px 10px;
		border-radius: 99px;
		background: #edf4dc;
		color: #668a6d;
		font-size: 12px;
	}
	.progress-track {
		height: 7px;
		overflow: hidden;
		border-radius: 99px;
		background: #edf2ed;
	}
	.progress-track span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--musha-lime);
	}
	.readiness-list,
	.action-list {
		display: grid;
		gap: 8px;
		margin-top: 18px;
	}
	.readiness-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px;
		border: 1px solid #edf2ed;
		border-radius: 8px;
	}
	.readiness-row.complete {
		background: #fbfdf8;
		border-color: #dfead6;
	}
	.readiness-mark {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		flex: 0 0 28px;
		border-radius: 50%;
		background: #f0f4f0;
		color: #91a198;
		font-size: 11px;
	}
	.readiness-row.complete .readiness-mark {
		background: #dcebbd;
		color: #5b8569;
	}
	.readiness-row strong,
	.readiness-row small {
		display: block;
	}
	.readiness-row strong {
		color: #345b4b;
		font-size: 13px;
	}
	.readiness-row small {
		color: #91a198;
		font-size: 11px;
		line-height: 1.4;
		margin-top: 3px;
	}
	.module-list {
		display: grid;
		gap: 8px;
		margin: 22px 0;
	}
	.module-chip {
		padding: 12px;
		border: 1px solid #dfead6;
		border-radius: 8px;
		background: #f4f8ea;
		color: #456b53;
		font-size: 13px;
		font-weight: 700;
	}
	.module-chip span {
		margin-right: 7px;
		color: #74a35a;
	}
	.small-link {
		color: #598066;
		font-size: 13px;
		text-decoration: none;
	}
	.status-form {
		display: flex;
		gap: 8px;
		margin: 19px 0 10px;
	}
	.status-form select {
		min-width: 0;
		flex: 1;
		border: 1px solid #dfe9e1;
		border-radius: 7px;
		background: #fbfcfa;
		color: #426456;
		padding: 10px;
		font-size: 13px;
	}
	.full {
		width: 100%;
	}
	.action-list a {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 11px 0;
		border-bottom: 1px solid #edf2ed;
		color: #739080;
		text-decoration: none;
	}
	.action-list a:last-child {
		border-bottom: 0;
	}
	.action-list a > span {
		color: #a6b7aa;
		font-size: 11px;
	}
	.action-list a > div {
		min-width: 0;
		flex: 1;
	}
	.action-list strong,
	.action-list small {
		display: block;
	}
	.action-list strong {
		color: #345b4b;
		font-size: 13px;
	}
	.action-list small {
		color: #91a198;
		font-size: 11px;
		margin-top: 3px;
	}
	.blocked {
		padding: 25px;
		border: 1px solid #f0ded7;
		border-radius: 10px;
		background: #fff8f5;
	}
	.blocked h1 {
		font-size: 34px;
		letter-spacing: -0.07em;
	}
	@media (max-width: 1000px) {
		.metric-row {
			grid-template-columns: repeat(3, 1fr);
		}
		.overview-grid,
		.overview-grid.lower {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 620px) {
		.heading {
			display: block;
		}
		.heading-actions {
			align-items: flex-start;
			flex-direction: column;
			margin-top: 20px;
		}
		.metric-row {
			grid-template-columns: repeat(2, 1fr);
		}
		.panel {
			padding: 18px;
		}
		.status-form {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>
