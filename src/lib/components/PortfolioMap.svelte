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
	let map: Leaflet.Map | undefined;
	let expanded = $state(false);

	function toggleExpanded() {
		expanded = !expanded;
		requestAnimationFrame(() => map?.invalidateSize());
	}

	onMount(() => {
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
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; OpenStreetMap contributors',
				maxZoom: 20
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

<div class="map-shell" class:expanded>
	<div class="map-toolbar">
		<button
			type="button"
			onclick={toggleExpanded}
			aria-expanded={expanded}
			aria-label={expanded ? 'Minimize map' : 'Expand map'}
		>
			{expanded ? 'Minimize map' : 'Expand map'}
			<span aria-hidden="true">{expanded ? '−' : '↗'}</span>
		</button>
	</div>
	<div class="portfolio-map" bind:this={mapElement} aria-label="Map of mapped properties"></div>
</div>

<style>
	.map-shell {
		position: relative;
		z-index: 0;
	}
	.portfolio-map {
		height: 330px;
		border: 1px solid #dfe9e1;
		border-radius: 10px;
		overflow: hidden;
	}
	.map-toolbar {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 500;
	}
	.map-toolbar button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		border: 1px solid #d5e3d7;
		border-radius: 8px;
		background: rgb(255 255 255 / 94%);
		box-shadow: 0 4px 12px rgb(16 63 48 / 13%);
		color: #285e4c;
		cursor: pointer;
		font: inherit;
		font-size: 11px;
		font-weight: 700;
		padding: 8px 10px;
	}
	.map-toolbar button:hover {
		background: #f1f7e9;
	}
	.map-toolbar button:focus-visible {
		outline: 2px solid #79a963;
		outline-offset: 2px;
	}
	.map-toolbar button span {
		font-size: 16px;
		line-height: 0.8;
	}
	.map-shell.expanded {
		position: fixed;
		inset: 18px;
		z-index: 1200;
		padding: 14px;
		border: 1px solid #d5e3d7;
		border-radius: 14px;
		background: #fff;
		box-shadow: 0 24px 70px rgb(6 47 51 / 30%);
	}
	.map-shell.expanded .portfolio-map {
		height: 100%;
		min-height: 320px;
	}
	.map-shell.expanded .map-toolbar {
		top: 24px;
		right: 24px;
	}
	@media (max-width: 600px) {
		.map-shell.expanded {
			inset: 10px;
			padding: 10px;
		}
		.map-shell.expanded .map-toolbar {
			top: 18px;
			right: 18px;
		}
	}
</style>
