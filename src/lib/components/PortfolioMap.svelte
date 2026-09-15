<script lang="ts">
	import { onMount } from 'svelte';
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

	onMount(() => {
		let map: Leaflet.Map | undefined;
		void (async () => {
			const L = await import('leaflet');
			const pins = properties
				.map((property: (typeof properties)[number]) => ({
					...property,
					latitude: Number(property.latitude),
					longitude: Number(property.longitude)
				}))
				.filter(
					(property: { latitude: number; longitude: number }) =>
						Number.isFinite(property.latitude) && Number.isFinite(property.longitude)
				);
			map = L.map(mapElement, { scrollWheelZoom: false, preferCanvas: true }).setView(
				[-19.0154, 29.1549],
				5.6
			);
			L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
				attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
				maxZoom: 20,
				detectRetina: true
			}).addTo(map);
			const bounds: [number, number][] = [];
			for (const pin of pins) {
				L.marker([pin.latitude, pin.longitude])
					.addTo(map)
					.bindPopup(`<strong>${pin.name}</strong>`);
				bounds.push([pin.latitude, pin.longitude]);
			}
			if (bounds.length === 1) map.setView(bounds[0], 13);
			else if (bounds.length > 1) map.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
		})();
		return () => {
			map?.remove();
		};
	});
</script>

<div class="portfolio-map" bind:this={mapElement} aria-label="Map of mapped properties"></div>

<style>
	.portfolio-map {
		height: 330px;
		border: 1px solid #dfe9e1;
		border-radius: 10px;
		overflow: hidden;
		z-index: 0;
	}
</style>
