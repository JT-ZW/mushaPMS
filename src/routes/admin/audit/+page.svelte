<script lang="ts">
	import AdminChrome from '$lib/components/AdminChrome.svelte';
	let { data } = $props();
	let search = $state('');
	const organizationName = (id: string | null) =>
		data.organizations.find((organization) => organization.id === id)?.name ?? 'Platform';
	const visibleLogs = $derived(
		data.logs.filter((log) =>
			`${log.action} ${log.entity_type} ${organizationName(log.organization_id)}`
				.toLowerCase()
				.includes(search.toLowerCase())
		)
	);
</script>

<svelte:head><title>Audit log · Musha platform</title></svelte:head>

<AdminChrome active="audit">
	{#if data.access === 'denied'}<section class="blocked">
			<p class="eyebrow">Permission required</p>
			<h1>Audit access is restricted.</h1>
		</section>{:else}<section class="heading">
			<div>
				<p class="eyebrow">Accountability</p>
				<h1>Audit log<span>.</span></h1>
				<p>Review the actions that shape client workspaces and platform access.</p>
			</div>
			<span class="record-count">{data.logs.length} records</span>
		</section>
		<section class="toolbar">
			<label
				><span>⌕</span><input
					bind:value={search}
					placeholder="Search actions, entities or organizations"
					aria-label="Search audit log"
				/></label
			><span class="retention">Latest 100 records</span>
		</section>
		<section class="log-card">
			{#if visibleLogs.length === 0}<div class="empty">
					<div>✓</div>
					<strong>No audit activity yet</strong>
					<p>Platform actions will appear here as organizations are configured.</p>
				</div>{:else}{#each visibleLogs as log (log.id)}<article class="log-row">
						<div class="log-mark">{log.action.slice(0, 1).toUpperCase()}</div>
						<div class="log-main">
							<strong>{log.action.replaceAll('_', ' ')}</strong><span
								>{log.entity_type} · {organizationName(log.organization_id)}</span
							>
						</div>
						<div class="log-meta">
							<span>{new Date(log.created_at).toLocaleString()}</span><small
								>{log.actor_user_id ?? 'System action'}</small
							>
						</div>
					</article>{/each}{/if}
		</section>{/if}
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
		align-items: flex-end;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 35px;
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
	.record-count {
		color: #668a6d;
		background: #edf4dc;
		border-radius: 99px;
		padding: 8px 10px;
		font-size: 10px;
	}
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		margin-bottom: 11px;
	}
	.toolbar label {
		flex: 1;
		max-width: 420px;
		display: flex;
		align-items: center;
		gap: 8px;
		border: 1px solid #dfe9e1;
		border-radius: 7px;
		background: #fff;
		color: #8da098;
		padding: 0 11px;
	}
	.toolbar input {
		width: 100%;
		border: 0;
		outline: 0;
		background: transparent;
		padding: 11px 0;
		color: var(--musha-ink);
		font-size: 11px;
	}
	.retention {
		color: #9aa89f;
		font-size: 10px;
	}
	.log-card {
		overflow: hidden;
		background: #fff;
		border: 1px solid #e4ebe4;
		border-radius: 10px;
	}
	.log-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 17px;
		border-bottom: 1px solid #edf2ed;
	}
	.log-row:last-child {
		border-bottom: 0;
	}
	.log-mark {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		flex: 0 0 30px;
		border-radius: 8px;
		background: #edf4dc;
		color: #63896a;
		font-size: 11px;
		font-weight: 700;
	}
	.log-main {
		min-width: 0;
		flex: 1;
	}
	.log-main strong,
	.log-main span,
	.log-meta span,
	.log-meta small {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.log-main strong {
		color: #345b4b;
		font-size: 12px;
		text-transform: capitalize;
	}
	.log-main span {
		color: #8b9e94;
		font-size: 10px;
		margin-top: 4px;
	}
	.log-meta {
		text-align: right;
	}
	.log-meta span {
		color: #71897d;
		font-size: 10px;
	}
	.log-meta small {
		color: #a0ada5;
		font-size: 9px;
		margin-top: 4px;
		max-width: 180px;
	}
	.empty {
		display: grid;
		place-content: center;
		min-height: 300px;
		justify-items: center;
		text-align: center;
		color: #81958b;
	}
	.empty div {
		display: grid;
		place-items: center;
		width: 43px;
		height: 43px;
		border-radius: 50%;
		background: #edf4dc;
		color: #658b6d;
		margin-bottom: 12px;
	}
	.empty strong {
		color: #46695a;
		font-size: 13px;
	}
	.empty p {
		font-size: 11px;
		margin: 6px 0 0;
	}
	.blocked {
		padding: 25px;
		background: #fff8f5;
		border: 1px solid #f0ded7;
		border-radius: 10px;
	}
	.blocked h1 {
		font-size: 32px;
		letter-spacing: -0.07em;
	}
	@media (max-width: 620px) {
		.heading {
			display: block;
		}
		.record-count {
			display: inline-block;
			margin-top: 19px;
		}
		.toolbar {
			display: block;
		}
		.toolbar label {
			max-width: none;
		}
		.retention {
			display: inline-block;
			margin-top: 9px;
		}
		.log-row {
			align-items: flex-start;
		}
		.log-meta {
			display: none;
		}
	}
</style>
