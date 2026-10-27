<script lang="ts">
	import BrandLogo from './BrandLogo.svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { applicationHref } from '$lib/marketing';
	let { overlay = false } = $props<{ overlay?: boolean }>();
	let open = $state(false);
	const links = [
		{ href: '/platform', label: 'The platform' },
		{ href: '/solutions', label: 'Solutions' },
		{ href: '/why-musha', label: 'Our approach' },
		{ href: '/demo', label: 'Product tour' }
	] as const;
</script>

<!-- Dynamic application and contact links may point outside the local router. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<header class:overlay class="site-header">
	<BrandLogo />
	<nav class:open aria-label="Main navigation" id="marketing-navigation">
		{#each links as link (link.href)}<a
				href={resolve(link.href)}
				aria-current={page.url.pathname === link.href ? 'page' : undefined}
				onclick={() => (open = false)}>{link.label}</a
			>{/each}
		<a class="mobile-contact" href={resolve('/contact')}>Request access ↗</a>
	</nav>
	<div class="header-actions">
		<a class="login-link" href={applicationHref()}>Sign in</a><a
			class="header-cta"
			href={resolve('/contact')}>Let’s talk <span>↗</span></a
		><button
			class="menu-toggle"
			type="button"
			aria-label={open ? 'Close navigation' : 'Open navigation'}
			aria-expanded={open}
			aria-controls="marketing-navigation"
			onclick={() => (open = !open)}>{open ? 'Close −' : 'Menu +'}</button
		>
	</div>
</header>

<style>
	.site-header {
		position: relative;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		padding: 12px 4.5%;
		background: #f5f3ed;
		border-bottom: 1px solid #dcded5;
		color: #203d32;
		font-family: var(--font-body);
	}
	.site-header.overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		background: transparent;
		border-color: #ffffff30;
		color: white;
	}
	nav {
		display: flex;
		gap: 28px;
	}
	nav a,
	.login-link {
		font-size: 12px;
		color: inherit;
		text-decoration: none;
	}
	nav a {
		padding: 10px 0;
		border-bottom: 1px solid transparent;
	}
	nav a:hover,
	nav a[aria-current] {
		border-color: currentColor;
	}
	.header-actions {
		display: flex;
		gap: 24px;
		align-items: center;
	}
	.header-cta {
		background: #d6e8ae;
		color: #203d32;
		padding: 13px 19px;
		font-size: 12px;
		text-decoration: none;
		display: flex;
		gap: 30px;
		align-items: center;
		border-radius: 2px;
		transition:
			background 0.2s,
			transform 0.2s;
	}
	.header-cta:hover {
		background: #e7f4c9;
		transform: translateY(-2px);
	}
	.header-cta span {
		font-size: 18px;
	}
	.menu-toggle,
	.mobile-contact {
		display: none;
	}
	a:focus-visible,
	button:focus-visible {
		outline: 2px solid #8eab66;
		outline-offset: 5px;
	}
	@media (max-width: 1050px) {
		nav {
			gap: 18px;
		}
		.header-actions {
			gap: 15px;
		}
	}
	@media (max-width: 780px) {
		.site-header {
			padding: 12px 6%;
			gap: 12px;
		}
		.header-cta {
			display: none;
		}
		.menu-toggle {
			display: block;
			background: transparent;
			border: 1px solid currentColor;
			padding: 9px 11px;
			font: inherit;
			font-size: 11px;
			color: inherit;
		}
		.header-actions {
			gap: 18px;
		}
		nav {
			display: none;
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			background: #f5f3ed;
			color: #203d32;
			padding: 22px 6%;
			box-shadow: 0 16px 20px #10221915;
		}
		nav.open {
			display: grid;
			gap: 6px;
		}
		nav a {
			font-size: 17px;
			padding: 13px 0;
		}
		.mobile-contact {
			display: block;
		}
	}
</style>
