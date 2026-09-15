<script lang="ts">
	import AdminChrome from '$lib/components/AdminChrome.svelte';
	let { data, form } = $props();
	const subscriptionFor = (organizationId: string) =>
		data.subscriptions.find((subscription) => subscription.organization_id === organizationId);
</script>

<svelte:head><title>Billing and plans · Musha platform</title></svelte:head>

<AdminChrome active="billing">
	{#if data.access === 'denied'}<section class="blocked">
			<p class="eyebrow">Permission required</p>
			<h1>Billing access is restricted.</h1>
		</section>{:else}<section class="heading">
			<div>
				<p class="eyebrow">Commercial operations</p>
				<h1>Billing & plans<span>.</span></h1>
				<p>
					Assign a plan, track client status, and keep commercial context alongside the workspace.
				</p>
			</div>
			<span class="security">No payment gateway connected</span>
		</section>
		{#if form?.message}<div class:failure={!form.success} class="notice">{form.message}</div>{/if}
		<div class="plan-grid">
			{#each data.plans as plan (plan.id)}<article class="plan-card">
					<span class="eyebrow">Plan</span>
					<h2>{plan.name}</h2>
					<strong
						>{plan.monthly_price === 0
							? 'Free'
							: `${plan.currency_code} ${plan.monthly_price}`}<small>/ month</small></strong
					>
					<p>
						{plan.property_limit
							? `Up to ${plan.property_limit} properties`
							: 'Unlimited properties'} · {plan.space_limit
							? `${plan.space_limit} spaces`
							: 'Unlimited spaces'}
					</p>
				</article>{/each}
		</div>
		<section class="table-card">
			<div class="table-heading">
				<div>
					<p class="eyebrow">Client subscriptions</p>
					<h2>Portfolio coverage</h2>
				</div>
				<span class="count">{data.organizations.length}</span>
			</div>
			{#if data.organizations.length === 0}<div class="empty">No organizations yet.</div>{:else}<div
					class="subscription-list"
				>
					{#each data.organizations as organization (organization.id)}{@const subscription =
							subscriptionFor(organization.id)}
						<article class="subscription-row">
							<div class="org">
								<span class="avatar">{organization.name.slice(0, 1).toUpperCase()}</span><span
									><strong>{organization.name}</strong><small>{organization.status}</small></span
								>
							</div>
							<div class="current-plan">
								<span>Current plan</span><strong
									>{subscription?.platform_plans?.[0]?.name ?? 'Not assigned'}</strong
								>
							</div>
							<form method="POST" action="?/assignPlan">
								<input type="hidden" name="organization_id" value={organization.id} /><select
									name="plan_id"
									required
									><option value="">Assign plan</option>{#each data.plans as plan (plan.id)}<option
											value={plan.id}
											selected={subscription?.plan_id === plan.id}>{plan.name}</option
										>{/each}</select
								><select name="status"
									><option value="trial" selected={subscription?.status === 'trial'}>Trial</option
									><option value="active" selected={subscription?.status === 'active'}
										>Active</option
									><option value="past_due" selected={subscription?.status === 'past_due'}
										>Past due</option
									><option value="paused" selected={subscription?.status === 'paused'}
										>Paused</option
									><option value="cancelled" selected={subscription?.status === 'cancelled'}
										>Cancelled</option
									></select
								><button type="submit">Save</button>
							</form>
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
	.plan-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		margin-bottom: 14px;
	}
	.plan-card,
	.table-card {
		background: #fff;
		border: 1px solid #e4ebe4;
		border-radius: 10px;
	}
	.plan-card {
		padding: 20px;
	}
	.plan-card h2 {
		margin: 0 0 16px;
		font-size: 19px;
		letter-spacing: -0.05em;
	}
	.plan-card > strong {
		display: block;
		font-size: 24px;
		letter-spacing: -0.06em;
	}
	.plan-card > strong small {
		color: #91a198;
		font-size: 10px;
		letter-spacing: 0;
	}
	.plan-card p {
		color: #82968c;
		font-size: 10px;
		line-height: 1.5;
		margin: 8px 0 0;
	}
	.table-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 22px 24px;
		border-bottom: 1px solid #edf2ed;
	}
	.table-heading h2 {
		margin: 0;
		font-size: 19px;
		letter-spacing: -0.05em;
	}
	.count {
		background: #edf4dc;
		color: #668a6d;
		border-radius: 99px;
		padding: 7px 10px;
		font-size: 10px;
	}
	.subscription-list {
		display: grid;
	}
	.subscription-row {
		display: grid;
		grid-template-columns: 1.2fr 0.8fr 1.5fr;
		align-items: center;
		gap: 15px;
		padding: 13px 24px;
		border-bottom: 1px solid #edf2ed;
	}
	.subscription-row:last-child {
		border-bottom: 0;
	}
	.org {
		display: flex;
		align-items: center;
		gap: 9px;
		min-width: 0;
	}
	.avatar {
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
	.org strong,
	.org small,
	.current-plan span,
	.current-plan strong {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.org strong,
	.current-plan strong {
		color: #345b4b;
		font-size: 11px;
	}
	.org small,
	.current-plan span {
		color: #91a198;
		font-size: 9px;
		margin-top: 3px;
		text-transform: capitalize;
	}
	.subscription-row form {
		display: flex;
		gap: 6px;
	}
	.subscription-row select,
	.subscription-row button {
		min-width: 0;
		border: 1px solid #dfe9e1;
		border-radius: 6px;
		background: #fbfcfa;
		color: #557568;
		padding: 8px;
		font-size: 10px;
	}
	.subscription-row select {
		flex: 1;
	}
	.subscription-row button {
		background: var(--musha-deep);
		border-color: var(--musha-deep);
		color: #fff;
		cursor: pointer;
	}
	.empty,
	.blocked {
		padding: 25px;
		color: #81958b;
		font-size: 12px;
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
		.plan-grid {
			grid-template-columns: 1fr;
		}
		.subscription-row {
			grid-template-columns: 1fr;
			gap: 9px;
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
		.subscription-row form {
			flex-wrap: wrap;
		}
	}
</style>
