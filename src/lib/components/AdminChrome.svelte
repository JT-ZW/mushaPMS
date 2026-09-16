<script lang="ts">
	import { resolve } from '$app/paths';

	type Active =
		| 'overview'
		| 'organizations'
		| 'support'
		| 'audit'
		| 'team'
		| 'billing'
		| 'imports'
		| 'settings'
		| 'system';
	let { children, active = 'overview' } = $props<{
		children: import('svelte').Snippet;
		active?: Active;
	}>();

	const navigation = [
		{ label: 'Overview', short: '⌂', href: '/admin', key: 'overview' },
		{ label: 'Organizations', short: '◇', href: '/admin/organizations', key: 'organizations' },
		{ label: 'Support centre', short: '◌', href: '/admin/support', key: 'support' },
		{ label: 'Audit log', short: '≋', href: '/admin/audit', key: 'audit' },
		{ label: 'Platform team', short: '＋', href: '/admin/team', key: 'team' },
		{ label: 'Billing & plans', short: '$', href: '/admin/billing', key: 'billing' },
		{ label: 'Data imports', short: '⇧', href: '/admin/imports', key: 'imports' },
		{ label: 'Platform settings', short: '⚙', href: '/admin/settings', key: 'settings' },
		{ label: 'System health', short: '◉', href: '/admin/system', key: 'system' }
	] as const;
</script>

<div class="admin-shell">
	<aside class="sidebar">
		<a class="brand" href={resolve('/')}
			><img class="musha-logo" src="/logo.png" alt="Musha Property Management System" /><span
				><strong>Musha</strong><small>Platform admin</small></span
			></a
		>
		<nav aria-label="Platform administration">
			<p class="nav-label">Control plane</p>
			{#each navigation as item (item.key)}
				<a
					class:active={active === item.key}
					href={resolve(item.href)}
					aria-current={active === item.key ? 'page' : undefined}
					aria-label={item.label}
				>
					<span class="nav-icon" aria-hidden="true">{item.short}</span><span class="nav-text"
						>{item.label}</span
					>
				</a>
			{/each}
		</nav>
		<div class="sidebar-foot">
			<span class="shield">✓</span>
			<div><strong>Secure workspace</strong><small>Actions are audited</small></div>
		</div>
	</aside>
	<div class="main-column">
		<header class="topbar">
			<div class="mobile-brand">
				<img class="musha-logo" src="/logo.png" alt="" /><strong>Musha</strong>
			</div>
			<div class="topbar-right">
				<span class="secure-label">Platform control plane</span>
				<form method="POST" action={resolve('/logout')}>
					<button class="logout" type="submit">Sign out</button>
				</form>
			</div>
		</header>
		<main class="content">{@render children()}</main>
	</div>
</div>

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
	:global(select),
	:global(textarea) {
		font: inherit;
	}
	.admin-shell {
		min-height: 100vh;
		display: flex;
	}
	.sidebar {
		position: sticky;
		top: 0;
		height: 100vh;
		width: 232px;
		flex: 0 0 232px;
		background: var(--musha-ink);
		color: #d6e9de;
		padding: 28px 16px 20px;
		display: flex;
		flex-direction: column;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 10px 44px;
		color: #fff;
		text-decoration: none;
	}
	.brand .musha-logo {
		width: 54px;
		height: 54px;
		flex-basis: 54px;
		border-radius: 15px;
	}
	.brand strong,
	.brand small,
	.mobile-brand strong {
		display: block;
	}
	.brand strong {
		font-size: 19px;
		letter-spacing: -0.04em;
	}
	.brand small {
		color: #9cc4a9;
		font-size: 10px;
		margin-top: 3px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}
	nav {
		display: grid;
		gap: 4px;
	}
	.nav-label {
		color: #6d9987;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		margin: 0 12px 10px;
	}
	.sidebar nav a {
		display: flex;
		align-items: center;
		gap: 10px;
		color: #a5c5b3;
		border-radius: 7px;
		padding: 11px 12px;
		font-size: 13px;
		text-decoration: none;
	}
	.nav-icon {
		width: 19px;
		color: #86b398;
		font-size: 15px;
		line-height: 1;
		text-align: center;
	}
	.sidebar nav a.active .nav-icon,
	.sidebar nav a:hover .nav-icon {
		color: var(--musha-lime);
	}
	.sidebar nav a.active,
	.sidebar nav a:hover {
		background: #235447;
		color: #fff;
	}
	.sidebar-foot {
		margin-top: auto;
		border-top: 1px solid #2a5a4c;
		padding: 18px 8px 0;
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.shield {
		width: 27px;
		height: 27px;
		display: grid;
		place-items: center;
		border-radius: 8px;
		background: #2b5a4e;
		color: var(--musha-lime);
		font-size: 12px;
	}
	.sidebar-foot strong,
	.sidebar-foot small {
		display: block;
	}
	.sidebar-foot strong {
		color: #e8f4eb;
		font-size: 12px;
	}
	.sidebar-foot small {
		color: #89b19d;
		font-size: 10px;
		margin-top: 3px;
	}
	.main-column {
		flex: 1;
		min-width: 0;
	}
	.topbar {
		height: 70px;
		border-bottom: 1px solid #e4ebe4;
		background: #fff;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding: 0 clamp(22px, 4vw, 58px);
	}
	.topbar-right {
		display: flex;
		align-items: center;
		gap: 18px;
	}
	.secure-label {
		color: #7a9287;
		font-size: 12px;
	}
	.logout {
		border: 1px solid #dce7df;
		border-radius: 6px;
		background: #fff;
		color: #557568;
		padding: 8px 11px;
		cursor: pointer;
		font-size: 12px;
	}
	.mobile-brand {
		display: none;
		align-items: center;
		gap: 8px;
		margin-right: auto;
	}
	.mobile-brand strong {
		font-size: 16px;
		letter-spacing: -0.04em;
	}
	.mobile-brand .musha-logo {
		width: 40px;
		height: 40px;
		flex-basis: 40px;
		border-radius: 11px;
	}
	.content {
		max-width: 1320px;
		margin: 0 auto;
		padding: 50px clamp(22px, 4vw, 60px) 80px;
	}
	@media (max-width: 760px) {
		.sidebar {
			width: 66px;
			flex-basis: 66px;
			padding: 22px 10px;
		}
		.brand {
			padding: 0 2px 40px;
		}
		.brand .musha-logo {
			width: 48px;
			height: 48px;
			flex-basis: 48px;
			border-radius: 13px;
		}
		.brand > span:last-child,
		.nav-label,
		.nav-text {
			font-size: 0;
		}
		.brand .musha-logo {
			margin: auto;
		}
		.sidebar nav a {
			padding: 13px 0;
			text-align: center;
			justify-content: center;
			gap: 0;
		}
		.nav-icon {
			font-size: 16px;
		}
		.sidebar-foot {
			padding-left: 0;
			padding-right: 0;
		}
		.sidebar-foot > div {
			display: none;
		}
		.topbar {
			height: 62px;
			padding: 0 17px;
		}
		.mobile-brand {
			display: flex;
		}
		.secure-label {
			display: none;
		}
		.content {
			padding: 32px 17px 55px;
		}
	}
	@media (max-width: 760px) {
		.admin-shell {
			display: block;
		}
		.sidebar {
			position: sticky;
			z-index: 10;
			width: 100%;
			height: auto;
			padding: 10px 16px 0;
		}
		.sidebar .brand,
		.sidebar-foot {
			display: none;
		}
		.sidebar .nav-label {
			display: none;
		}
		.sidebar nav {
			display: flex;
			overflow-x: auto;
			gap: 5px;
			padding-bottom: 10px;
			scrollbar-width: none;
		}
		.sidebar nav::-webkit-scrollbar {
			display: none;
		}
		.sidebar nav a {
			white-space: nowrap;
			justify-content: flex-start;
			gap: 7px;
			padding: 10px 12px;
		}
		.sidebar .nav-text {
			font-size: 12px;
		}
	}
</style>
