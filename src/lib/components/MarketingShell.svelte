<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import MarketingHeader from './MarketingHeader.svelte';
	import MarketingFooter from './MarketingFooter.svelte';
	import '$lib/styles/marketing.css';
	let { children, overlay = false } = $props<{ children: Snippet; overlay?: boolean }>();
	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const observer = new IntersectionObserver(
			(entries) =>
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add('is-visible');
						observer.unobserve(entry.target);
					}
				}),
			{ threshold: 0.08 }
		);
		const elements = document.querySelectorAll('.marketing-site [data-reveal]');
		elements.forEach((element) => {
			element.classList.add('will-reveal');
			observer.observe(element);
		});
		return () => {
			observer.disconnect();
			elements.forEach((element) => element.classList.remove('will-reveal'));
		};
	});
</script>

<div class="marketing-site">
	<a class="skip-link" href="#main-content">Skip to content</a><MarketingHeader
		{overlay}
	/>{@render children()}<MarketingFooter />
</div>
