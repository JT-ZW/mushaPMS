<script lang="ts">
	import MarketingShell from '$lib/components/MarketingShell.svelte';
	import DashboardOverview from '$lib/components/DashboardOverview.svelte';
	import { demoDashboard } from '$lib/dashboard/demo';
	const snapshot = demoDashboard();
</script>

<svelte:head
	><title>Dashboard design preview — Musha PMS</title><meta
		name="robots"
		content="noindex"
	/></svelte:head
>
<MarketingShell
	><main id="main-content" class="dashboard-preview">
		<DashboardOverview
			{snapshot}
			organization={{
				id: 'demo',
				name: 'Mushonga Properties · Fictional demo',
				currency_code: 'USD'
			}}
			demo
		/>
	</main></MarketingShell
>

<style>
	.dashboard-preview {
		padding: 45px 4%;
		background: #f2f4ec;
		max-width: 1600px;
		margin: auto;
	}
	@media (max-width: 760px) {
		.dashboard-preview {
			padding: 30px 5%;
		}
	}
</style>
