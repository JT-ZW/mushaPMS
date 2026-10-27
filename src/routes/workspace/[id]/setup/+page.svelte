<script lang="ts">
	import WorkspaceChrome from '$lib/components/WorkspaceChrome.svelte';
	import { resolve } from '$app/paths';
	import { rentableSpaces } from '$lib/dashboard/portfolio';
	import { isCurrentLease } from '$lib/dashboard/leases';
	import { organizationDate } from '$lib/dashboard/snapshot';
	import '$lib/styles/aligned-workspace.css';
	let { data } = $props();
	const today = $derived(
		organizationDate(new Date(), data.organization.timezone || 'Africa/Harare')
	);
	const activeProperties = $derived(
		data.properties.filter((row: { status: string }) => row.status === 'active')
	);
	const spaces = $derived(rentableSpaces(data.properties, data.spaces));
	const current = $derived(
		data.tenancies.filter((lease: Parameters<typeof isCurrentLease>[0]) =>
			isCurrentLease(lease, today)
		)
	);
	const areas = $derived([
		{
			key: 'properties',
			title: 'Establish your portfolio',
			copy: 'Register each property, its rental model and map location.',
			count: `${activeProperties.length} active properties`,
			done: activeProperties.length > 0,
			href: resolve(`/workspace/${data.organization.id}/properties`),
			action: 'Manage properties'
		},
		{
			key: 'spaces',
			title: 'Shape your rentable spaces',
			copy: 'Use the property register to configure units, rooms or beds.',
			count: `${spaces.length} rentable spaces`,
			done: spaces.length > 0,
			href: resolve(`/workspace/${data.organization.id}/properties`),
			action: 'Review property spaces'
		},
		{
			key: 'people',
			title: 'Connect your people and leases',
			copy: 'Onboard tenants, check lease dates and complete check-in when appropriate.',
			count: `${current.length} current leases`,
			done: current.length > 0,
			href: resolve(`/workspace/${data.organization.id}/people`),
			action: 'Open people & leases'
		},
		{
			key: 'settings',
			title: 'Set your operating defaults',
			copy: 'Review branding, rent defaults, notifications and team roles before daily operation.',
			count: 'Review required',
			done: false,
			href: resolve(`/workspace/${data.organization.id}/settings`),
			action: 'Review settings'
		}
	]);
	const complete = $derived(areas.filter((area) => area.done).length);
</script>

<svelte:head><title>Organization setup — {data.organization.name} · Musha</title></svelte:head>
<WorkspaceChrome
	organization={data.organization}
	modules={data.modules}
	active="setup"
	role={data.membership.role}
	supportMode={data.supportMode}
>
	<div class="aligned-workspace setup-workspace">
		<header class="heading">
			<div>
				<p class="eyebrow">WORKSPACE / ORGANIZATION SETUP</p>
				<h1>Good foundations. <em>A better everyday.</em></h1>
				<p>One setup checklist, connected to the same workflows your team uses day to day.</p>
			</div>
			<a class="primary" href={resolve(`/workspace/${data.organization.id}`)}>View workspace</a>
		</header>
		<section class="panel setup-progress">
			<div>
				<p class="eyebrow">RECORD READINESS</p>
				<h2>{complete} of 3 record foundations ready</h2>
				<p>
					Properties, terminal rentable spaces and current leases are checked against your records.
					Operating settings require your team’s review.
				</p>
			</div>
			<div>
				<strong>{Math.round((complete / 3) * 100)}%</strong>
				<div class="setup-track"><i style:width={`${(complete / 3) * 100}%`}></i></div>
			</div>
		</section>
		<div class="setup-cards">
			{#each areas as area, i (area.key)}<section class="panel setup-card">
					<div class="setup-card-top">
						<span>0{i + 1}</span><span class="tag"
							>{area.done
								? 'Records present'
								: area.key === 'settings'
									? 'Manual review'
									: 'Next step'}</span
						>
					</div>
					<h2>{area.title}</h2>
					<p>{area.copy}</p>
					<small>{area.count}</small><a class="secondary" href={area.href}>{area.action} ↗</a>
				</section>{/each}
		</div>
		<section class="panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">WORKSPACE SCOPE</p>
					<h2>{data.organization.name}</h2>
					<p>Available modules are allocated by the platform team.</p>
				</div>
			</div>
			<div class="setup-modules">
				{#each data.modules as module (module.module_key)}<span class="tag"
						>{module.module_key.replaceAll('_', ' ')}</span
					>{:else}<p>
						No modules are allocated yet. Contact support to review workspace access.
					</p>{/each}
			</div>
		</section>
	</div>
</WorkspaceChrome>

<style>
	.setup-progress {
		display: grid;
		grid-template-columns: 1fr 170px;
		align-items: center;
		gap: 40px;
		background: #edf3e3 !important;
	}
	.setup-progress p {
		font-size: 11px;
		color: #91a57a;
		line-height: 1.9;
		max-width: 700px;
		margin-bottom: 0;
	}
	.setup-progress strong {
		font-size: 37px;
		font-weight: 500;
		color: #68844f;
		letter-spacing: -1.5px;
	}
	.setup-track {
		height: 6px;
		background: #dbe7c9;
		border-radius: 5px;
		margin-top: 15px;
		overflow: hidden;
	}
	.setup-track i {
		display: block;
		height: 100%;
		background: #8da96c;
	}
	.setup-cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 18px;
	}
	.setup-card-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 25px;
	}
	.setup-card-top > span:first-child {
		font-size: 12px;
		color: #a0b38b;
	}
	.setup-card p {
		font-size: 12px;
		color: #96a983;
		line-height: 1.9;
		max-width: 430px;
	}
	.setup-card small {
		display: block;
		font-size: 10px;
		color: #8aa16f;
		margin: 20px 0;
	}
	.setup-card a {
		display: inline-block;
	}
	.setup-modules {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.setup-modules > p {
		font-size: 11px;
		color: #9aae87;
	}
	@media (max-width: 700px) {
		.setup-cards {
			grid-template-columns: 1fr;
		}
		.setup-progress {
			grid-template-columns: 1fr;
			gap: 25px;
		}
	}
</style>
