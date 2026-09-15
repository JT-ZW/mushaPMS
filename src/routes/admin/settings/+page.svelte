<script lang="ts">
	import AdminChrome from '$lib/components/AdminChrome.svelte';
	let { data, form } = $props();
	const displayValue = (value: unknown) =>
		typeof value === 'string' ? value : JSON.stringify(value);
</script>

<svelte:head><title>Platform settings · Musha platform</title></svelte:head>

<AdminChrome active="settings">
	{#if data.access === 'denied'}<section class="blocked">
			<p class="eyebrow">Permission required</p>
			<h1>Platform settings are restricted.</h1>
		</section>{:else}<section class="heading">
			<div>
				<p class="eyebrow">Control plane configuration</p>
				<h1>Platform settings<span>.</span></h1>
				<p>
					Keep defaults and operational rules in one place so new client workspaces start
					consistently.
				</p>
			</div>
			<span class="security">Superadmin only</span>
		</section>
		{#if form?.message}<div class:failure={!form.success} class="notice">{form.message}</div>{/if}
		<section class="settings-card">
			<div class="card-heading">
				<div>
					<p class="eyebrow">Global defaults</p>
					<h2>Operational settings</h2>
				</div>
				<span class="count">{data.settings.length}</span>
			</div>
			<div class="settings-list">
				{#each data.settings as setting (setting.setting_key)}<form
						class="setting-row"
						method="POST"
						action="?/updateSetting"
					>
						<div class="setting-copy">
							<strong>{setting.setting_key.replaceAll('_', ' ')}</strong><small
								>{setting.description}</small
							>
						</div>
						<input type="hidden" name="setting_key" value={setting.setting_key} /><input
							name="value"
							value={displayValue(setting.value)}
							aria-label={setting.setting_key}
						/><button type="submit">Save</button>
					</form>{/each}
			</div>
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
	.notice {
		background: #e6f2e6;
		color: #39704c;
		border-radius: 7px;
		padding: 11px 13px;
		margin: -10px 0 18px;
		font-size: 11px;
	}
	.notice.failure {
		background: #fae9e5;
		color: #955549;
	}
	.settings-card {
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
	.settings-list {
		display: grid;
		gap: 8px;
	}
	.setting-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		border: 1px solid #edf2ed;
		border-radius: 7px;
	}
	.setting-copy {
		min-width: 0;
		flex: 1;
	}
	.setting-copy strong,
	.setting-copy small {
		display: block;
		text-transform: capitalize;
	}
	.setting-copy strong {
		color: #345b4b;
		font-size: 11px;
	}
	.setting-copy small {
		color: #91a198;
		font-size: 9px;
		margin-top: 4px;
	}
	.setting-row input {
		width: 210px;
		border: 1px solid #dfe9e1;
		border-radius: 6px;
		background: #fbfcfa;
		color: #426456;
		padding: 9px;
		outline: 0;
		font-size: 10px;
	}
	.setting-row button {
		border: 0;
		border-radius: 6px;
		background: var(--musha-deep);
		color: #fff;
		padding: 9px 11px;
		font-size: 10px;
		cursor: pointer;
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
	@media (max-width: 650px) {
		.heading {
			display: block;
		}
		.security {
			display: inline-block;
			margin-top: 18px;
		}
		.setting-row {
			align-items: stretch;
			flex-wrap: wrap;
		}
		.setting-row input {
			width: calc(100% - 85px);
		}
	}
</style>
