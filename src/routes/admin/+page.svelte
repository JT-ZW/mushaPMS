<script lang="ts">
	import { resolve } from '$app/paths';
	import AdminChrome from '$lib/components/AdminChrome.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Platform admin · Musha PMS</title>
	<meta name="description" content="Musha platform administration and client organization setup." />
</svelte:head>

<AdminChrome active="overview">
	{#if data.access === 'signed_out'}
		<section class="gate">
			<div class="gate-icon">↗</div>
			<p class="eyebrow">Restricted area</p>
			<h1>Sign in to manage Musha.</h1>
			<p>Platform administration is separate from client organization access.</p>
			<a class="primary" href={resolve('/login')}>Continue to sign in</a>
		</section>
	{:else if data.access === 'denied'}
		<section class="gate">
			<div class="gate-icon">!</div>
			<p class="eyebrow">Access not granted</p>
			<h1>This area is for platform staff.</h1>
			<p>Your account is authenticated, but it has not been assigned a Musha platform role.</p>
			<a class="secondary" href={resolve('/workspace')}>Return to workspace</a>
		</section>
	{:else}
		<section>
			<section class="intro">
				<div>
					<p class="eyebrow">Platform operations</p>
					<h1>Client organizations<span>.</span></h1>
					<p>
						Create the client workspace, configure its operating context, and invite the client
						administrator for handover.
					</p>
				</div>
				<div class="role-badge"><i></i>{data.member.display_name ?? data.member.role}</div>
			</section>

			{#if form?.message}<div class:error={!form.success} class="notice">{form.message}</div>{/if}

			<section class="dashboard-metrics">
				<div class="metric-card hero-metric">
					<span>Total organizations</span><strong>{data.organizations.length}</strong><small
						>Across the Musha portfolio</small
					>
				</div>
				<div class="metric-card">
					<span>Properties</span><strong>{data.dashboard.properties}</strong><small
						>Registered portfolio records</small
					>
				</div>
				<div class="metric-card">
					<span>Units and spaces</span><strong>{data.dashboard.spaces}</strong><small
						>Rentable spaces tracked</small
					>
				</div>
				<div class="metric-card attention-metric">
					<span>Open support</span><strong>{data.dashboard.openSupport}</strong><small
						>Requests needing a response</small
					>
				</div>
			</section>

			<div class="dashboard-grid">
				<section class="panel attention-panel">
					<div class="panel-heading">
						<div>
							<p class="eyebrow">Portfolio watch</p>
							<h2>Clients needing attention</h2>
						</div>
						<span class="count">{data.dashboard.needingAttention.length}</span>
					</div>
					{#if data.dashboard.needingAttention.length === 0}<div class="dashboard-empty">
							<strong>Everything is moving cleanly</strong>
							<p>No onboarding or suspended organizations need review.</p>
						</div>{:else}<div class="attention-list">
							{#each data.dashboard.needingAttention.slice(0, 5) as organization (organization.id)}<a
									class="attention-row"
									href={resolve(`/admin/organizations/${organization.id}`)}
									><span class="org-avatar">{organization.name.slice(0, 1).toUpperCase()}</span
									><span class="attention-info"
										><strong>{organization.name}</strong><small
											>{organization.status === 'onboarding'
												? 'Onboarding in progress'
												: 'Access suspended'}</small
										></span
									><span class="status {organization.status}">{organization.status}</span></a
								>{/each}
						</div>{/if}
				</section>
				<section class="panel activity-panel">
					<div class="panel-heading">
						<div>
							<p class="eyebrow">Accountability</p>
							<h2>Recent platform activity</h2>
						</div>
						<a class="small-link" href={resolve('/admin/audit')}>View audit →</a>
					</div>
					{#if data.dashboard.recentActivity.length === 0}<div class="dashboard-empty">
							<strong>No activity recorded yet</strong>
							<p>Platform actions will appear here.</p>
						</div>{:else}<div class="activity-list">
							{#each data.dashboard.recentActivity.slice(0, 5) as activity (activity.id)}<div
									class="activity-row"
								>
									<span class="activity-mark">{activity.action.slice(0, 1).toUpperCase()}</span
									><span
										><strong>{activity.action.replaceAll('_', ' ')}</strong><small
											>{activity.organizations?.[0]?.name ?? 'Platform'} · {new Date(
												activity.created_at
											).toLocaleString()}</small
										></span
									>
								</div>{/each}
						</div>{/if}
				</section>
			</div>

			{#if data.dashboard.failedInvitations.length > 0}<section class="alert-strip">
					<span class="alert-icon">!</span>
					<div>
						<strong
							>{data.dashboard.failedInvitations.length} invitation issue{data.dashboard
								.failedInvitations.length === 1
								? ''
								: 's'} need review.</strong
						><small
							>Open the affected organization to resend access and update the client record.</small
						>
					</div>
					<a href={resolve('/admin/organizations')}>Review organizations →</a>
				</section>{/if}

			<div class="admin-grid">
				<section class="panel setup-panel">
					<div class="panel-heading">
						<div>
							<p class="eyebrow">New client workspace</p>
							<h2>Create an organization</h2>
						</div>
						<span class="step">01 / 03</span>
					</div>
					<p class="panel-copy">
						Set up the organization shell now. Property, unit, tenant, and billing configuration can
						be completed during implementation.
					</p>
					<a class="primary setup-launch-link" href={resolve('/admin/organizations/new')}
						>Open guided organization setup <span>→</span></a
					>
					<form method="POST" action="?/createOrganization" class="setup-form">
						<label
							>Organization name<input
								name="name"
								required
								placeholder="e.g. Mbare Residentials"
							/></label
						>
						<label>Slug<input name="slug" placeholder="mbare-residentials" /></label>
						<div class="form-row">
							<label
								>Currency<input name="currency_code" value="USD" maxlength="3" required /></label
							><label
								>Timezone<select name="timezone"
									><option>Africa/Harare</option><option>Africa/Johannesburg</option><option
										>Africa/Lusaka</option
									><option>UTC</option></select
								></label
							>
						</div>
						<label
							>Onboarding template<select name="onboarding_template"
								><option value="residential">Traditional residential</option><option
									value="commercial">Commercial property</option
								><option value="student">Student accommodation</option><option value="short_stay"
									>Short stay / Airbnb</option
								></select
							></label
						>
						<label
							>Client administrator email <span class="optional">optional</span><input
								type="email"
								name="client_email"
								placeholder="admin@client.com"
							/></label
						>
						<p class="form-note">
							When provided, the client receives an invitation and is assigned the organization
							administrator role.
						</p>
						<button class="primary" type="submit">Create organization <span>→</span></button>
					</form>
				</section>

				<section class="panel overview-panel">
					<div class="panel-heading">
						<div>
							<p class="eyebrow">Portfolio at a glance</p>
							<h2>Active clients</h2>
						</div>
						<span class="count">{data.organizations.length}</span>
					</div>
					{#if data.organizations.length === 0}<div class="empty">
							<div>⌂</div>
							<strong>No organizations yet</strong>
							<p>The first client workspace will appear here after setup.</p>
						</div>{:else}<div class="org-list">
							{#each data.organizations as organization (organization.id)}<article class="org-row">
									<div class="org-avatar">{organization.name.slice(0, 1).toUpperCase()}</div>
									<div class="org-info">
										<strong>{organization.name}</strong><span
											>{organization.slug} · {organization.currency_code}</span
										>
									</div>
									<span class="status {organization.status}">{organization.status}</span>
								</article>{/each}
						</div>{/if}
				</section>
			</div>

			<section class="support-strip">
				<div class="support-icon">◌</div>
				<div>
					<p class="eyebrow">Support access</p>
					<h2>Every intervention stays accountable.</h2>
					<p>
						Support sessions default to read-only access, expire automatically, and are recorded
						with the operator and reason.
					</p>
				</div>
				<span class="audit-pill">Audit logging ready</span>
			</section>
		</section>
	{/if}
</AdminChrome>

<style>
	:global(*) {
		box-sizing: border-box;
	}
	:global(body) {
		margin: 0;
		background: #f7f8f5;
		color: var(--musha-ink);
		font-family: var(--font-body);
	}
	:global(button),
	:global(input),
	:global(select) {
		font: inherit;
	}
	.intro {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 38px;
	}
	.eyebrow {
		color: #7b9588;
		font-size: 10px;
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
	.intro h1 {
		font-size: clamp(34px, 5vw, 60px);
		letter-spacing: -0.08em;
		line-height: 0.95;
		margin-bottom: 17px;
	}
	.intro h1 span {
		color: var(--musha-lime);
	}
	.intro p:not(.eyebrow) {
		max-width: 520px;
		color: #6e887b;
		font-size: 14px;
		line-height: 1.6;
		margin: 0;
	}
	.role-badge {
		background: #e9f1e9;
		color: #54786a;
		border-radius: 99px;
		padding: 9px 13px;
		font-size: 11px;
	}
	.role-badge i {
		display: inline-block;
		width: 6px;
		height: 6px;
		margin-right: 6px;
		border-radius: 50%;
		background: #62a578;
	}
	.notice {
		border-radius: 8px;
		background: #e5f2e5;
		color: #376b4a;
		padding: 12px 15px;
		margin: -16px 0 20px;
		font-size: 12px;
	}
	.notice.error {
		background: #fae9e5;
		color: #9a5548;
	}
	.dashboard-metrics {
		display: grid;
		grid-template-columns: 1.25fr 1fr 1fr 1fr;
		gap: 9px;
		margin-bottom: 14px;
	}
	.metric-card {
		min-height: 116px;
		padding: 17px;
		border: 1px solid #e4ebe4;
		border-radius: 9px;
		background: #fff;
	}
	.metric-card span,
	.metric-card small {
		display: block;
		color: #7d9489;
		font-size: 10px;
	}
	.metric-card strong {
		display: block;
		margin: 12px 0 4px;
		font-size: 28px;
		letter-spacing: -0.07em;
	}
	.hero-metric {
		background: var(--musha-deep);
		border-color: var(--musha-deep);
		color: #fff;
	}
	.hero-metric span,
	.hero-metric small {
		color: #a9c5b4;
	}
	.attention-metric {
		background: #f5f7e9;
		border-color: #e1eacb;
	}
	.dashboard-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px;
		margin-bottom: 14px;
	}
	.dashboard-grid .panel {
		min-height: 250px;
	}
	.dashboard-empty {
		display: grid;
		place-content: center;
		min-height: 155px;
		text-align: center;
	}
	.dashboard-empty strong {
		color: #46695a;
		font-size: 12px;
	}
	.dashboard-empty p {
		color: #92a299;
		font-size: 10px;
		line-height: 1.5;
		margin: 7px 0 0;
	}
	.attention-list,
	.activity-list {
		display: grid;
		gap: 7px;
		margin-top: 20px;
	}
	.attention-row,
	.activity-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px;
		border: 1px solid #edf2ed;
		border-radius: 7px;
		text-decoration: none;
	}
	.attention-row:hover {
		background: #fbfdf9;
	}
	.attention-info,
	.activity-row > span:last-child {
		min-width: 0;
		flex: 1;
	}
	.attention-info strong,
	.attention-info small,
	.activity-row strong,
	.activity-row small {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.attention-info strong,
	.activity-row strong {
		color: #345b4b;
		font-size: 11px;
		text-transform: capitalize;
	}
	.attention-info small,
	.activity-row small {
		color: #91a198;
		font-size: 9px;
		margin-top: 4px;
	}
	.activity-mark {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		background: #edf4dc;
		color: #668a6d;
		font-size: 10px;
		font-weight: 700;
	}
	.small-link {
		color: #598066;
		font-size: 10px;
		text-decoration: none;
		white-space: nowrap;
	}
	.alert-strip {
		display: flex;
		align-items: center;
		gap: 11px;
		margin-bottom: 14px;
		padding: 13px 15px;
		border: 1px solid #eedacb;
		border-radius: 9px;
		background: #fff8f1;
	}
	.alert-icon {
		display: grid;
		place-items: center;
		width: 27px;
		height: 27px;
		border-radius: 8px;
		background: #f4d4bd;
		color: #a15c42;
		font-weight: 800;
	}
	.alert-strip div {
		min-width: 0;
		flex: 1;
	}
	.alert-strip strong,
	.alert-strip small {
		display: block;
	}
	.alert-strip strong {
		color: #845442;
		font-size: 11px;
	}
	.alert-strip small {
		color: #aa8170;
		font-size: 10px;
		margin-top: 3px;
	}
	.alert-strip a {
		color: #965b45;
		font-size: 10px;
		font-weight: 700;
		text-decoration: none;
		white-space: nowrap;
	}
	.admin-grid {
		display: grid;
		grid-template-columns: 1.05fr 0.95fr;
		gap: 14px;
	}
	.panel {
		background: #fff;
		border: 1px solid #e4ebe4;
		border-radius: 12px;
		padding: 25px;
	}
	.panel-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
	}
	.panel h2 {
		font-size: 20px;
		letter-spacing: -0.05em;
		margin: 0;
	}
	.step,
	.count {
		color: #9aada3;
		font-size: 10px;
	}
	.count {
		background: #edf4dc;
		color: #658b6d;
		padding: 7px 10px;
		border-radius: 99px;
	}
	.panel-copy {
		color: #7c9187;
		font-size: 12px;
		line-height: 1.6;
		margin: 14px 0 23px;
	}
	.setup-form {
		display: none;
	}
	.setup-launch-link {
		width: fit-content;
	}
	.setup-form label {
		display: grid;
		gap: 6px;
		color: #567366;
		font-size: 11px;
		font-weight: 700;
	}
	.setup-form input,
	.setup-form select {
		width: 100%;
		border: 1px solid #dfe9e1;
		border-radius: 6px;
		color: #26483d;
		padding: 10px 11px;
		outline: none;
		background: #fbfcfa;
		font-size: 12px;
	}
	.setup-form input:focus,
	.setup-form select:focus {
		border-color: #8eb898;
		box-shadow: 0 0 0 3px #eef7ee;
	}
	.form-row {
		display: grid;
		grid-template-columns: 0.7fr 1.3fr;
		gap: 12px;
	}
	.optional {
		color: #a1afa7;
		font-weight: 400;
		margin-left: 4px;
	}
	.form-note {
		color: #95a49c;
		font-size: 10px;
		line-height: 1.5;
		margin: -3px 0 0;
	}
	.primary,
	.secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: fit-content;
		border: 0;
		border-radius: 7px;
		background: var(--musha-deep);
		color: #fff;
		padding: 11px 14px;
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		cursor: pointer;
	}
	.primary span {
		color: var(--musha-lime);
		margin-left: 16px;
		font-size: 17px;
	}
	.secondary {
		background: #e9f1e9;
		color: #557568;
	}
	.empty {
		min-height: 250px;
		display: grid;
		place-content: center;
		justify-items: center;
		text-align: center;
		color: #7a9185;
	}
	.empty div {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		border-radius: 50%;
		background: #edf4dc;
		color: #71936f;
		margin-bottom: 13px;
	}
	.empty strong {
		color: #436558;
		font-size: 13px;
	}
	.empty p {
		font-size: 11px;
		margin: 7px 0 0;
	}
	.org-list {
		display: grid;
		gap: 6px;
		margin-top: 24px;
	}
	.org-row {
		display: flex;
		align-items: center;
		gap: 11px;
		border: 1px solid #edf1ed;
		border-radius: 8px;
		padding: 11px;
	}
	.org-avatar {
		width: 30px;
		height: 30px;
		border-radius: 8px;
		display: grid;
		place-items: center;
		color: #4d775e;
		background: #edf4dc;
		font-weight: 700;
		font-size: 12px;
	}
	.org-info {
		min-width: 0;
		flex: 1;
	}
	.org-info strong,
	.org-info span {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.org-info strong {
		font-size: 12px;
	}
	.org-info span {
		color: #92a299;
		font-size: 10px;
		margin-top: 4px;
	}
	.status {
		padding: 4px 7px;
		border-radius: 99px;
		background: #edf4dc;
		color: #668a6d;
		font-size: 9px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.status.suspended {
		background: #faedd7;
		color: #9a7955;
	}
	.status.archived {
		background: #eef0ee;
		color: #899790;
	}
	.support-strip {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-top: 14px;
		border-radius: 12px;
		background: var(--musha-deep);
		color: #e7f1e8;
		padding: 22px 25px;
	}
	.support-icon {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: var(--musha-lime);
		color: var(--musha-deep);
		font-size: 20px;
	}
	.support-strip .eyebrow {
		color: #9dc1a7;
	}
	.support-strip h2 {
		font-size: 16px;
		letter-spacing: -0.04em;
		margin: 0 0 6px;
	}
	.support-strip p:not(.eyebrow) {
		color: #a9c5b4;
		font-size: 11px;
		line-height: 1.5;
		margin: 0;
	}
	.audit-pill {
		margin-left: auto;
		color: var(--musha-lime);
		border: 1px solid #426a5a;
		border-radius: 99px;
		padding: 7px 10px;
		font-size: 10px;
		white-space: nowrap;
	}
	.gate {
		min-height: calc(100vh - 76px);
		display: grid;
		place-content: center;
		justify-items: center;
		text-align: center;
		padding: 25px;
	}
	.gate-icon {
		display: grid;
		place-items: center;
		width: 54px;
		height: 54px;
		border-radius: 16px;
		background: #dcebbd;
		color: #5b8569;
		font-size: 25px;
		margin-bottom: 22px;
	}
	.gate h1 {
		font-size: 34px;
		letter-spacing: -0.07em;
		margin-bottom: 12px;
	}
	.gate > p:not(.eyebrow) {
		max-width: 350px;
		color: #789084;
		font-size: 13px;
		line-height: 1.6;
		margin-bottom: 22px;
	}
	@media (max-width: 760px) {
		.intro {
			display: block;
		}
		.role-badge {
			display: inline-block;
			margin-top: 20px;
		}
		.admin-grid {
			grid-template-columns: 1fr;
		}
		.dashboard-metrics,
		.dashboard-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.dashboard-grid .panel {
			min-height: 0;
		}
		.support-strip {
			align-items: flex-start;
			flex-wrap: wrap;
		}
		.audit-pill {
			margin-left: 54px;
		}
		.form-row {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 500px) {
		.dashboard-metrics,
		.dashboard-grid {
			grid-template-columns: 1fr;
		}
		.alert-strip {
			align-items: flex-start;
			flex-wrap: wrap;
		}
		.alert-strip a {
			margin-left: 38px;
		}
	}
</style>
