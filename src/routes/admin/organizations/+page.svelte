<script lang="ts">
	import AdminChrome from '$lib/components/AdminChrome.svelte';
	import { resolve } from '$app/paths';

	let { data } = $props();
	let search = $state('');
	let status = $state('all');

	const visibleOrganizations = $derived(
		data.organizations.filter((organization) => {
			const matchesSearch = `${organization.name} ${organization.slug}`
				.toLowerCase()
				.includes(search.toLowerCase());
			const matchesStatus = status === 'all' || organization.status === status;
			return matchesSearch && matchesStatus;
		})
	);
</script>

<svelte:head><title>Organizations · Musha platform</title></svelte:head>

<AdminChrome active="organizations">
	<section class="page-heading">
		<div>
			<p class="eyebrow">Client portfolio</p>
			<h1>Organizations<span>.</span></h1>
			<p>Every client workspace, from first setup through ongoing support.</p>
		</div>
		<a class="primary" href={resolve('/admin/organizations/new')}
			>Create organization <span>→</span></a
		>
	</section>

	{#if data.access === 'denied'}
		<div class="blocked">
			<strong>Platform access required.</strong>
			<p>Your account is authenticated but is not assigned to the Musha platform team.</p>
		</div>
	{:else}
		<section class="summary-row">
			<div><strong>{data.count}</strong><span>Total organizations</span></div>
			<div>
				<strong>{data.organizations.filter((o) => o.status === 'onboarding').length}</strong><span
					>In onboarding</span
				>
			</div>
			<div>
				<strong>{data.organizations.filter((o) => o.status === 'active').length}</strong><span
					>Active clients</span
				>
			</div>
			<div>
				<strong>{data.organizations.filter((o) => o.status === 'suspended').length}</strong><span
					>Needs attention</span
				>
			</div>
		</section>
		<section class="toolbar">
			<label class="search"
				><span>⌕</span><input
					bind:value={search}
					placeholder="Search organizations"
					aria-label="Search organizations"
				/></label
			><select bind:value={status} aria-label="Filter organizations by status"
				><option value="all">All statuses</option><option value="onboarding">Onboarding</option
				><option value="active">Active</option><option value="suspended">Suspended</option><option
					value="archived">Archived</option
				></select
			>
		</section>
		<section class="table-card">
			<div class="table-head">
				<span>Organization</span><span>Status</span><span>Operating context</span><span
					>Created</span
				><span></span>
			</div>
			{#if visibleOrganizations.length === 0}<div class="empty">
					<div>⌂</div>
					<strong>No matching organizations</strong>
					<p>Create a workspace or adjust your filters.</p>
				</div>{:else}{#each visibleOrganizations as organization (organization.id)}<a
						class="table-row"
						href={resolve(`/admin/organizations/${organization.id}`)}
						><div class="org-cell">
							<span class="org-avatar">{organization.name.slice(0, 1).toUpperCase()}</span><span
								><strong>{organization.name}</strong><small>{organization.slug}</small></span
							>
						</div>
						<span class="status {organization.status}">{organization.status}</span><span
							class="context">{organization.currency_code} · {organization.timezone}</span
						><span class="date">{new Date(organization.created_at).toLocaleDateString()}</span><span
							class="arrow">→</span
						></a
					>{/each}{/if}
		</section>
	{/if}
</AdminChrome>

<style>
	.page-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 35px;
	}
	.eyebrow {
		color: #7b9588;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.16em;
		margin: 0 0 9px;
		text-transform: uppercase;
	}
	h1 {
		font-size: clamp(35px, 5vw, 58px);
		line-height: 0.95;
		letter-spacing: -0.08em;
		margin: 0 0 15px;
	}
	h1 span {
		color: var(--musha-lime);
	}
	.page-heading p:not(.eyebrow) {
		color: #718a7e;
		font-size: 13px;
		margin: 0;
	}
	.primary {
		display: inline-flex;
		align-items: center;
		gap: 16px;
		border-radius: 7px;
		background: var(--musha-deep);
		color: #fff;
		padding: 12px 14px;
		text-decoration: none;
		font-size: 12px;
		font-weight: 700;
		white-space: nowrap;
	}
	.primary span {
		color: var(--musha-lime);
		font-size: 17px;
	}
	.blocked {
		border: 1px solid #f0ded7;
		background: #fff8f5;
		border-radius: 10px;
		padding: 18px;
		color: #8a5b50;
		font-size: 12px;
	}
	.blocked p {
		margin: 6px 0 0;
		color: #a27b70;
	}
	.summary-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
		margin-bottom: 14px;
	}
	.summary-row div {
		padding: 17px;
		background: #fff;
		border: 1px solid #e4ebe4;
		border-radius: 9px;
	}
	.summary-row strong,
	.summary-row span {
		display: block;
	}
	.summary-row strong {
		font-size: 26px;
		letter-spacing: -0.06em;
	}
	.summary-row span {
		color: #80958a;
		font-size: 10px;
		margin-top: 6px;
	}
	.toolbar {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 10px;
	}
	.search {
		flex: 1;
		max-width: 360px;
		display: flex;
		align-items: center;
		gap: 8px;
		border: 1px solid #dfe9e1;
		background: #fff;
		border-radius: 7px;
		padding: 0 11px;
		color: #88a097;
	}
	.search input {
		width: 100%;
		border: 0;
		outline: 0;
		padding: 10px 0;
		color: var(--musha-ink);
		font-size: 12px;
		background: transparent;
	}
	.toolbar select {
		min-width: 140px;
		border: 1px solid #dfe9e1;
		border-radius: 7px;
		background: #fff;
		color: #557568;
		padding: 0 10px;
		font-size: 11px;
	}
	.table-card {
		overflow: hidden;
		background: #fff;
		border: 1px solid #e4ebe4;
		border-radius: 10px;
	}
	.table-head,
	.table-row {
		display: grid;
		grid-template-columns: 2fr 0.85fr 1.3fr 1fr 30px;
		align-items: center;
		gap: 16px;
	}
	.table-head {
		padding: 12px 17px;
		background: #fbfcfa;
		border-bottom: 1px solid #e8eee8;
		color: #9aaa9f;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.table-row {
		padding: 14px 17px;
		color: #385b4d;
		text-decoration: none;
		border-bottom: 1px solid #edf2ed;
	}
	.table-row:last-child {
		border-bottom: 0;
	}
	.table-row:hover {
		background: #fbfdf9;
	}
	.org-cell {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}
	.org-avatar {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		flex: 0 0 30px;
		border-radius: 8px;
		background: #edf4dc;
		color: #5d8667;
		font-size: 12px;
		font-weight: 700;
	}
	.org-cell strong,
	.org-cell small {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.org-cell strong {
		color: #234a3c;
		font-size: 12px;
	}
	.org-cell small,
	.context,
	.date {
		color: #91a198;
		font-size: 10px;
		margin-top: 4px;
	}
	.context,
	.date {
		margin: 0;
	}
	.status {
		width: fit-content;
		padding: 4px 7px;
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
	.arrow {
		color: #9ab29f;
		font-size: 16px;
	}
	.empty {
		display: grid;
		place-content: center;
		min-height: 240px;
		justify-items: center;
		text-align: center;
		color: #7d9487;
	}
	.empty div {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		border-radius: 50%;
		background: #edf4dc;
		color: #6b906d;
		margin-bottom: 12px;
	}
	.empty strong {
		color: #46695a;
		font-size: 13px;
	}
	.empty p {
		margin: 6px 0 0;
		font-size: 11px;
	}
	@media (max-width: 760px) {
		.page-heading {
			display: block;
		}
		.page-heading .primary {
			margin-top: 20px;
		}
		.summary-row {
			grid-template-columns: repeat(2, 1fr);
		}
		.toolbar {
			display: grid;
			grid-template-columns: 1fr;
		}
		.search {
			max-width: none;
			min-height: 38px;
		}
		.toolbar select {
			min-height: 38px;
		}
		.table-head {
			display: none;
		}
		.table-row {
			grid-template-columns: 1fr auto;
			gap: 9px;
			padding: 15px;
		}
		.table-row .context,
		.table-row .date {
			grid-column: 1;
			margin-left: 40px;
		}
		.table-row .status {
			grid-column: 2;
			grid-row: 1;
		}
		.table-row .arrow {
			grid-column: 2;
			grid-row: 2;
		}
		.table-row .date {
			display: none;
		}
	}
</style>
