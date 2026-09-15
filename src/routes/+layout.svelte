<script lang="ts">
	import '$lib/styles/brand.css';
	import GlobalFeedback from '$lib/components/GlobalFeedback.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/logo.png" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{@render children()}
<GlobalFeedback />
