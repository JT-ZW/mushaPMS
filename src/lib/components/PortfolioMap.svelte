<script lang="ts">
	import { onMount } from 'svelte';
	import { coordinates } from '$lib/dashboard/portfolio';
	import 'leaflet/dist/leaflet.css';
	import type * as Leaflet from 'leaflet';
	let { properties } = $props<{
		properties: {
			id: string;
			name: string;
			latitude: number | string | null;
			longitude: number | string | null;
		}[];
	}>();
	let mapElement: HTMLDivElement;
	let map: Leaflet.Map | undefined;
	let library: typeof Leaflet | undefined;
	let markers: Leaflet.LayerGroup | undefined;
	let expanded = $state(false);
	let ready = $state(false);
	let failed = $state(false);
	let tilesFailed = $state(false);
	let loading = $state(true);
	let disposed = false;
	const pins = $derived(
		properties.flatMap(
			(property: {
				id: string;
				name: string;
				latitude: number | string | null;
				longitude: number | string | null;
			}) => {
				const point = coordinates(property);
				return point ? [{ ...property, point }] : [];
			}
		)
	);
	function draw() {
		if (!map || !library || !markers) return;
		markers.clearLayers();
		const bounds: [number, number][] = [];
		for (const pin of pins) {
			const label = document.createElement('strong');
			label.textContent = pin.name;
			library
				.marker(pin.point, {
					icon: library.divIcon({
						className: 'musha-map-pin',
						html: '<span></span>',
						iconSize: [24, 30],
						iconAnchor: [12, 30],
						popupAnchor: [0, -28]
					}),
					title: pin.name
				})
				.addTo(markers)
				.bindPopup(label);
			bounds.push(pin.point);
		}
		if (bounds.length === 1) map.setView(bounds[0], 13);
		else if (bounds.length > 1) map.fitBounds(bounds, { padding: [45, 45], maxZoom: 14 });
		else map.setView([-19.0154, 29.1549], 5);
		map.invalidateSize();
	}
	$effect(() => {
		if (ready) {
			void pins;
			draw();
		}
	});
	async function initialize() {
		failed = false;
		loading = true;
		tilesFailed = false;
		try {
			const L = await import('leaflet');
			if (disposed) return;
			library = L;
			map?.remove();
			map = L.map(mapElement, { scrollWheelZoom: false, preferCanvas: true }).setView(
				[-19.0154, 29.1549],
				5
			);
			markers = L.layerGroup().addTo(map);
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; OpenStreetMap contributors',
				maxZoom: 19
			})
				.on('tileerror', () => {
					tilesFailed = true;
					loading = false;
				})
				.on('tileload', () => {
					loading = false;
				})
				.addTo(map);
			ready = true;
			draw();
		} catch {
			failed = true;
			loading = false;
		}
	}
	onMount(() => {
		void initialize();
		const observer = new ResizeObserver(() => map?.invalidateSize());
		observer.observe(mapElement);
		return () => {
			disposed = true;
			observer.disconnect();
			map?.remove();
		};
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape') expanded = false;
	}}
/>
<div class="map-shell" class:expanded>
	<div class="map-toolbar">
		<button
			type="button"
			onclick={() => {
				expanded = !expanded;
			}}
			aria-expanded={expanded}>{expanded ? 'Minimize map −' : 'Expand map ↗'}</button
		>
	</div>
	<div class="portfolio-map" bind:this={mapElement} aria-label="Property locations map"></div>
	{#if failed}<div class="map-message" role="status">
			<strong>The map could not be loaded.</strong>
			<p>Your property records remain available in the list.</p>
			<button type="button" onclick={() => void initialize()}>Retry map</button>
		</div>{:else if !pins.length}<div class="map-message" role="status">
			<strong>No mapped locations in this selection.</strong>
			<p>Add coordinates in the property record to place it on the map.</p>
		</div>{:else if tilesFailed}<div class="map-warning" role="status">
			Map tiles could not load. Check your connection. <button
				type="button"
				onclick={() => void initialize()}>Retry</button
			>
		</div>{:else if loading}<div class="map-loading" role="status">Loading map…</div>{/if}
</div>

<style>
	.map-shell {
		position: relative;
		z-index: 0;
		background: #e9efdf;
		border-radius: 11px;
		overflow: hidden;
		border: 1px solid #d9e3cc;
	}
	.portfolio-map {
		height: 480px;
		background: #e9efdf;
	}
	.map-toolbar {
		position: absolute;
		top: 14px;
		right: 14px;
		z-index: 500;
	}
	.map-toolbar button,
	.map-message button,
	.map-warning button {
		font: inherit;
		font-size: 10px;
		color: #55743c;
		background: #fffefa;
		border: 1px solid #d1dfc0;
		padding: 11px 14px;
		border-radius: 5px;
		cursor: pointer;
	}
	.map-message {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 35px;
		background: #edf2e6e8;
		text-align: center;
		z-index: 450;
	}
	.map-message strong {
		font-size: 16px;
		color: #4c6b35;
		font-weight: 500;
	}
	.map-message p {
		font-size: 11px;
		line-height: 1.8;
		color: #8a9c74;
		max-width: 280px;
	}
	.map-loading,
	.map-warning {
		position: absolute;
		bottom: 16px;
		left: 16px;
		right: 16px;
		z-index: 500;
		padding: 13px 16px;
		background: #fffef6ed;
		border-radius: 6px;
		font-size: 10px;
		color: #7d8d68;
	}
	.map-warning button {
		padding: 5px 8px;
		margin-left: 10px;
	}
	.map-shell.expanded {
		position: fixed;
		inset: 18px;
		z-index: 1200;
		border: 10px solid #fffefa;
		box-shadow: 0 20px 80px #203d3240;
	}
	.map-shell.expanded .portfolio-map {
		height: 100%;
	}
	.map-shell :global(.musha-map-pin) {
		background: none;
		border: 0;
	}
	.map-shell :global(.musha-map-pin span) {
		display: block;
		width: 22px;
		height: 22px;
		background: #466b39;
		border: 3px solid #fffefa;
		border-radius: 50% 50% 50% 0;
		transform: rotate(-45deg);
		box-shadow: 0 3px 9px #203d3240;
	}
	.map-shell button:focus-visible {
		outline: 2px solid #8ca671;
		outline-offset: 3px;
	}
	@media (max-width: 650px) {
		.portfolio-map {
			height: 360px;
		}
		.map-shell.expanded {
			inset: 8px;
			border-width: 5px;
		}
	}
</style>
