<script lang="ts">
	import AdminChrome from '$lib/components/AdminChrome.svelte';
	import OrganizationChrome from '$lib/components/OrganizationChrome.svelte';
	import { resolve } from '$app/paths';
	let { data, form } = $props();
	// The tab is intentionally writable because the setup sidebar changes it locally.
	// eslint-disable-next-line svelte/prefer-writable-derived
	let tab = $state('properties');
	$effect(() => {
		tab = data.defaultTab ?? 'properties';
	});
</script>

<svelte:head><title>Setup · {data.organization?.name ?? 'Organization'} · Musha</title></svelte:head
>

<AdminChrome active="organizations">
	{#if data.access === 'denied'}
		<section class="blocked">
			<p class="eyebrow">Permission required</p>
			<h1>Only superadmins can configure this workspace.</h1>
			<a class="secondary" href={resolve('/admin/organizations')}>Back to organizations</a>
		</section>
	{:else}
		<OrganizationChrome organization={data.organization} active="setup">
			<section class="heading">
				<div>
					<a class="back" href={resolve(`/admin/organizations/${data.organization.id}`)}
						>← {data.organization.name}</a
					>
					<p class="eyebrow">Implementation workspace</p>
					<h1>Set up the portfolio<span>.</span></h1>
					<p>Prepare the client’s property records before handoff.</p>
				</div>
				<span class="status {data.organization.status}">{data.organization.status}</span>
			</section>
			{#if form?.message}<div class:failure={!form.success} class="notice">{form.message}</div>{/if}
			<div class="workspace">
				<aside class="steps">
					<p class="eyebrow">Setup checklist</p>
					<button class:active={tab === 'properties'} onclick={() => (tab = 'properties')}
						>01 <span>Properties</span><b>{data.properties.length > 0 ? '✓' : '—'}</b></button
					><button class:active={tab === 'spaces'} onclick={() => (tab = 'spaces')}
						>02 <span>Units and spaces</span><b>{data.spaces.length > 0 ? '✓' : '—'}</b></button
					><button class:active={tab === 'people'} onclick={() => (tab = 'people')}
						>03 <span>People and tenancies</span><b>{data.people.length > 0 ? '✓' : '—'}</b></button
					><button class:active={tab === 'review'} onclick={() => (tab = 'review')}
						>04 <span>Review and handoff</span><b>{data.organization.handoff_at ? '✓' : '—'}</b
						></button
					>
				</aside>
				<section class="work-panel">
					{#if tab === 'properties'}<div class="panel-heading">
							<div>
								<p class="eyebrow">Step 01</p>
								<h2>Add properties</h2>
								<p>Create the buildings or locations this client manages.</p>
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
										<div class="record-icon">⌂</div>
										<div>
											<strong>{property.name}</strong><small
												>{property.code ?? 'No code'} · {property.city ?? 'No city'}</small
											>
										</div>
										<span class="status">{property.status}</span>
									</div>{/each}
							</div>{/if}
					{:else if tab === 'spaces'}<div class="panel-heading">
							<div>
								<p class="eyebrow">Step 02</p>
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
									placeholder="Monthly rent"
								/><button class="primary" type="submit">Add unit <span>→</span></button>
							</form>{/if}{#if data.spaces.length === 0}<div class="empty">
								No units have been added yet.
							</div>{:else}<div class="records">
								{#each data.spaces as space (space.id)}<div class="record">
										<div class="record-icon">◌</div>
										<div>
											<strong>{space.name}</strong><small
												>{space.kind} · {space.monthly_rent ?? 'Rent not set'}</small
											>
										</div>
										<span class="status">{space.status}</span>
									</div>{/each}
							</div>{/if}
					{:else if tab === 'people'}<div class="panel-heading">
							<div>
								<p class="eyebrow">Step 03</p>
								<h2>People and tenancies</h2>
								<p>Tenant import and lease configuration will be completed here.</p>
							</div>
							<span class="count">{data.people.length}</span>
						</div>
						<div class="future-card">
							<div>◌</div>
							<strong>Tenant onboarding is next</strong>
							<p>The residential tenant and tenancy forms will connect to this setup step.</p>
						</div>
					{:else}<div class="panel-heading">
							<div>
								<p class="eyebrow">Step 04</p>
								<h2>Review and handoff</h2>
								<p>Confirm the portfolio is ready for the client administrator.</p>
							</div>
						</div>
						<div class="review-list">
							<div>
								<span>Properties</span><strong
									>{data.properties.length > 0 ? 'Ready' : 'Missing'}</strong
								>
							</div>
							<div>
								<span>Units and spaces</span><strong
									>{data.spaces.length > 0 ? 'Ready' : 'Missing'}</strong
								>
							</div>
							<div>
								<span>People and tenancies</span><strong
									>{data.people.length > 0 ? 'Ready next' : 'Ready next'}</strong
								>
							</div>
							<div>
								<span>Client handoff</span><strong
									>{data.organization.handoff_at ? 'Completed' : 'Not completed'}</strong
								>
							</div>
						</div>
						<a class="primary" href={resolve(`/admin/organizations/${data.organization.id}`)}
							>Return to organization overview <span>→</span></a
						>{/if}
				</section>
			</div>
		</OrganizationChrome>
	{/if}
</AdminChrome>

<style>
	.eyebrow {
		color: #7b9588;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.16em;
		margin: 0 0 9px;
		text-transform: uppercase;
	}
	.heading {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 20px;
		margin-bottom: 31px;
	}
	.back {
		display: block;
		color: #6f8b7d;
		font-size: 11px;
		text-decoration: none;
		margin-bottom: 24px;
	}
	.heading h1 {
		font-size: clamp(35px, 5vw, 58px);
		line-height: 0.95;
		letter-spacing: -0.08em;
		margin: 0 0 15px;
	}
	.heading h1 span {
		color: var(--musha-lime);
	}
	.heading p:not(.eyebrow) {
		color: #718a7e;
		font-size: 13px;
		margin: 0;
	}
	.status {
		width: fit-content;
		padding: 5px 8px;
		border-radius: 99px;
		background: #edf4dc;
		color: #668a6d;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.status.suspended {
		background: #faedd7;
		color: #9a7955;
	}
	.status.archived {
		background: #eef0ee;
		color: #899790;
	}
	.notice {
		background: #e6f2e6;
		color: #39704c;
		border-radius: 7px;
		padding: 11px 13px;
		margin: -10px 0 16px;
		font-size: 11px;
	}
	.notice.failure {
		background: #fae9e5;
		color: #955549;
	}
	.workspace {
		display: grid;
		grid-template-columns: 220px 1fr;
		gap: 14px;
		align-items: start;
	}
	.steps {
		padding: 22px 12px;
		background: var(--musha-ink);
		border-radius: 10px;
	}
	.steps .eyebrow {
		color: #87b39d;
		padding: 0 10px;
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
		font-size: 10px;
	}
	.steps button span {
		font-size: 11px;
	}
	.steps button b {
		color: #769d8a;
		font-size: 11px;
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
		background: #fff;
		border: 1px solid #e4ebe4;
		border-radius: 10px;
		padding: 26px;
	}
	.panel-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 15px;
	}
	.panel-heading h2 {
		font-size: 21px;
		letter-spacing: -0.05em;
		margin: 0 0 9px;
	}
	.panel-heading p:not(.eyebrow) {
		color: #7d9188;
		font-size: 11px;
		line-height: 1.5;
		margin: 0;
	}
	.count {
		color: #668a6d;
		background: #edf4dc;
		border-radius: 99px;
		padding: 7px 10px;
		font-size: 10px;
	}
	.inline-form,
	.space-form {
		display: grid;
		grid-template-columns: 1.4fr 0.75fr 1fr auto;
		gap: 8px;
		margin: 26px 0 16px;
	}
	.space-form {
		grid-template-columns: 1.25fr 1fr 0.85fr auto;
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
		outline: 0;
		font-size: 11px;
	}
	.primary,
	.secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 14px;
		border: 0;
		border-radius: 6px;
		background: var(--musha-deep);
		color: #fff;
		padding: 10px 12px;
		font-size: 11px;
		font-weight: 700;
		text-decoration: none;
		cursor: pointer;
		white-space: nowrap;
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
		width: 30px;
		height: 30px;
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
		font-size: 11px;
	}
	.record small {
		color: #93a299;
		font-size: 10px;
		margin-top: 4px;
	}
	.empty {
		display: grid;
		place-content: center;
		min-height: 210px;
		color: #8b9e94;
		font-size: 11px;
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
		width: 46px;
		height: 46px;
		border-radius: 50%;
		background: #edf4dc;
		color: #668d6d;
		font-size: 20px;
		margin-bottom: 13px;
	}
	.future-card strong {
		color: #46695a;
		font-size: 13px;
	}
	.future-card p {
		color: #92a198;
		font-size: 11px;
		margin: 7px 0 0;
	}
	.review-list {
		display: grid;
		gap: 8px;
		max-width: 500px;
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
		font-size: 11px;
	}
	.review-list strong {
		color: #668a6d;
		font-size: 11px;
	}
	.blocked {
		padding: 25px;
		background: #fff8f5;
		border: 1px solid #f0ded7;
		border-radius: 10px;
	}
	.blocked h1 {
		font-size: 34px;
		letter-spacing: -0.07em;
		margin: 0 0 15px;
	}
	.blocked .secondary {
		margin-top: 10px;
	}
	@media (max-width: 800px) {
		.workspace {
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
		.heading {
			display: block;
		}
		.heading > .status {
			display: inline-block;
			margin-top: 20px;
		}
	}
</style>
