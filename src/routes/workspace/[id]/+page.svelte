<script lang="ts">
	import WorkspaceChrome from '$lib/components/WorkspaceChrome.svelte';
	import DailyOperations from '$lib/components/DailyOperations.svelte';
	import DashboardOverview from '$lib/components/DashboardOverview.svelte';
	let { data } = $props();
</script>

<svelte:head><title>{data.organization.name} — Portfolio overview · Musha PMS</title></svelte:head>
<WorkspaceChrome
	organization={data.organization}
	modules={data.modules}
	active="overview"
	role={data.membership.role}
	supportMode={data.supportMode}
>
	<DailyOperations
		organizationId={data.organization.id}
		items={data.attention}
		unavailable={data.attentionUnavailable}
	/>
	<DashboardOverview
		snapshot={data.snapshot}
		organization={data.organization}
		months={data.months}
		periods={data.periods}
	/>
</WorkspaceChrome>
