<script lang="ts">
	import AdminChrome from '$lib/components/AdminChrome.svelte';
	let { data } = $props();
</script>

<svelte:head><title>System health · Musha platform</title></svelte:head>

<AdminChrome active="system">
	{#if data.access === 'denied'}<section class="blocked">
			<p class="eyebrow">Permission required</p>
			<h1>System health is restricted.</h1>
		</section>{:else}<section class="heading">
			<div>
				<p class="eyebrow">Platform reliability</p>
				<h1>System health<span>.</span></h1>
				<p>
					See whether the platform foundations are reachable and where operator attention is needed.
				</p>
			</div>
			<span class="security">Live checks</span>
		</section>
		<section class="check-grid">
			{#each data.checks as check (check.label)}<article class="check-card">
					<span class:attention={check.status === 'attention'} class="check-dot"></span>
					<div><strong>{check.label}</strong><small>{check.detail}</small></div>
					<span class="check-status {check.status}">{check.status}</span>
				</article>{/each}
		</section>
		<section class="alerts-card">
			<div class="card-heading">
				<div>
					<p class="eyebrow">Operator attention</p>
					<h2>Open platform alerts</h2>
				</div>
				<span class="count">{data.alerts.length}</span>
			</div>
			{#if data.alerts.length === 0}<div class="empty">
					<strong>No open alerts</strong>
					<p>The control plane is clear.</p>
				</div>{:else}<div class="alert-list">
					{#each data.alerts as alert (alert.id)}<article class="alert-row">
							<span class="alert-mark">!</span>
							<div>
								<strong>{alert.title}</strong><small
									>{alert.organizations?.[0]?.name ?? 'Platform'} · {alert.detail ??
										'No additional detail'}</small
								>
							</div>
							<span class="severity {alert.severity}">{alert.severity}</span>
						</article>{/each}
				</div>{/if}
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
	h1 {
		font-size: clamp(35px, 5vw, 58px);
		line-height: 0.95;
		letter-spacing: -0.08em;
		margin: 0 0 15px;
	}
	h1 span {
		color: var(--musha-lime);
	}
	.heading p:not(.eyebrow) {
		color: #718a7e;
		font-size: 13px;
		margin: 0;
	}
	.security {
		background: #e9f1e9;
		color: #557568;
		border-radius: 99px;
		padding: 8px 11px;
		font-size: 10px;
		white-space: nowrap;
	}
	.check-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 9px;
		margin-bottom: 14px;
	}
	.check-card {
		display: flex;
		align-items: center;
		gap: 10px;
		background: #fff;
		border: 1px solid #e4ebe4;
		border-radius: 9px;
		padding: 15px;
	}
	.check-dot {
		width: 9px;
		height: 9px;
		flex: 0 0 9px;
		border-radius: 50%;
		background: #63a579;
	}
	.check-dot.attention {
		background: #cc8b65;
	}
	.check-card div {
		min-width: 0;
		flex: 1;
	}
	.check-card strong,
	.check-card small {
		display: block;
	}
	.check-card strong {
		color: #345b4b;
		font-size: 11px;
	}
	.check-card small {
		color: #91a198;
		font-size: 9px;
		line-height: 1.4;
		margin-top: 4px;
	}
	.check-status {
		color: #668a6d;
		font-size: 9px;
		text-transform: capitalize;
	}
	.check-status.attention {
		color: #9a6559;
	}
	.alerts-card {
		background: #fff;
		border: 1px solid #e4ebe4;
		border-radius: 10px;
		padding: 24px;
	}
	.card-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 15px;
		margin-bottom: 20px;
	}
	.card-heading h2 {
		font-size: 19px;
		letter-spacing: -0.05em;
		margin: 0;
	}
	.count {
		background: #edf4dc;
		color: #668a6d;
		border-radius: 99px;
		padding: 7px 10px;
		font-size: 10px;
	}
	.alert-list {
		display: grid;
		gap: 7px;
	}
	.alert-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 11px;
		border: 1px solid #f0ded7;
		border-radius: 7px;
		background: #fffaf7;
	}
	.alert-mark {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		background: #f4d4bd;
		color: #a15c42;
		font-weight: 800;
	}
	.alert-row div {
		min-width: 0;
		flex: 1;
	}
	.alert-row strong,
	.alert-row small {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.alert-row strong {
		color: #845442;
		font-size: 11px;
	}
	.alert-row small {
		color: #aa8170;
		font-size: 9px;
		margin-top: 3px;
	}
	.severity {
		color: #9a6559;
		font-size: 9px;
		text-transform: capitalize;
	}
	.empty,
	.blocked {
		padding: 25px;
		color: #81958b;
		font-size: 12px;
	}
	.empty p {
		color: #91a198;
		font-size: 10px;
	}
	.blocked {
		background: #fff8f5;
		border: 1px solid #f0ded7;
		border-radius: 10px;
	}
	.blocked h1 {
		font-size: 32px;
		letter-spacing: -0.07em;
	}
	@media (max-width: 700px) {
		.heading {
			display: block;
		}
		.security {
			display: inline-block;
			margin-top: 18px;
		}
		.check-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
