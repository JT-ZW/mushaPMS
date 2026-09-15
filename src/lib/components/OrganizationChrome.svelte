<script lang="ts">
	import { resolve } from '$app/paths';

	type Organization = { id: string; name: string; status: string; currency_code: string };
	let { organization, active, children } = $props<{
		organization: Organization;
		active: 'overview' | 'setup' | 'properties' | 'spaces' | 'people' | 'handoff';
		children: import('svelte').Snippet;
	}>();

	const items = [
		{ key: 'overview', label: 'Overview', suffix: '' },
		{ key: 'setup', label: 'Setup workspace', suffix: '/setup' },
		{ key: 'properties', label: 'Properties', suffix: '/setup?tab=properties' },
		{ key: 'spaces', label: 'Units & spaces', suffix: '/setup?tab=spaces' },
		{ key: 'people', label: 'People & leases', suffix: '/setup?tab=people' },
		{ key: 'handoff', label: 'Review & handoff', suffix: '/setup?tab=review' }
	] as const;
</script>

<div class="organization-layout">
	<aside class="organization-sidebar" aria-label="Organization workspace navigation">
		<div class="organization-context">
			<span class="context-mark">{organization.name.slice(0, 1).toUpperCase()}</span>
			<div>
				<strong>{organization.name}</strong><small>{organization.currency_code} workspace</small>
			</div>
		</div>
		<p class="sidebar-label">Workspace</p>
		<nav>
			{#each items as item (item.key)}
				<a
					class:active={active === item.key}
					href={resolve(`/admin/organizations/${organization.id}${item.suffix}`)}
					aria-current={active === item.key ? 'page' : undefined}>{item.label}</a
				>
			{/each}
		</nav>
		<div class="sidebar-status"><span></span>{organization.status}</div>
	</aside>
	<section class="organization-content">{@render children()}</section>
</div>

<style>
	.organization-layout {
		display: grid;
		grid-template-columns: 208px minmax(0, 1fr);
		gap: 18px;
		align-items: start;
	}
	.organization-sidebar {
		position: sticky;
		top: 86px;
		padding: 18px 12px;
		border: 1px solid #dce8df;
		border-radius: 12px;
		background: #fff;
	}
	.organization-context {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 4px 6px 20px;
		border-bottom: 1px solid #edf2ed;
	}
	.context-mark {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		flex: 0 0 34px;
		border-radius: 10px;
		background: #e7f2d7;
		color: #50765c;
		font-size: 14px;
		font-weight: 800;
	}
	.organization-context strong,
	.organization-context small {
		display: block;
		max-width: 132px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.organization-context strong {
		color: var(--musha-ink);
		font-size: 12px;
	}
	.organization-context small {
		color: #8b9e94;
		font-size: 10px;
		margin-top: 3px;
	}
	.sidebar-label {
		color: #8ba094;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.14em;
		margin: 20px 8px 8px;
		text-transform: uppercase;
	}
	nav {
		display: grid;
		gap: 3px;
	}
	nav a {
		border-radius: 7px;
		color: #668477;
		font-size: 12px;
		padding: 10px 9px;
		text-decoration: none;
	}
	nav a:hover,
	nav a.active {
		background: #e9f3e4;
		color: #2c5b49;
		font-weight: 700;
	}
	.sidebar-status {
		display: flex;
		align-items: center;
		gap: 7px;
		margin: 20px 8px 2px;
		color: #7c9587;
		font-size: 10px;
		text-transform: capitalize;
	}
	.sidebar-status span {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #78ad68;
	}
	.organization-content {
		min-width: 0;
	}
	@media (max-width: 900px) {
		.organization-layout {
			grid-template-columns: 1fr;
		}
		.organization-sidebar {
			position: static;
			overflow-x: auto;
			padding: 10px;
		}
		.organization-context,
		.sidebar-label,
		.sidebar-status {
			display: none;
		}
		nav {
			display: flex;
			gap: 5px;
			min-width: max-content;
		}
		nav a {
			padding: 10px 12px;
		}
	}
</style>
