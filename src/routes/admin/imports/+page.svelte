<script lang="ts">
	import AdminChrome from '$lib/components/AdminChrome.svelte';
	let { data, form } = $props();
</script>

<svelte:head><title>Data imports · Musha platform</title></svelte:head>

<AdminChrome active="imports">
	{#if data.access === 'denied'}<section class="blocked">
			<p class="eyebrow">Permission required</p>
			<h1>Import access is restricted.</h1>
		</section>{:else}<section class="heading">
			<div>
				<p class="eyebrow">Migration tools</p>
				<h1>Data imports<span>.</span></h1>
				<p>
					Queue controlled migrations from spreadsheets or a legacy property system and keep every
					attempt visible.
				</p>
			</div>
			<span class="security">Validation before write</span>
		</section>
		{#if form?.message}<div class:failure={!form.success} class="notice">{form.message}</div>{/if}
		<div class="import-grid">
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">New migration</p>
						<h2>Queue an import</h2>
					</div>
					<span class="session-mark">⇧</span>
				</div>
				<form method="POST" action="?/queueImport">
					<label
						>Organization<select name="organization_id" required
							><option value="">Choose organization</option
							>{#each data.organizations as organization (organization.id)}<option
									value={organization.id}>{organization.name}</option
								>{/each}</select
						></label
					><label
						>Data type<select name="entity_type"
							><option value="properties">Properties</option><option value="spaces"
								>Units and spaces</option
							><option value="people">People and tenants</option><option value="tenancies"
								>Tenancies</option
							><option value="charges">Charges</option><option value="payments">Payments</option
							></select
						></label
					><label
						>Source file or system name<input
							name="source_name"
							required
							placeholder="e.g. Mbare tenant register - September.csv"
						/></label
					><button class="primary" type="submit">Queue validation <span>→</span></button>
				</form>
				<p class="form-note">
					The first step records the migration request. A validation worker can process the file
					before any client data is changed.
				</p>
				<div class="upload-divider"></div>
				<div class="panel-heading compact-heading">
					<div>
						<p class="eyebrow">CSV pipeline</p>
						<h2>Upload and validate</h2>
					</div>
				</div>
				<form method="POST" action="?/uploadCsv" enctype="multipart/form-data">
					<label
						>Organization<select name="organization_id" required
							><option value="">Choose organization</option
							>{#each data.organizations as organization (organization.id)}<option
									value={organization.id}>{organization.name}</option
								>{/each}</select
						></label
					>
					<label
						>Data type<select name="entity_type"
							><option value="properties">Properties</option><option value="spaces"
								>Units and spaces</option
							><option value="people">People and tenants</option><option value="tenancies"
								>Tenancies</option
							><option value="charges">Charges</option><option value="payments">Payments</option
							></select
						></label
					>
					<label>CSV file<input name="file" type="file" accept=".csv,text/csv" required /></label>
					<button class="primary" type="submit">Validate CSV <span>→</span></button>
				</form>
			</section>
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Migration history</p>
						<h2>Recent jobs</h2>
					</div>
					<span class="count">{data.jobs.length}</span>
				</div>
				{#if data.jobs.length === 0}<div class="empty">
						<strong>No import jobs yet</strong>
						<p>Queued migrations will appear here.</p>
					</div>{:else}<div class="job-list">
						{#each data.jobs as job (job.id)}<article class="job-row">
								<div class="job-mark">{job.entity_type.slice(0, 1).toUpperCase()}</div>
								<div class="job-info">
									<strong>{job.organizations?.[0]?.name ?? 'Unknown organization'}</strong><span
										>{job.source_name} · {job.entity_type}</span
									><small>{new Date(job.created_at).toLocaleString()}</small>
								</div>
								<span class="job-status {job.status}">{job.status.replaceAll('_', ' ')}</span>
								{#if ['validated', 'completed_with_errors'].includes(job.status)}<form
										method="POST"
										action="?/applyImport"
									>
										<input type="hidden" name="job_id" value={job.id} /><button
											class="text-button"
											type="submit">Apply valid rows →</button
										>
									</form>{/if}
							</article>{/each}
					</div>{/if}
			</section>
		</div>{/if}
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
	.import-grid {
		display: grid;
		grid-template-columns: 0.8fr 1.2fr;
		gap: 13px;
	}
	.panel {
		background: #fff;
		border: 1px solid #e4ebe4;
		border-radius: 10px;
		padding: 24px;
	}
	.panel-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 15px;
		margin-bottom: 23px;
	}
	.panel h2 {
		font-size: 19px;
		letter-spacing: -0.05em;
		margin: 0;
	}
	.session-mark {
		display: grid;
		place-items: center;
		width: 35px;
		height: 35px;
		border-radius: 10px;
		background: #edf4dc;
		color: #668d6d;
		font-size: 18px;
	}
	.panel form {
		display: grid;
		gap: 13px;
	}
	.panel label {
		display: grid;
		gap: 6px;
		color: #557366;
		font-size: 10px;
		font-weight: 700;
	}
	.panel input,
	.panel select {
		width: 100%;
		border: 1px solid #dfe9e1;
		border-radius: 6px;
		background: #fbfcfa;
		color: #426456;
		padding: 10px;
		outline: 0;
		font-size: 11px;
	}
	.primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 14px;
		border: 0;
		border-radius: 6px;
		background: var(--musha-deep);
		color: #fff;
		padding: 11px 13px;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
	}
	.primary span {
		color: var(--musha-lime);
		font-size: 16px;
	}
	.form-note {
		color: #99a69f;
		font-size: 10px;
		line-height: 1.5;
		margin: 16px 0 0;
	}
	.upload-divider {
		border-top: 1px solid #edf2ed;
		margin: 24px 0;
	}
	.compact-heading {
		margin-bottom: 14px;
	}
	.job-row form {
		margin-left: auto;
	}
	.count {
		background: #edf4dc;
		color: #668a6d;
		border-radius: 99px;
		padding: 7px 10px;
		font-size: 10px;
	}
	.job-list {
		display: grid;
		gap: 8px;
	}
	.job-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 11px;
		border: 1px solid #edf2ed;
		border-radius: 7px;
	}
	.job-mark {
		display: grid;
		place-items: center;
		width: 29px;
		height: 29px;
		border-radius: 8px;
		background: #edf4dc;
		color: #63896a;
		font-size: 11px;
		font-weight: 700;
	}
	.job-info {
		min-width: 0;
		flex: 1;
	}
	.job-info strong,
	.job-info span,
	.job-info small {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.job-info strong {
		color: #345b4b;
		font-size: 11px;
	}
	.job-info span,
	.job-info small {
		color: #8e9f96;
		font-size: 9px;
		margin-top: 3px;
	}
	.job-status {
		padding: 4px 6px;
		border-radius: 99px;
		background: #edf4dc;
		color: #668a6d;
		font-size: 9px;
		text-transform: capitalize;
	}
	.job-status.failed,
	.job-status.completed_with_errors {
		background: #fae9e5;
		color: #9a5548;
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
	@media (max-width: 850px) {
		.import-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 600px) {
		.heading {
			display: block;
		}
		.security {
			display: inline-block;
			margin-top: 18px;
		}
	}
</style>
