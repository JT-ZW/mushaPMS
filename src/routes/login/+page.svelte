<script lang="ts">
	import { resolve } from '$app/paths';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	let { form } = $props();
	let showPassword = $state(false);
</script>

<svelte:head
	><title>Welcome back — Musha PMS</title><meta
		name="description"
		content="Sign in to your Musha property management workspace."
	/><meta name="robots" content="noindex" /></svelte:head
>
<main class="login-shell">
	<section class="access-pane" aria-labelledby="login-title">
		<header class="access-header">
			<BrandLogo variant="auth" /><a class="back-link" href={resolve('/')}
				>Back to website <span>↗</span></a
			>
		</header>
		<div class="login-content">
			<p class="eyebrow">YOUR MUSHA WORKSPACE</p>
			<h1 id="login-title">Welcome <em>back.</em></h1>
			<p class="intro-copy">
				A clearer day starts here. Sign in to bring your properties, people and everyday work into
				view.
			</p>
			{#if form?.message}<div class="error" id="signin-error" role="alert">{form.message}</div>{/if}
			<form method="POST" aria-label="Sign in to Musha">
				<div class="field">
					<label for="email">Email address</label><input
						id="email"
						type="email"
						name="email"
						placeholder="you@yourcompany.com"
						autocomplete="username"
						required
						aria-invalid={form?.message ? 'true' : undefined}
						aria-describedby={form?.message ? 'signin-error' : undefined}
					/>
				</div>
				<div class="field">
					<label for="password">Password</label>
					<div class="password-field">
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							name="password"
							placeholder="Enter your password"
							autocomplete="current-password"
							required
							aria-invalid={form?.message ? 'true' : undefined}
							aria-describedby={form?.message ? 'signin-error' : undefined}
						/><button
							class="visibility-toggle"
							type="button"
							aria-label={showPassword ? 'Hide password' : 'Show password'}
							aria-pressed={showPassword}
							aria-controls="password"
							onclick={() => (showPassword = !showPassword)}
							>{showPassword ? 'Hide' : 'Show'}</button
						>
					</div>
				</div>
				<div class="form-footer">
					<span>YOUR PERSONAL WORKSPACE</span><a href={resolve('/forgot-password')}
						>Forgot password?</a
					>
				</div>
				<button class="submit-button" type="submit" data-loading-text="Signing in…"
					>Sign in to Musha <span aria-hidden="true">↗</span></button
				>
			</form>
			<div class="access-note">
				<span class="note-rule"></span>
				<p>New to Musha? <a href={resolve('/contact')}>Let’s talk about your portfolio ↗</a></p>
				<small>Access is personally arranged for each organization.</small>
			</div>
		</div>
		<footer class="access-footer">
			<span>© {new Date().getFullYear()} Musha PMS</span><span
				>Properties. People. Possibilities.</span
			>
		</footer>
	</section>
	<aside class="visual-pane" aria-label="The Musha perspective">
		<img
			src="/images/musha-architecture.jpg"
			alt="A contemporary residence with warmly lit living spaces and a landscaped garden"
			width="1400"
			height="933"
			fetchpriority="high"
		/>
		<div class="visual-overlay"></div>
		<div class="visual-top">
			<span>THE MUSHA PERSPECTIVE</span><span>01 / A BETTER EVERYDAY</span>
		</div>
		<div class="visual-copy">
			<p>THOUGHTFULLY BUILT. FOR THE WAY YOU MANAGE.</p>
			<h2>Exceptional places.<br /><em>Beautifully managed.</em></h2>
			<div class="visual-line"></div>
			<p class="visual-description">A better home for the work<br />behind your properties.</p>
		</div>
		<div class="visual-foot">
			<span>BUILT IN ZIMBABWE. BUILT AROUND YOU.</span><span aria-hidden="true">↗</span>
		</div>
	</aside>
</main>

<style>
	.login-shell {
		display: grid;
		grid-template-columns: 1fr 1fr;
		min-height: 100svh;
		background: #f5f3ed;
		color: #203d32;
		font-family: var(--font-body);
	}
	.login-shell * {
		box-sizing: border-box;
	}
	.access-pane {
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 24px 8% 22px;
	}
	.access-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 25px;
	}
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 17px;
		font-size: 11px;
		text-decoration: none;
		color: #64725d;
	}
	.back-link span {
		font-size: 18px;
	}
	.login-content {
		width: 100%;
		max-width: 390px;
		margin: auto;
		padding: 50px 0;
	}
	.eyebrow {
		font-size: 9px;
		letter-spacing: 2px;
		color: #738064;
		font-weight: 600;
		margin: 0 0 23px;
	}
	h1 {
		font-weight: 400;
		font-size: clamp(42px, 3.7vw, 60px);
		line-height: 1.1;
		letter-spacing: -2.8px;
		margin: 0 0 22px;
	}
	h1 em,
	h2 em {
		font-family: Georgia, 'Times New Roman', serif;
		font-weight: 400;
	}
	.intro-copy {
		font-size: 13px;
		line-height: 1.9;
		color: #6e7867;
		margin: 0 0 34px;
		max-width: 365px;
	}
	form {
		display: grid;
		gap: 22px;
	}
	.field {
		display: grid;
		gap: 10px;
	}
	.field label {
		font-size: 12px;
		font-weight: 500;
		color: #3b4e3a;
	}
	input {
		width: 100%;
		height: 54px;
		border: 1px solid #d7dccd;
		border-radius: 3px;
		padding: 14px 16px;
		background: #fffef9;
		color: #203d32;
		font-size: 14px;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}
	input::placeholder {
		color: #929889;
		font-size: 12px;
	}
	input:focus {
		outline: none;
		border-color: #7f9667;
		box-shadow: 0 0 0 3px #dce5cf;
	}
	.password-field {
		position: relative;
	}
	.password-field input {
		padding-right: 65px;
	}
	.visibility-toggle {
		position: absolute;
		right: 7px;
		top: 7px;
		min-width: 48px;
		min-height: 40px;
		background: transparent;
		border: 0;
		font: inherit;
		font-size: 11px;
		color: #566b48;
		cursor: pointer;
		border-radius: 2px;
	}
	.visibility-toggle:hover {
		background: #e9eddf;
	}
	.form-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		margin-top: -7px;
	}
	.form-footer > span {
		font-size: 7px;
		letter-spacing: 1.2px;
		color: #839075;
	}
	.form-footer a {
		font-size: 11px;
		color: #48603c;
		text-decoration: none;
	}
	.form-footer a:hover {
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.submit-button {
		margin-top: 5px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		width: 100%;
		min-height: 56px;
		padding: 16px 20px;
		background: #203d32;
		color: #fff;
		border: 0;
		border-radius: 2px;
		font: inherit;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition:
			background 0.2s,
			transform 0.2s;
	}
	.submit-button > span {
		font-size: 23px;
		color: #d6e8ae;
		line-height: 1;
	}
	.submit-button:hover {
		background: #355542;
		transform: translateY(-2px);
	}
	.submit-button:disabled {
		opacity: 0.7;
		cursor: wait;
		transform: none;
	}
	.access-note {
		margin-top: 30px;
	}
	.note-rule {
		display: block;
		width: 32px;
		height: 1px;
		background: #bbc5ac;
		margin-bottom: 19px;
	}
	.access-note p {
		font-size: 10px;
		line-height: 1.8;
		color: #79836e;
		margin: 0 0 6px;
	}
	.access-note a {
		color: #49603c;
		text-decoration: none;
		border-bottom: 1px solid #b7c1a5;
		padding-bottom: 2px;
	}
	.access-note small {
		font-size: 9px;
		color: #849077;
		line-height: 1.7;
	}
	.access-footer {
		display: flex;
		justify-content: space-between;
		gap: 20px;
		border-top: 1px solid #daddd1;
		padding-top: 19px;
		color: #7c8770;
		font-size: 8px;
		line-height: 1.6;
	}
	.error {
		border: 1px solid #e3c9be;
		border-left: 3px solid #a15b42;
		background: #f9ede5;
		color: #854631;
		padding: 13px 15px;
		font-size: 12px;
		line-height: 1.7;
		margin: 0 0 22px;
		border-radius: 2px;
	}
	.visual-pane {
		position: relative;
		overflow: hidden;
		isolation: isolate;
		background: #203d32;
		color: #fff;
		min-height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: end;
		padding: 35px 7%;
	}
	.visual-pane > img,
	.visual-overlay {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: -2;
	}
	.visual-pane > img {
		object-position: 48% center;
		animation: photo-enter 1.5s ease-out both;
	}
	.visual-overlay {
		z-index: -1;
		background: linear-gradient(180deg, #12281f60, #12281f08 30%, #12281f44 50%, #0e261deb 100%);
	}
	.visual-top {
		position: absolute;
		top: 39px;
		left: 7%;
		right: 7%;
		display: flex;
		justify-content: space-between;
		gap: 20px;
		font-size: 7px;
		letter-spacing: 1.6px;
		color: #edf0e5;
	}
	.visual-copy {
		padding: 160px 0 45px;
	}
	.visual-copy > p:first-child {
		font-size: 7px;
		letter-spacing: 1.8px;
		color: #d8e2cf;
		line-height: 1.8;
		margin: 0 0 25px;
	}
	.visual-copy h2 {
		font-size: clamp(37px, 3.8vw, 61px);
		font-weight: 400;
		line-height: 1.12;
		letter-spacing: -2px;
		margin: 0 0 30px;
	}
	.visual-copy h2 em {
		color: #e0e9ca;
	}
	.visual-line {
		width: 48px;
		height: 1px;
		background: #c8d3b7;
		margin: 0 0 23px;
	}
	.visual-description {
		font-size: 12px;
		line-height: 1.9;
		color: #d4decc;
		margin: 0;
	}
	.visual-foot {
		border-top: 1px solid #ffffff40;
		padding-top: 22px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 20px;
		font-size: 7px;
		letter-spacing: 1.2px;
		color: #c9d5bf;
	}
	.visual-foot > span:last-child {
		font-size: 24px;
	}
	a:focus-visible,
	button:focus-visible {
		outline: 2px solid #8c9e70;
		outline-offset: 5px;
	}
	@keyframes photo-enter {
		from {
			transform: scale(1.035);
		}
		to {
			transform: scale(1);
		}
	}
	@media (min-width: 1800px) {
		.access-pane {
			padding-left: 12%;
			padding-right: 12%;
		}
		.login-content {
			max-width: 430px;
		}
	}
	@media (max-width: 1000px) {
		.login-shell {
			grid-template-columns: 1.1fr 1fr;
		}
		.access-pane {
			padding: 22px 7%;
		}
		.visual-copy h2 {
			font-size: 40px;
		}
		.visual-top span:last-child {
			display: none;
		}
		.form-footer > span {
			display: none;
		}
		.form-footer {
			justify-content: end;
		}
		.access-footer {
			font-size: 7px;
			gap: 12px;
		}
	}
	@media (max-width: 760px) {
		.login-shell {
			grid-template-columns: 1fr;
		}
		.access-pane {
			padding: 20px 6%;
			min-height: 100svh;
		}
		.login-content {
			padding: 45px 0;
			max-width: 420px;
		}
		h1 {
			font-size: 49px;
		}
		.intro-copy {
			font-size: 13px;
		}
		.access-footer {
			font-size: 8px;
		}
		.visual-pane {
			display: none;
		}
		.back-link {
			font-size: 10px;
		}
		.access-note small {
			font-size: 10px;
		}
		.access-note p {
			font-size: 11px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.login-shell * {
			animation: none;
			transition: none;
		}
	}
</style>
