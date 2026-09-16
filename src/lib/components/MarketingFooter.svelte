<script lang="ts">
	import { applicationHref } from '$lib/marketing';
	import { resolve } from '$app/paths';
</script>

<footer>
	<a class="brand" href={resolve('/')}
		><img src="/logo.png" alt="" /><span
			><strong>Musha</strong><small>Property Management System</small></span
		></a
	>
	<span>© 2026 Musha PMS</span>
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a class="sign-in" href={applicationHref()}>Client &amp; platform sign in ↗</a>
</footer>

<style>
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24px clamp(24px, 4vw, 58px);
		background: #fffefc;
		color: #81938b;
		font-family: var(--font-body);
		font-size: 10px;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		color: #082f2c;
		text-decoration: none;
	}
	.brand img {
		width: 31px;
		height: 31px;
		object-fit: contain;
		border-radius: 9px;
		box-shadow: 0 4px 10px #0b342f13;
	}
	.brand span {
		display: grid;
		gap: 2px;
	}
	.brand strong {
		font-size: 17px;
		font-weight: 800;
		line-height: 0.95;
		letter-spacing: -0.07em;
	}
	.brand small {
		color: #6e847b;
		font-size: 6px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	.sign-in {
		color: #3e725f;
		text-decoration: none;
	}
	@media (max-width: 600px) {
		footer {
			align-items: flex-start;
			flex-direction: column;
			gap: 14px;
			padding: 22px 18px;
		}
	}
</style>
