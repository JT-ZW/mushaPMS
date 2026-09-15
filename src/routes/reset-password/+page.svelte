<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { supabase } from '$lib/supabase/client';

	let password = $state('');
	let confirmation = $state('');
	let showPassword = $state(false);
	let showConfirmation = $state(false);
	let ready = $state(false);
	let hasSession = $state(false);
	let message = $state('');
	let success = $state(false);
	let saving = $state(false);

	onMount(async () => {
		const { data } = await supabase.auth.getSession();
		hasSession = Boolean(data.session);
		ready = true;
	});

	const updatePassword = async (event: SubmitEvent) => {
		event.preventDefault();
		message = '';
		success = false;

		if (password.length < 8) {
			message = 'Use at least 8 characters for your new password.';
			return;
		}
		if (password !== confirmation) {
			message = 'The passwords do not match.';
			return;
		}

		saving = true;
		const { error } = await supabase.auth.updateUser({ password });
		saving = false;
		if (error) {
			message = 'This reset link is no longer valid. Request a new one and try again.';
			return;
		}

		success = true;
		message = 'Your password has been updated. You can now sign in securely.';
	};
</script>

<svelte:head>
	<title>Choose a new password · Musha PMS</title>
	<meta name="description" content="Choose a new secure password for your Musha workspace." />
</svelte:head>

<main class="auth-shell">
	<section class="auth-card">
		<a class="brand" href={resolve('/')}
			><img class="musha-logo" src="/logo.png" alt="Musha Property Management System" /><span
				><strong>Musha</strong><small>Property management</small></span
			></a
		>
		<div class="intro">
			<p class="eyebrow">Secure reset</p>
			<h1>Set a fresh key<span>.</span></h1>
			<p>Choose a new password for your Musha workspace.</p>
		</div>

		{#if ready && !hasSession}
			<div class="message">
				This reset link is missing or has expired. Request a new link to continue.
			</div>
		{:else}
			{#if message}<div class:success class="message">{message}</div>{/if}
			<form onsubmit={updatePassword}>
				<label
					>New password
					<span class="password-field">
						<input
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							autocomplete="new-password"
							required
						/>
						<button
							class="visibility-toggle"
							type="button"
							aria-label={showPassword ? 'Hide new password' : 'Show new password'}
							onclick={() => (showPassword = !showPassword)}
						>
							{showPassword ? 'Hide' : 'Show'}
						</button>
					</span>
				</label>
				<label
					>Confirm password
					<span class="password-field">
						<input
							type={showConfirmation ? 'text' : 'password'}
							bind:value={confirmation}
							autocomplete="new-password"
							required
						/>
						<button
							class="visibility-toggle"
							type="button"
							aria-label={showConfirmation
								? 'Hide password confirmation'
								: 'Show password confirmation'}
							onclick={() => (showConfirmation = !showConfirmation)}
						>
							{showConfirmation ? 'Hide' : 'Show'}
						</button>
					</span>
				</label>
				<button type="submit" disabled={saving}
					>{saving ? 'Saving…' : 'Update password'} <span>→</span></button
				>
			</form>
		{/if}
		<a class="back-link" href={resolve('/login')}>← Back to sign in</a>
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
	.auth-shell {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 25px;
		background: radial-gradient(circle at 80% 10%, #e5efcf 0, transparent 35%), #f7f8f5;
	}
	.auth-card {
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
		font-size: 38px;
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
	.auth-card form {
		display: grid;
		gap: 15px;
	}
	.auth-card label {
		display: grid;
		gap: 6px;
		color: #567366;
		font-size: 12px;
		font-weight: 700;
	}
	.password-field {
		position: relative;
		display: block;
	}
	.auth-card input {
		width: 100%;
		border: 1px solid #dfe9e1;
		border-radius: 6px;
		padding: 11px;
		color: var(--musha-ink);
		outline: none;
	}
	.password-field input {
		padding-right: 54px;
	}
	.auth-card input:focus {
		border-color: #8eb898;
		box-shadow: 0 0 0 3px #eef7ee;
	}
	.visibility-toggle {
		position: absolute;
		top: 50%;
		right: 8px;
		transform: translateY(-50%);
		border: 0 !important;
		background: transparent !important;
		color: #668b73 !important;
		padding: 4px !important;
		margin: 0 !important;
		font-size: 10px !important;
	}
	.auth-card button:not(.visibility-toggle) {
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
	.auth-card button:disabled {
		cursor: wait;
		opacity: 0.7;
	}
	.auth-card button span {
		color: var(--musha-lime);
		margin-left: 15px;
		font-size: 16px;
	}
	.message {
		background: #fae9e5;
		color: #9a5548;
		border-radius: 6px;
		padding: 10px;
		margin: -8px 0 15px;
		font-size: 12px;
		line-height: 1.5;
	}
	.message.success {
		background: #e6f2e6;
		color: #39704c;
	}
	.back-link {
		display: block;
		color: #668b73;
		font-size: 12px;
		font-weight: 700;
		margin-top: 20px;
		text-align: center;
		text-decoration: none;
	}
	.back-link:hover {
		color: var(--musha-deep);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	@media (max-width: 480px) {
		.auth-shell {
			padding: 16px;
		}
		.auth-card {
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
