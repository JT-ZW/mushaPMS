<script lang="ts">
	import { resolve } from '$app/paths';

	let { form } = $props();
	let showPassword = $state(false);
</script>

<svelte:head><title>Sign in · Musha PMS</title></svelte:head>

<main class="login-shell">
	<section class="login-card">
		<a class="brand" href={resolve('/')}
			><img class="musha-logo" src="/logo.png" alt="Musha Property Management System" /><span
				><strong>Musha</strong><small>Property management</small></span
			></a
		>
		<div class="intro">
			<p class="eyebrow">Secure access</p>
			<h1>Welcome back<span>.</span></h1>
			<p>Sign in to your Musha workspace or platform administration console.</p>
		</div>
		{#if form?.message}<div class="error">{form.message}</div>{/if}
		<form method="POST">
			<label>Email address<input type="email" name="email" autocomplete="email" required /></label>
			<label
				>Password
				<span class="password-field">
					<input
						type={showPassword ? 'text' : 'password'}
						name="password"
						autocomplete="current-password"
						required
					/>
					<button
						class="visibility-toggle"
						type="button"
						aria-label={showPassword ? 'Hide password' : 'Show password'}
						aria-pressed={showPassword}
						onclick={() => (showPassword = !showPassword)}
					>
						{#if showPassword}
							<svg viewBox="0 0 24 24" aria-hidden="true"
								><path
									d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.6 4.6 9.7 7a15.7 15.7 0 0 1-3.1 4.1M6.1 6.1C3.9 7.5 2.6 9.6 2.3 12c.6 1.3 1.8 3.1 3.7 4.6A9.6 9.6 0 0 0 12 19c1.1 0 2.1-.2 3-.5"
								/></svg
							>
						{:else}
							<svg viewBox="0 0 24 24" aria-hidden="true"
								><path
									d="M2.3 12C3.4 9.6 6.8 5 12 5s8.6 4.6 9.7 7c-1.1 2.4-4.5 7-9.7 7S3.4 14.4 2.3 12Z"
								/><circle cx="12" cy="12" r="2.6" /></svg
							>
						{/if}
					</button>
				</span>
			</label>
			<div class="form-footer">
				<a href={resolve('/forgot-password')}>Forgot password?</a>
			</div>
			<button type="submit">Sign in <span>→</span></button>
		</form>
		<p class="note">Accounts are provisioned by the Musha platform administrator.</p>
	</section>
</main>

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
	.login-shell {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 25px;
		background: radial-gradient(circle at 80% 10%, #e5efcf 0, transparent 35%), #f7f8f5;
	}
	.login-card {
		width: min(100%, 390px);
		padding: 42px;
		border: 1px solid #e2ebe2;
		border-radius: 14px;
		background: #fff;
		box-shadow: 0 24px 60px #315c4610;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--musha-ink);
		text-decoration: none;
	}
	.brand strong,
	.brand small {
		display: block;
	}
	.brand strong {
		font-size: 19px;
		letter-spacing: -0.04em;
	}
	.brand small {
		color: #83988d;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		margin-top: 3px;
	}
	.intro {
		margin: 56px 0 25px;
	}
	.eyebrow {
		color: #7b9588;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.16em;
		margin: 0 0 9px;
		text-transform: uppercase;
	}
	.intro h1 {
		font-size: 40px;
		letter-spacing: -0.08em;
		line-height: 0.95;
		margin: 0 0 15px;
	}
	.intro h1 span {
		color: var(--musha-lime);
	}
	.intro p:not(.eyebrow) {
		color: #7b9186;
		font-size: 14px;
		line-height: 1.6;
		margin: 0;
	}
	.login-card form {
		display: grid;
		gap: 15px;
	}
	.login-card label {
		display: grid;
		gap: 6px;
		color: #567366;
		font-size: 12px;
		font-weight: 700;
	}
	.login-card input {
		width: 100%;
		border: 1px solid #dfe9e1;
		border-radius: 6px;
		padding: 11px;
		color: var(--musha-ink);
		outline: none;
	}
	.login-card input:focus {
		border-color: #8eb898;
		box-shadow: 0 0 0 3px #eef7ee;
	}
	.password-field {
		position: relative;
		display: block;
	}
	.password-field input {
		padding-right: 42px;
	}
	.visibility-toggle {
		position: absolute;
		top: 50%;
		right: 9px;
		width: 28px;
		height: 28px;
		margin: 0;
		padding: 5px;
		transform: translateY(-50%);
		border: 0 !important;
		border-radius: 5px !important;
		background: transparent !important;
		color: #789287 !important;
		box-shadow: none !important;
	}
	.visibility-toggle:hover,
	.visibility-toggle:focus-visible {
		background: #eef5e9 !important;
		color: var(--musha-deep) !important;
	}
	.visibility-toggle svg {
		width: 17px;
		height: 17px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}
	.form-footer {
		display: flex;
		justify-content: flex-end;
		margin-top: -5px;
	}
	.form-footer a {
		color: #668b73;
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
	}
	.form-footer a:hover {
		color: var(--musha-deep);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.login-card button {
		margin-top: 7px;
		border: 0;
		border-radius: 7px;
		background: var(--musha-deep);
		color: #fff;
		padding: 12px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
	}
	.login-card button span {
		color: var(--musha-lime);
		margin-left: 15px;
		font-size: 16px;
	}
	.note {
		color: #a0ada5;
		font-size: 11px;
		line-height: 1.5;
		margin: 19px 0 0;
		text-align: center;
	}
	.error {
		background: #fae9e5;
		color: #9a5548;
		border-radius: 6px;
		padding: 10px;
		margin: -8px 0 15px;
		font-size: 12px;
	}
	@media (max-width: 480px) {
		.login-shell {
			padding: 16px;
		}
		.login-card {
			padding: 28px 22px;
			border-radius: 12px;
		}
		.intro {
			margin-top: 42px;
		}
		.intro h1 {
			font-size: clamp(34px, 11vw, 40px);
		}
	}
</style>
