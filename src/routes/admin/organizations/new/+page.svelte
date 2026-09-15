<script lang="ts">
	import AdminChrome from '$lib/components/AdminChrome.svelte';
	import { resolve } from '$app/paths';
	let { data, form } = $props();
	let accessMode = $state('invite');
	let showPassword = $state(false);
	const modules = [
		{ key: 'residential', label: 'Residential', copy: 'Homes, units, leases and rent collection.' },
		{ key: 'commercial', label: 'Commercial', copy: 'Offices, shops and commercial tenancies.' },
		{
			key: 'student',
			label: 'Student accommodation',
			copy: 'Beds, rooms, occupants and academic cycles.'
		},
		{
			key: 'short_stay',
			label: 'Short stay / Airbnb',
			copy: 'Listings, stays, cleaning and guest operations.'
		}
	] as const;
</script>

<svelte:head><title>New organization · Musha platform</title></svelte:head>

<AdminChrome active="organizations">
	{#if data.access === 'denied'}
		<section class="blocked">
			<p class="eyebrow">Permission required</p>
			<h1>Only superadmins can create organizations.</h1>
			<p>Your account can support existing clients, but it cannot create new workspaces.</p>
			<a class="secondary" href={resolve('/admin/organizations')}>Back to organizations</a>
		</section>
	{:else}
		<section class="heading">
			<div>
				<a class="back" href={resolve('/admin/organizations')}>← Organizations</a>
				<p class="eyebrow">Client onboarding</p>
				<h1>Create an organization<span>.</span></h1>
				<p>
					Set up the client shell first. You can complete properties, units, and tenancies from the
					setup workspace.
				</p>
			</div>
			<span class="step">01 / 03</span>
		</section>
		{#if form?.message}<div class="error">{form.message}</div>{/if}
		<section class="form-card">
			<form method="POST">
				<div class="form-section">
					<p class="eyebrow">Workspace identity</p>
					<label
						>Organization name<input
							name="name"
							required
							placeholder="e.g. Mbare Residentials"
						/></label
					><label
						>Workspace slug<input name="slug" placeholder="mbare-residentials" /><small
							>Used in internal references and support tools.</small
						></label
					>
				</div>
				<div class="form-section">
					<p class="eyebrow">Operating context</p>
					<div class="form-row">
						<label
							>Currency<select name="currency_code" required
								><option value="USD">USD — US Dollar</option><option value="ZIG"
									>ZIG — Zimbabwe Gold</option
								></select
							></label
						><label
							>Timezone<select name="timezone"
								><option>Africa/Harare</option><option>Africa/Johannesburg</option><option
									>Africa/Lusaka</option
								><option>UTC</option></select
							></label
						>
					</div>
					<div class="module-allocation">
						<div class="section-intro">
							<div>
								<strong>Product modules</strong>
								<small>Allocate one or more operating models to this client.</small>
							</div>
							<span>Required</span>
						</div>
						<div class="module-grid">
							{#each modules as module, index (module.key)}
								<label class="module-option">
									<input type="checkbox" name="modules" value={module.key} checked={index === 0} />
									<span class="checkmark">✓</span>
									<span><strong>{module.label}</strong><small>{module.copy}</small></span>
								</label>
							{/each}
						</div>
					</div>
				</div>
				<div class="form-section">
					<p class="eyebrow">Client handoff</p>
					<fieldset class="access-modes">
						<legend>How should client access be provisioned?</legend>
						<label class:chosen={accessMode === 'invite'}>
							<input type="radio" name="access_mode" value="invite" bind:group={accessMode} />
							<span
								><strong>Send invitation</strong><small
									>The client sets their own password from the email.</small
								></span
							>
						</label>
						<label class:chosen={accessMode === 'create'}>
							<input type="radio" name="access_mode" value="create" bind:group={accessMode} />
							<span
								><strong>Create credentials</strong><small
									>Set a temporary password for immediate handover.</small
								></span
							>
						</label>
						<label class:chosen={accessMode === 'later'}>
							<input type="radio" name="access_mode" value="later" bind:group={accessMode} />
							<span
								><strong>Set up later</strong><small
									>Create the workspace now and provision access afterward.</small
								></span
							>
						</label>
					</fieldset>
					<label
						>Client administrator email <span class="optional"
							>{accessMode === 'later' ? 'optional' : 'required'}</span
						><input
							name="client_email"
							type="email"
							placeholder="admin@client.com"
							required={accessMode !== 'later'}
						/><small
							>{accessMode === 'invite'
								? 'The client receives a Supabase invitation and organization admin access.'
								: accessMode === 'create'
									? 'The account is confirmed immediately and assigned organization admin access.'
									: 'You can add an administrator from the organization workspace later.'}</small
						></label
					>
					{#if accessMode === 'create'}
						<label
							>Temporary password <span class="optional">minimum 8 characters</span><span
								class="password-field"
								><input
									name="temporary_password"
									type={showPassword ? 'text' : 'password'}
									minlength="8"
									required
								/><button
									class="visibility-toggle"
									type="button"
									aria-label={showPassword ? 'Hide temporary password' : 'Show temporary password'}
									onclick={() => (showPassword = !showPassword)}
									>{showPassword ? 'Hide' : 'Show'}</button
								></span
							></label
						>
					{/if}
				</div>
				<div class="actions">
					<a class="secondary" href={resolve('/admin/organizations')}>Cancel</a><button
						class="primary"
						type="submit">Create workspace <span>→</span></button
					>
				</div>
			</form>
		</section>
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
		max-width: 790px;
		margin-bottom: 29px;
	}
	.back {
		display: block;
		color: #6f8b7d;
		font-size: 11px;
		text-decoration: none;
		margin-bottom: 30px;
	}
	.heading h1 {
		font-size: clamp(34px, 5vw, 58px);
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
		line-height: 1.6;
		margin: 0;
	}
	.step {
		color: #91a49a;
		font-size: 10px;
	}
	.form-card {
		max-width: 790px;
		background: #fff;
		border: 1px solid #e4ebe4;
		border-radius: 12px;
		padding: 29px;
	}
	.form-card form {
		display: grid;
		gap: 29px;
	}
	.form-section {
		display: grid;
		gap: 13px;
		padding-bottom: 25px;
		border-bottom: 1px solid #edf2ed;
	}
	.form-section:last-of-type {
		border-bottom: 0;
		padding-bottom: 0;
	}
	.form-section .eyebrow {
		margin-bottom: 2px;
	}
	.form-section label {
		display: grid;
		gap: 6px;
		color: #557366;
		font-size: 11px;
		font-weight: 700;
	}
	.form-section input,
	.form-section select {
		width: 100%;
		border: 1px solid #dfe9e1;
		border-radius: 6px;
		background: #fbfcfa;
		color: #23483b;
		padding: 11px;
		outline: 0;
		font-size: 12px;
	}
	.form-section input:focus,
	.form-section select:focus {
		border-color: #8eb898;
		box-shadow: 0 0 0 3px #eef7ee;
	}
	.form-section small {
		color: #98a79e;
		font-size: 10px;
		font-weight: 400;
		margin-top: -2px;
	}
	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 13px;
	}
	.module-allocation {
		display: grid;
		gap: 12px;
		padding: 16px;
		border: 1px solid #e1ebe1;
		border-radius: 9px;
		background: #fbfdfb;
	}
	.section-intro,
	.access-modes legend {
		color: #557366;
		font-size: 12px;
		font-weight: 700;
	}
	.section-intro {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}
	.section-intro strong,
	.section-intro small {
		display: block;
	}
	.section-intro small,
	.section-intro > span {
		color: #91a49a;
		font-size: 10px;
		font-weight: 500;
		line-height: 1.5;
	}
	.section-intro small {
		margin-top: 4px;
	}
	.module-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 9px;
	}
	.module-option {
		position: relative;
		display: flex !important;
		grid-template-columns: auto 1fr;
		align-items: flex-start;
		gap: 9px !important;
		padding: 11px;
		border: 1px solid #e1ebe1;
		border-radius: 8px;
		background: #fff;
		cursor: pointer;
	}
	.module-option:has(input:checked) {
		border-color: #93bd82;
		background: #f2f8e9;
		box-shadow: 0 0 0 2px #e8f2dc;
	}
	.module-option input,
	.access-modes input {
		position: absolute;
		top: 12px;
		left: 12px;
		width: 17px;
		height: 17px;
		margin: 0;
		accent-color: var(--musha-deep);
	}
	.module-option > span:last-child {
		display: block;
		padding-left: 26px;
	}
	.module-option strong,
	.module-option small,
	.access-modes strong,
	.access-modes small {
		display: block;
	}
	.module-option strong,
	.access-modes strong {
		color: #345b4b;
		font-size: 12px;
	}
	.module-option small,
	.access-modes small {
		color: #879b90;
		font-size: 10px;
		font-weight: 400;
		line-height: 1.45;
		margin-top: 4px;
	}
	.checkmark {
		display: none !important;
	}
	.access-modes {
		display: grid;
		gap: 8px;
		padding: 0;
		margin: 0;
		border: 0;
	}
	.access-modes legend {
		padding: 0;
		margin-bottom: 2px;
	}
	.access-modes label {
		position: relative;
		display: block !important;
		padding: 12px 12px 12px 40px;
		border: 1px solid #e1ebe1;
		border-radius: 8px;
		background: #fff;
		cursor: pointer;
	}
	.access-modes label.chosen {
		border-color: #93bd82;
		background: #f2f8e9;
	}
	.access-modes input {
		top: 17px;
		left: 14px;
	}
	.password-field {
		position: relative;
		display: block;
	}
	.password-field input {
		padding-right: 64px;
	}
	.visibility-toggle {
		position: absolute;
		top: 50%;
		right: 9px;
		transform: translateY(-50%);
		border: 0;
		background: transparent;
		color: #568168;
		padding: 4px;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
	}
	.visibility-toggle:hover,
	.visibility-toggle:focus-visible {
		color: var(--musha-deep);
		text-decoration: underline;
	}
	.optional {
		color: #a0aea6;
		font-weight: 400;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 9px;
	}
	.primary,
	.secondary {
		display: inline-flex;
		align-items: center;
		gap: 14px;
		border: 0;
		border-radius: 7px;
		padding: 11px 14px;
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		cursor: pointer;
	}
	.primary {
		background: var(--musha-deep);
		color: #fff;
	}
	.primary span {
		color: var(--musha-lime);
		font-size: 17px;
	}
	.secondary {
		border: 1px solid #dce7df;
		background: #fff;
		color: #557568;
	}
	.error {
		max-width: 790px;
		margin: -10px 0 18px;
		border-radius: 7px;
		background: #fae9e5;
		color: #955549;
		padding: 11px 13px;
		font-size: 11px;
	}
	.blocked {
		max-width: 650px;
		padding: 26px;
		border: 1px solid #f0ded7;
		background: #fff8f5;
		border-radius: 10px;
	}
	.blocked h1 {
		font-size: 34px;
		letter-spacing: -0.07em;
		margin: 0 0 12px;
	}
	.blocked p:not(.eyebrow) {
		color: #9b7168;
		font-size: 13px;
		line-height: 1.6;
	}
	.blocked .secondary {
		margin-top: 10px;
	}
	@media (max-width: 650px) {
		.heading {
			display: block;
		}
		.step {
			display: inline-block;
			margin-top: 20px;
		}
		.form-card {
			padding: 21px;
		}
		.form-row {
			grid-template-columns: 1fr;
		}
		.module-grid {
			grid-template-columns: 1fr;
		}
		.actions {
			justify-content: stretch;
		}
		.actions > * {
			flex: 1;
			justify-content: center;
		}
	}
</style>
