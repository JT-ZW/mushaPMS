<script lang="ts">
	import { onMount } from 'svelte';
	import 'leaflet/dist/leaflet.css';
	import type * as Leaflet from 'leaflet';

	let { initialLatitude = '', initialLongitude = '' } = $props<{
		initialLatitude?: string | number | null;
		initialLongitude?: string | number | null;
	}>();

	type PlaceResult = { place_id: number; display_name: string; lat: string; lon: string };
	let mapElement: HTMLDivElement;
	let latitude = $state('');
	let longitude = $state('');
	let searchQuery = $state('');
	let results = $state<PlaceResult[]>([]);
	let searching = $state(false);
	let searchMessage = $state('');
	let map: Leaflet.Map | undefined;
	let marker: Leaflet.Marker | undefined;
	const harare: [number, number] = [-17.8252, 31.0335];

	$effect(() => {
		if (!latitude) latitude = String(initialLatitude ?? '');
		if (!longitude) longitude = String(initialLongitude ?? '');
	});

	const placeMarker = (L: typeof import('leaflet'), lat: number, lng: number, pan = false) => {
		latitude = lat.toFixed(6);
		longitude = lng.toFixed(6);
		if (!map) return;
		if (marker) marker.setLatLng([lat, lng]);
		else marker = L.marker([lat, lng]).addTo(map);
		if (pan) map.setView([lat, lng], Math.max(map.getZoom(), 15));
	};

	const useCurrentLocation = () => {
		if (!navigator.geolocation) {
			searchMessage = 'Location services are not available in this browser.';
			return;
		}
		searchMessage = 'Finding your current location…';
		navigator.geolocation.getCurrentPosition(
			(position) => {
				searchMessage = '';
				void import('leaflet').then((L) =>
					placeMarker(L, position.coords.latitude, position.coords.longitude, true)
				);
			},
			() =>
				(searchMessage =
					'We could not access your location. You can search or click the map instead.')
		);
	};

	const searchPlaces = async () => {
		const query = searchQuery.trim();
		if (query.length < 3) {
			searchMessage = 'Enter at least 3 characters to search.';
			results = [];
			return;
		}
		searching = true;
		searchMessage = '';
		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`
			);
			if (!response.ok) throw new Error('Search unavailable');
			results = (await response.json()) as PlaceResult[];
			if (!results.length) searchMessage = 'No places found. Try a nearby road, suburb, or city.';
		} catch {
			results = [];
			searchMessage =
				'Place search is temporarily unavailable. You can still pin the map manually.';
		} finally {
			searching = false;
		}
	};

	const selectPlace = (place: PlaceResult) => {
		searchQuery = place.display_name;
		results = [];
		void import('leaflet').then((L) => placeMarker(L, Number(place.lat), Number(place.lon), true));
	};

	onMount(() => {
		void (async () => {
			const L = await import('leaflet');
			map = L.map(mapElement, { scrollWheelZoom: false, preferCanvas: true }).setView(harare, 6);
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; OpenStreetMap contributors',
				maxZoom: 20
			}).addTo(map);
			const existingLat = Number(latitude);
			const existingLng = Number(longitude);
			if (Number.isFinite(existingLat) && Number.isFinite(existingLng) && latitude && longitude)
				placeMarker(L, existingLat, existingLng, true);
			map.on('click', (event) => placeMarker(L, event.latlng.lat, event.latlng.lng));
		})();
		return () => map?.remove();
	});
</script>

<section class="location-picker" aria-label="Property location">
	<div class="picker-heading">
		<div>
			<strong>Find and pin the property</strong>
			<p>Search roads, suburbs, landmarks, or cities like you would in a map app.</p>
		</div>
		<button type="button" onclick={useCurrentLocation}>Use current location</button>
	</div>
	<div class="search-wrap">
		<div class="search-box">
			<span aria-hidden="true">⌕</span><input
				bind:value={searchQuery}
				placeholder="Search a road, place, or suburb"
				aria-label="Search for a property location"
				onkeydown={(event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						void searchPlaces();
					}
				}}
			/><button type="button" onclick={() => void searchPlaces()} disabled={searching}
				>{searching ? 'Searching…' : 'Search'}</button
			>
		</div>
		{#if results.length}<div
				class="search-results"
				role="listbox"
				aria-label="Location search results"
			>
				{#each results as place (place.place_id)}<button
						type="button"
						role="option"
						aria-selected="false"
						onclick={() => selectPlace(place)}><span>⌖</span>{place.display_name}</button
					>{/each}
			</div>{/if}
		{#if searchMessage}<p class="search-message" role="status">{searchMessage}</p>{/if}
	</div>
	<div class="map" bind:this={mapElement} aria-label="Interactive property location map"></div>
	<div class="map-hint">
		Click anywhere on the map to move the pin. Search results and manual pins update the coordinates
		below.
	</div>
	<div class="coordinates">
		<label
			>Latitude<input
				name="latitude"
				bind:value={latitude}
				inputmode="decimal"
				placeholder="-17.825166"
			/></label
		><label
			>Longitude<input
				name="longitude"
				bind:value={longitude}
				inputmode="decimal"
				placeholder="31.033510"
			/></label
		>
	</div>
</section>

<style>
	.location-picker {
		background: #fbfcfa;
		border: 1px solid #dfe9e1;
		border-radius: 10px;
		overflow: visible;
	}
	.picker-heading {
		align-items: flex-start;
		display: flex;
		gap: 15px;
		justify-content: space-between;
		padding: 13px 14px;
	}
	.picker-heading strong {
		color: #345b4b;
		font-size: 13px;
	}
	.picker-heading p {
		color: #789085;
		font-size: 12px;
		line-height: 1.45;
		margin: 4px 0 0;
	}
	.picker-heading button {
		background: #fff;
		border: 1px solid #cfe0d4;
		border-radius: 6px;
		color: #476f5b;
		cursor: pointer;
		font: inherit;
		font-size: 11px;
		padding: 7px 9px;
		white-space: nowrap;
	}
	.search-wrap {
		padding: 0 14px 12px;
		position: relative;
	}
	.search-box {
		align-items: center;
		background: #fff;
		border: 1px solid #cfe0d4;
		border-radius: 7px;
		display: flex;
		gap: 8px;
		overflow: hidden;
	}
	.search-box > span {
		color: #668a6d;
		font-size: 19px;
		padding-left: 10px;
	}
	.search-box input {
		border: 0;
		border-radius: 0;
		flex: 1;
		outline: 0;
		padding-left: 0;
	}
	.search-box button {
		background: #edf4dc;
		border: 0;
		border-left: 1px solid #d9e7dc;
		color: #356a52;
		cursor: pointer;
		font: inherit;
		font-size: 11px;
		font-weight: 800;
		height: 100%;
		padding: 0 12px;
	}
	.search-box button:disabled {
		cursor: wait;
		opacity: 0.55;
	}
	.search-results {
		background: #fff;
		border: 1px solid #d7e5da;
		border-radius: 7px;
		box-shadow: 0 12px 28px rgb(23 61 46 / 13%);
		display: grid;
		left: 14px;
		overflow: hidden;
		position: absolute;
		right: 14px;
		top: 47px;
		z-index: 5;
	}
	.search-results button {
		background: #fff;
		border: 0;
		border-bottom: 1px solid #edf2ed;
		color: #416653;
		cursor: pointer;
		font: inherit;
		font-size: 12px;
		line-height: 1.35;
		padding: 10px 12px;
		text-align: left;
	}
	.search-results button:last-child {
		border-bottom: 0;
	}
	.search-results button:hover {
		background: #f1f7ea;
	}
	.search-results button span {
		color: #6a966b;
		margin-right: 8px;
	}
	.search-message {
		color: #9a6b43;
		font-size: 11px;
		margin: 7px 0 0;
	}
	.map {
		border-bottom: 1px solid #dfe9e1;
		border-top: 1px solid #dfe9e1;
		height: 280px;
		z-index: 0;
	}
	.map-hint {
		color: #81958b;
		font-size: 10px;
		line-height: 1.4;
		padding: 8px 14px 0;
	}
	.coordinates {
		display: grid;
		gap: 9px;
		grid-template-columns: 1fr 1fr;
		padding: 10px 14px 12px;
	}
	.coordinates label {
		color: #638073;
		display: grid;
		font-size: 11px;
		font-weight: 700;
		gap: 5px;
	}
	.coordinates input {
		background: #fff;
		border: 1px solid #dfe9e1;
		border-radius: 6px;
		color: #365b4b;
		font: inherit;
		font-size: 12px;
		padding: 9px;
		width: 100%;
	}
	@media (max-width: 520px) {
		.picker-heading {
			display: block;
		}
		.picker-heading button {
			margin-top: 10px;
		}
		.coordinates {
			grid-template-columns: 1fr;
		}
	}
</style>
