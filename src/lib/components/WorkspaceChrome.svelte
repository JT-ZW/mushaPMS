<script lang="ts">
	import { resolve } from '$app/paths';

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
		{ key: 'new-property', label: 'Add property', suffix: '/new-property' },
		{ key: 'people', label: 'People & leases', suffix: '/people' },
		{ key: 'finance', label: 'Finance & collections', suffix: '/finance' },
		{ key: 'maintenance', label: 'Maintenance', suffix: '/maintenance' },
		{ key: 'reports', label: 'Reports', suffix: '/reports' },
		{ key: 'setup', label: 'Organization setup', suffix: '/setup' },
		{ key: 'settings', label: 'Settings', suffix: '/settings' }
	] as const;
</script>

<div class="workspace-shell">
	<aside class="workspace-sidebar">
		<a class="workspace-brand" href={resolve(`/workspace/${organization.id}`)}>
			<img class="musha-logo" src="/logo.png" alt="Musha" />
			<span><strong>Musha</strong><small>Client workspace</small></span>
		</a>
		<div class="workspace-name">
			<strong>{organization.name}</strong><small>{organization.currency_code} · {role}</small>
		</div>
		<p class="nav-label">Workspace</p>
		<nav>
			{#each nav as item (item.key)}
				<a
					class:active={active === item.key ||
						(item.key === 'people' &&
							['tenants', 'new-tenant', 'leases', 'documents', 'move-outs'].includes(active))}
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
		<div class="workspace-content">{@render children()}</div>
	</main>
</div>

<style>
	.workspace-shell {
		min-height: 100vh;
		display: flex;
		background: #f7f8f5;
		color: var(--musha-ink);
	}
	.workspace-sidebar {
		position: sticky;
		top: 0;
		width: 246px;
		height: 100vh;
		flex: 0 0 246px;
		padding: 25px 16px 19px;
		background: var(--musha-ink);
		color: #d6e9de;
	}
	.workspace-brand {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 8px 23px;
		color: #fff;
		text-decoration: none;
	}
	.workspace-brand .musha-logo {
		width: 54px;
		height: 54px;
		flex-basis: 54px;
		border-radius: 15px;
	}
	.workspace-brand strong,
	.workspace-brand small,
	.workspace-name strong,
	.workspace-name small {
		display: block;
	}
	.workspace-brand strong {
		font-size: 20px;
		letter-spacing: -0.05em;
	}
	.workspace-brand small {
		color: #9cc4a9;
		font-size: 10px;
		letter-spacing: 0.1em;
		margin-top: 3px;
		text-transform: uppercase;
	}
	.workspace-name {
		padding: 15px 10px;
		border-top: 1px solid #2a5a4c;
		border-bottom: 1px solid #2a5a4c;
	}
	.workspace-name strong {
		color: #fff;
		font-size: 13px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.workspace-name small {
		color: #8fb8a1;
		font-size: 10px;
		margin-top: 4px;
		text-transform: capitalize;
	}
	.nav-label {
		color: #6d9987;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.16em;
		margin: 25px 12px 9px;
		text-transform: uppercase;
	}
	nav {
		display: grid;
		gap: 3px;
	}
	nav a {
		border-radius: 7px;
		color: #a5c5b3;
		font-size: 13px;
		padding: 10px 12px;
		text-decoration: none;
	}
	nav a:hover,
	nav a.active {
		background: #235447;
		color: #fff;
	}
	.module-access {
		display: grid;
		gap: 6px;
		margin: 25px 10px 0;
		padding-top: 18px;
		border-top: 1px solid #2a5a4c;
	}
	.module-access p {
		color: #6d9987;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.12em;
		margin: 0 0 3px;
		text-transform: uppercase;
	}
	.module-access span {
		color: #a5c5b3;
		font-size: 11px;
	}
	.workspace-sidebar form {
		margin-top: 20px;
	}
	.workspace-sidebar button {
		width: 100%;
		border: 1px solid #39705d;
		border-radius: 7px;
		background: transparent;
		color: #d6e9de;
		padding: 9px 11px;
		font: inherit;
		font-size: 12px;
		cursor: pointer;
	}
	.workspace-main {
		min-width: 0;
		flex: 1;
		padding: 42px clamp(24px, 5vw, 72px) 64px;
	}
	.workspace-content {
		width: min(100%, 1280px);
		margin: 0 auto;
	}
	.support-banner {
		width: min(100%, 1280px);
		margin: 0 auto 18px;
		padding: 11px 14px;
		border: 1px solid #d6c06b;
		border-radius: 10px;
		background: #fff8d9;
		color: #5f5522;
		display: flex;
		gap: 10px;
		align-items: baseline;
		font-size: 13px;
	}
	.support-banner span {
		opacity: 0.82;
	}
	@media (max-width: 760px) {
		.workspace-shell {
			display: block;
		}
		.support-banner {
			display: block;
		}
		.support-banner span {
			display: block;
			margin-top: 4px;
		}
	}
	@media (max-width: 760px) {
		.workspace-main {
			padding: 26px 16px 42px;
		}
		.workspace-sidebar {
			width: 100%;
			height: auto;
			padding: 10px 16px 0;
		}
		.workspace-brand {
			display: none;
		}
		.workspace-brand .musha-logo {
			width: 48px;
			height: 48px;
			flex-basis: 48px;
		}
		.workspace-brand span,
		.workspace-name,
		.nav-label,
		.module-access,
		.workspace-sidebar button {
			display: none;
		}
		nav a {
			padding: 13px 0;
			text-align: center;
			font-size: 0;
		}
		nav a::before {
			content: '•';
			color: #8fca4d;
			font-size: 19px;
		}
	}
	@media (max-width: 760px) {
		.workspace-sidebar nav {
			display: flex;
			overflow-x: auto;
			gap: 5px;
			padding-bottom: 10px;
			scrollbar-width: none;
		}
		.workspace-sidebar nav::-webkit-scrollbar {
			display: none;
		}
		.workspace-sidebar nav a {
			white-space: nowrap;
			padding: 10px 12px;
			font-size: 12px;
		}
		.workspace-sidebar nav a::before {
			display: none;
		}
	}
</style>
