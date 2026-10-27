<script lang="ts">
	import { resolve } from '$app/paths';
	import WorkspaceNotifications from './WorkspaceNotifications.svelte';
	let menuOpen = $state(false);

	type Organization = { id: string; name: string; status: string; currency_code: string };
	type Module = { module_key: 'residential' | 'commercial' | 'student' | 'short_stay' };
	let { organization, modules, active, role, supportMode, children } = $props<{
		organization: Organization;
		modules: Module[];
		active: string;
		role: string;
		supportMode?: {
			accessLevel: 'read_only' | 'operator';
			reason: string;
			expiresAt: string;
		} | null;
		children: import('svelte').Snippet;
	}>();

	const labels = {
		residential: 'Residential',
		commercial: 'Commercial',
		student: 'Student accommodation',
		short_stay: 'Short stay / Airbnb'
	} as const;
	const nav = [
		{ key: 'overview', label: 'Overview', suffix: '' },
		{ key: 'properties', label: 'Properties', suffix: '/properties' },
		{ key: 'people', label: 'People & leases', suffix: '/people' },
		{ key: 'finance', label: 'Finance & collections', suffix: '/finance' },
		{ key: 'maintenance', label: 'Maintenance', suffix: '/maintenance' },
		{ key: 'vendors', label: 'Vendor directory', suffix: '/vendors' },
		{ key: 'support', label: 'Support', suffix: '/support' },
		{ key: 'reports', label: 'Reports', suffix: '/reports' },
		{ key: 'setup', label: 'Organization setup', suffix: '/setup' },
		{ key: 'settings', label: 'Settings', suffix: '/settings' }
	] as const;
</script>

<div class="workspace-shell">
	<aside class="workspace-sidebar" class:menu-open={menuOpen}>
		<a class="workspace-brand" href={resolve(`/workspace/${organization.id}`)}>
			<img class="musha-logo" src="/logo.png" alt="Musha" />
			<span><small>PROPERTY MANAGEMENT</small></span>
		</a>
		<div class="workspace-name">
			<strong>{organization.name}</strong><small>{organization.currency_code} · {role}</small>
		</div>
		<button
			type="button"
			class="mobile-menu"
			aria-controls="workspace-navigation"
			aria-expanded={menuOpen}
			onclick={() => (menuOpen = !menuOpen)}
			>{menuOpen ? 'Close menu ?' : 'Workspace menu +'}</button
		>
		<p class="nav-label">Workspace</p>
		<nav id="workspace-navigation" aria-label="Workspace navigation">
			{#each nav as item (item.key)}
				<a
					class:active={active === item.key ||
						(item.key === 'people' &&
							['tenants', 'new-tenant', 'leases', 'documents', 'move-outs'].includes(active))}
					aria-current={active === item.key ? 'page' : undefined}
					onclick={() => (menuOpen = false)}
					href={resolve(`/workspace/${organization.id}${item.suffix}`)}>{item.label}</a
				>
			{/each}
		</nav>
		<div class="module-access">
			<p>Enabled modules</p>
			{#each modules as module (module.module_key)}<span
					>{labels[module.module_key as keyof typeof labels]}</span
				>{/each}
		</div>
		<form method="POST" action={resolve('/logout')}><button type="submit">Sign out</button></form>
	</aside>
	<main class="workspace-main">
		{#if supportMode}
			<div class="support-banner" role="status">
				<strong
					>Support mode · {supportMode.accessLevel === 'read_only'
						? 'Read only'
						: 'Operator'}</strong
				>
				<span
					>{supportMode.reason} · expires {new Date(
						supportMode.expiresAt
					).toLocaleTimeString()}</span
				>
			</div>
		{/if}
		<div class="workspace-notification-bar">
			<WorkspaceNotifications organizationId={organization.id} />
		</div>
		<div class="workspace-content">{@render children()}</div>
	</main>
</div>

<style>
	.workspace-notification-bar {
		display: flex;
		justify-content: flex-end;
		max-width: 1500px;
		margin: 0 auto 12px;
	}
	.workspace-shell {
		min-height: 100svh;
		display: flex;
		background: #f2f4ec;
		color: #263f33;
	}
	.workspace-shell * {
		box-sizing: border-box;
	}
	.workspace-sidebar {
		position: sticky;
		top: 0;
		width: 215px;
		flex: 0 0 215px;
		height: 100svh;
		overflow-y: auto;
		padding: 24px 17px;
		background: #edf0e5;
		border-right: 1px solid #dce3d0;
		scrollbar-width: thin;
	}
	.workspace-brand {
		display: grid;
		justify-items: center;
		text-decoration: none;
		padding-bottom: 22px;
		color: #587047;
	}
	.workspace-brand .musha-logo {
		width: 100px;
		height: 100px;
		flex-basis: 100px;
		border-radius: 4px;
		border: 1px solid #e0e4d6;
		box-shadow: none;
		background: white;
	}
	.workspace-brand small {
		font-size: 7px;
		letter-spacing: 1.5px;
		display: block;
		margin-top: 12px;
	}
	.workspace-name {
		padding: 18px 10px;
		border-top: 1px solid #d5ddc9;
		border-bottom: 1px solid #d5ddc9;
	}
	.workspace-name strong {
		font-size: 12px;
		line-height: 1.6;
		display: block;
		overflow-wrap: anywhere;
		font-weight: 600;
	}
	.workspace-name small {
		font-size: 9px;
		color: #8a977b;
		display: block;
		text-transform: capitalize;
		margin-top: 4px;
	}
	.nav-label {
		font-size: 8px;
		color: #8c9a7a;
		letter-spacing: 1.7px;
		margin: 25px 12px 13px;
		text-transform: uppercase;
	}
	.workspace-sidebar nav {
		display: grid;
		gap: 4px;
	}
	.workspace-sidebar nav a {
		font-size: 11px;
		padding: 12px 13px;
		border-radius: 7px;
		color: #6f805f;
		text-decoration: none;
		border: 1px solid transparent;
		transition: background 0.2s;
	}
	.workspace-sidebar nav a:hover {
		background: #e3e9d8;
		color: #304d2a;
	}
	.workspace-sidebar nav a.active {
		background: #fffefa;
		border-color: #dce3cf;
		color: #2f4c2c;
		box-shadow: 0 3px 8px #44503905;
	}
	.module-access {
		margin: 25px 10px 0;
		padding-top: 20px;
		border-top: 1px solid #d5ddc9;
		display: grid;
		gap: 8px;
	}
	.module-access p {
		font-size: 8px;
		color: #8c9a7b;
		letter-spacing: 1.3px;
		text-transform: uppercase;
		margin: 0 0 4px;
	}
	.module-access > span {
		font-size: 9px;
		color: #82936f;
	}
	.workspace-sidebar form {
		margin-top: 25px;
	}
	.workspace-sidebar form button {
		border: 1px solid #d3dcc5;
		background: transparent;
		color: #637b50;
		border-radius: 6px;
		width: 100%;
		padding: 11px;
		font: inherit;
		font-size: 10px;
		cursor: pointer;
	}
	.workspace-main {
		flex: 1;
		min-width: 0;
		padding: 35px clamp(20px, 3vw, 48px) 50px;
	}
	.workspace-content {
		width: min(100%, 1500px);
		margin: auto;
	}
	.support-banner {
		max-width: 1500px;
		margin: 0 auto 20px;
		padding: 14px 18px;
		border: 1px solid #dfc887;
		background: #fff8e6;
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		border-radius: 7px;
		font-size: 12px;
		color: #866b30;
	}
	.support-banner span {
		opacity: 0.8;
	}
	.mobile-menu {
		display: none;
	}
	a:focus-visible,
	button:focus-visible {
		outline: 2px solid #8b9f6e;
		outline-offset: 3px;
	}
	@media (max-width: 760px) {
		.workspace-shell {
			display: block;
		}
		.workspace-sidebar {
			position: relative;
			width: 100%;
			height: auto;
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			gap: 10px 18px;
			padding: 12px 5%;
			border-right: 0;
			border-bottom: 1px solid #dce3cf;
		}
		.workspace-brand {
			padding: 0;
		}
		.workspace-brand .musha-logo {
			width: 65px;
			height: 65px;
			flex-basis: 65px;
		}
		.workspace-brand > span {
			display: none;
		}
		.workspace-name {
			padding: 0;
			border: 0;
			flex: 1;
			min-width: 0;
		}
		.workspace-name strong {
			font-size: 12px;
		}
		.workspace-name small {
			font-size: 8px;
		}
		.mobile-menu {
			display: block;
			padding: 10px 9px;
			border: 1px solid #ced8c1;
			border-radius: 5px;
			background: transparent;
			color: #607a4c;
			font: inherit;
			font-size: 9px;
		}
		.workspace-sidebar nav,
		.nav-label,
		.module-access,
		.workspace-sidebar form {
			display: none;
		}
		.workspace-sidebar.menu-open nav {
			display: grid;
			width: 100%;
			grid-template-columns: 1fr 1fr;
			padding-top: 10px;
			border-top: 1px solid #d5ddc9;
		}
		.workspace-sidebar.menu-open form {
			display: block;
			width: 100%;
			margin: 0;
		}
		.workspace-main {
			padding: 25px 5% 40px;
		}
		.workspace-sidebar nav a {
			font-size: 10px;
		}
		.support-banner {
			font-size: 11px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.workspace-sidebar nav a {
			transition: none;
		}
	}
</style>
