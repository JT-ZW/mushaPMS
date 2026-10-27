<script lang="ts">
	import { resolve } from '$app/paths';
	import PortfolioMap from './PortfolioMap.svelte';
	import { coordinates, rentableSpaces } from '$lib/dashboard/portfolio';
	type Property = {
		id: string;
		name: string;
		code: string | null;
		address_line_1: string | null;
		city: string | null;
		country: string | null;
		latitude: number | string | null;
		longitude: number | string | null;
		status: string;
		rental_mode?: string | null;
	};
	type Space = {
		id: string;
		property_id: string;
		parent_space_id?: string | null;
		name: string;
		kind: string;
		status: string;
		monthly_rent: number | string | null;
	};
	type Request = { id: string; property_id: string; status: string };
	let {
		organization,
		properties,
		spaces,
		maintenance = [],
		onAdd
	} = $props<{
		organization: { id: string; currency_code: string };
		properties: Property[];
		spaces: Space[];
		maintenance?: Request[];
		onAdd?: () => void;
	}>();
	let view = $state<'cards' | 'table' | 'map'>('cards');
	let search = $state('');
	let status = $state('all');
	let availability = $state('all');
	let sort = $state('name');
	const modes: Record<string, string> = {
		whole_property: 'Whole property',
		room_by_room: 'Room by room',
		mixed: 'Mixed arrangement'
	};
	const rentable = $derived(rentableSpaces<Space>(properties, spaces));
	type PortfolioRow = Property & {
		total: number;
		occupied: number;
		vacant: number;
		requests: number;
		pinned: boolean;
	};
	const rows: PortfolioRow[] = $derived(
		properties.map((property: Property) => {
			const units = rentable.filter((space: Space) => space.property_id === property.id);
			return {
				...property,
				total: units.length,
				occupied: units.filter((space: Space) => space.status === 'occupied').length,
				vacant: units.filter((space: Space) => space.status === 'vacant').length,
				requests: maintenance.filter(
					(request: Request) =>
						request.property_id === property.id && !['closed', 'completed'].includes(request.status)
				).length,
				pinned: coordinates(property) !== null
			};
		})
	);
	const filtered = $derived(
		rows
			.filter(
				(row: PortfolioRow) =>
					`${row.name} ${row.code ?? ''} ${row.address_line_1 ?? ''} ${row.city ?? ''} ${row.country ?? ''}`
						.toLowerCase()
						.includes(search.toLowerCase()) &&
					(status === 'all' || row.status === status) &&
					(availability === 'all' ||
						(availability === 'vacant'
							? row.vacant > 0
							: availability === 'maintenance'
								? row.requests > 0
								: !row.pinned))
			)
			.sort((a: PortfolioRow, b: PortfolioRow) =>
				sort === 'vacancies'
					? b.vacant - a.vacant || a.name.localeCompare(b.name)
					: sort === 'occupancy'
						? (a.total ? a.occupied / a.total : 0) - (b.total ? b.occupied / b.total : 0) ||
							a.name.localeCompare(b.name)
						: a.name.localeCompare(b.name)
			)
	);
	const occupied = $derived(rentable.filter((row: Space) => row.status === 'occupied').length);
	const vacant = $derived(rentable.filter((row: Space) => row.status === 'vacant').length);
	const active = $derived(properties.filter((row: Property) => row.status === 'active').length);
	const pinned = $derived(properties.filter((row: Property) => coordinates(row) !== null).length);
	const percent = (row: { total: number; occupied: number }) =>
		row.total ? Math.round((row.occupied / row.total) * 100) : null;
	function clear() {
		search = '';
		status = 'all';
		availability = 'all';
		sort = 'name';
	}
</script>

<svelte:head><title>Properties — Musha PMS</title></svelte:head>
<section class="portfolio-browser" aria-labelledby="portfolio-title">
	<header class="portfolio-heading">
		<div>
			<p class="eyebrow">WORKSPACE / YOUR PORTFOLIO</p>
			<h1 id="portfolio-title">Every address.<em> A better perspective.</em></h1>
			<p>Explore your properties, spot available spaces and see where care is needed.</p>
		</div>
		<a
			class="primary"
			href={resolve(`/workspace/${organization.id}/new-property`)}
			onclick={(event) => {
				if (onAdd) {
					event.preventDefault();
					onAdd();
				}
			}}>+ Add property</a
		>
	</header>
	<div class="portfolio-summary">
		<div>
			<span>Active properties</span><strong
				>{active}<small>/ {properties.length} on record</small></strong
			>
		</div>
		<div>
			<span>Rentable spaces</span><strong
				>{rentable.length}<small>{occupied} occupied</small></strong
			>
		</div>
		<div><span>Available now</span><strong>{vacant}<small>vacant spaces</small></strong></div>
		<div>
			<span>Portfolio occupancy</span><strong
				>{rentable.length ? `${Math.round((occupied / rentable.length) * 100)}%` : '—'}<small
					>current space status</small
				></strong
			>
		</div>
	</div>
	<div class="browser-controls">
		<label class="search"
			><span>Find a property</span><input
				type="search"
				bind:value={search}
				placeholder="Search name, address or reference…"
			/></label
		><label
			><span>Status</span><select bind:value={status}
				><option value="all">All properties</option><option value="active">Active</option><option
					value="inactive">Inactive</option
				></select
			></label
		><label
			><span>Focus on</span><select bind:value={availability}
				><option value="all">Everything</option><option value="vacant">Has vacancies</option><option
					value="maintenance">Needs maintenance</option
				><option value="unmapped">Not yet mapped</option></select
			></label
		><label
			><span>Sort by</span><select bind:value={sort}
				><option value="name">Name A–Z</option><option value="vacancies">Most vacancies</option
				><option value="occupancy">Lowest occupancy</option></select
			></label
		>
	</div>
	<div class="results-toolbar">
		<p aria-live="polite">
			<strong>{filtered.length}</strong> of {properties.length} properties {#if search || status !== 'all' || availability !== 'all'}<button
					type="button"
					onclick={clear}>Clear filters ×</button
				>{/if}
		</p>
		<div class="view-switch" aria-label="Property view">
			{#each ['cards', 'table', 'map'] as option (option)}<button
					type="button"
					aria-pressed={view === option}
					onclick={() => (view = option as typeof view)}
					>{option === 'cards' ? '▦ Cards' : option === 'table' ? '☷ Table' : '⌖ Map'}</button
				>{/each}
		</div>
	</div>
	{#if !filtered.length}<div class="empty">
			<span>⌂</span>
			<h2>{properties.length ? 'No properties match.' : 'Your portfolio starts here.'}</h2>
			<p>
				{properties.length
					? 'Try a different search or clear the filters.'
					: 'Register a property and its spaces to begin.'}
			</p>
			{#if properties.length}<button type="button" onclick={clear}>Clear filters</button>{:else}<a
					class="primary"
					href={resolve(`/workspace/${organization.id}/new-property`)}
					onclick={(event) => {
						if (onAdd) {
							event.preventDefault();
							onAdd();
						}
					}}>Add your first property ↗</a
				>{/if}
		</div>
	{:else if view === 'cards'}<div class="property-grid">
			{#each filtered as property (property.id)}<article class="property-card">
					<div class="card-art" class:inactive={property.status !== 'active'}>
						<span class="property-reference">{property.code || 'PROPERTY RECORD'}</span><span
							class="status">{property.status}</span
						><span class="art-monogram" aria-hidden="true"
							>{property.name.slice(0, 2).toUpperCase()}</span
						><svg viewBox="0 0 240 130" fill="none" aria-hidden="true"
							><path
								d="M20 130V66L76 26l55 40v64M76 26v104M131 130V14h73v116M144 31h17v23h-17zM177 31h15v23h-15zM144 71h17v23h-17zM177 71h15v23h-15zM39 89h19v41M94 89h19v23"
							/></svg
						><small
							>{modes[property.rental_mode ?? 'whole_property'] ?? 'Rental model not set'}</small
						>
					</div>
					<div class="card-body">
						<h2>
							<a href={resolve(`/workspace/${organization.id}/properties/${property.id}`)}
								>{property.name} <span>↗</span></a
							>
						</h2>
						<p class="address">
							{[property.address_line_1, property.city, property.country]
								.filter(Boolean)
								.join(' · ') || 'Address not captured'}
						</p>
						<div class="card-numbers">
							<div><strong>{property.total}</strong><small>Rentable spaces</small></div>
							<div><strong>{property.vacant}</strong><small>Vacant</small></div>
							<div>
								<strong>{percent(property) === null ? '—' : `${percent(property)}%`}</strong><small
									>Occupied</small
								>
							</div>
						</div>
						<div
							class="occupancy-track"
							role="img"
							aria-label={`${property.occupied} of ${property.total} rentable spaces occupied`}
						>
							<i style:width={`${percent(property) ?? 0}%`}></i>
						</div>
						<div class="card-foot">
							<span class:needs-care={property.requests > 0}
								>{property.requests
									? `${property.requests} open requests`
									: 'No open maintenance'}</span
							><span>{property.pinned ? '⌖ Mapped' : 'Pin not set'}</span>
						</div>
					</div>
				</article>{/each}
		</div>
	{:else if view === 'table'}<div class="table-shell">
			<table>
				<caption>Filtered property register</caption><thead
					><tr
						><th>Property</th><th>Model</th><th>Status</th><th>Spaces</th><th>Vacant</th><th
							>Occupancy</th
						><th>Maintenance</th><th></th></tr
					></thead
				><tbody
					>{#each filtered as property (property.id)}<tr
							><td
								><a href={resolve(`/workspace/${organization.id}/properties/${property.id}`)}
									>{property.name}</a
								><small>{property.city || property.address_line_1 || 'Location not set'}</small></td
							><td>{modes[property.rental_mode ?? 'whole_property'] ?? 'Not set'}</td><td
								>{property.status}</td
							><td>{property.total}</td><td>{property.vacant}</td><td
								>{percent(property) === null ? '—' : `${percent(property)}%`}</td
							><td>{property.requests} open</td><td
								><a
									href={resolve(`/workspace/${organization.id}/properties/${property.id}`)}
									aria-label={`Open ${property.name}`}>↗</a
								></td
							></tr
						>{/each}</tbody
				>
			</table>
		</div>
	{:else}<div class="map-layout">
			<div class="map-panel">
				<PortfolioMap properties={filtered} />
				<p class="map-description">
					Showing {filtered.filter((row) => row.pinned).length} mapped locations matching your filters.
					{filtered.filter((row) => !row.pinned).length} without a pin.
				</p>
			</div>
			<aside class="map-register">
				<p class="eyebrow">LOCATIONS / {pinned} PINNED IN PORTFOLIO</p>
				{#each filtered as property (property.id)}<a
						href={resolve(`/workspace/${organization.id}/properties/${property.id}`)}
						><strong>{property.name}<span>↗</span></strong><small
							>{property.city || property.address_line_1 || 'Location not set'}</small
						><span class="pin-label"
							>{property.pinned ? 'Mapped location' : 'Location needs a pin'}</span
						></a
					>{/each}
			</aside>
		</div>{/if}
	<footer class="portfolio-note">
		Space totals match the dashboard: active terminal spaces in active properties. Subdivided parent
		units are excluded.
	</footer>
</section>

<style>
	.portfolio-browser {
		color: #294334;
		font-family: var(--font-body);
	}
	.portfolio-browser * {
		box-sizing: border-box;
	}
	.portfolio-browser h1,
	.portfolio-browser h2,
	.portfolio-browser p {
		margin-top: 0;
	}
	.portfolio-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 25px;
		margin-bottom: 30px;
	}
	.eyebrow {
		font-size: 8px;
		letter-spacing: 1.6px;
		color: #879575;
		margin-bottom: 14px;
	}
	.portfolio-heading h1 {
		font-size: clamp(26px, 2.5vw, 39px);
		letter-spacing: -1.4px;
		font-weight: 500;
		line-height: 1.2;
		margin-bottom: 12px;
	}
	.portfolio-heading h1 em {
		font-family: Georgia, serif;
		font-weight: 400;
	}
	.portfolio-heading > div > p:last-child {
		font-size: 11px;
		color: #839172;
		line-height: 1.8;
		margin: 0;
	}
	.primary {
		background: #294c38;
		color: #fff;
		padding: 13px 18px;
		font-size: 11px;
		text-decoration: none;
		border-radius: 6px;
		white-space: nowrap;
	}
	.portfolio-summary {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		border: 1px solid #dde3d3;
		background: #fffefa;
		border-radius: 12px;
		padding: 23px 10px;
		margin-bottom: 27px;
	}
	.portfolio-summary > div {
		padding: 0 22px;
		border-right: 1px solid #e4e9db;
	}
	.portfolio-summary > div:last-child {
		border: 0;
	}
	.portfolio-summary span {
		display: block;
		font-size: 10px;
		color: #7a8b69;
		margin-bottom: 13px;
	}
	.portfolio-summary strong {
		display: block;
		font-size: 27px;
		font-weight: 500;
		letter-spacing: -1px;
	}
	.portfolio-summary small {
		font-size: 9px;
		font-weight: 400;
		letter-spacing: 0;
		margin-left: 12px;
		color: #8b987d;
	}
	.browser-controls {
		display: flex;
		align-items: end;
		gap: 14px;
		background: #e9eedf;
		padding: 18px;
		border: 1px solid #dfe6d3;
		border-radius: 10px;
	}
	.browser-controls label {
		display: grid;
		gap: 9px;
		flex: 1;
		min-width: 0;
	}
	.browser-controls .search {
		flex: 2;
	}
	.browser-controls label > span {
		font-size: 8px;
		letter-spacing: 0.5px;
		color: #7d8e6c;
	}
	.browser-controls input,
	.browser-controls select {
		width: 100%;
		min-width: 0;
		font: inherit;
		font-size: 10px;
		padding: 12px;
		border: 1px solid #d9e2cc;
		border-radius: 5px;
		background: #fffefa;
		color: #567046;
	}
	.results-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		margin: 22px 0;
	}
	.results-toolbar p {
		font-size: 10px;
		color: #8a967c;
		margin: 0;
	}
	.results-toolbar strong {
		color: #405d35;
		font-weight: 500;
	}
	.results-toolbar p button {
		font: inherit;
		font-size: 9px;
		color: #6a8156;
		margin-left: 15px;
		background: none;
		border: 0;
		cursor: pointer;
	}
	.view-switch {
		display: flex;
		background: #e9eedf;
		border: 1px solid #dce4cf;
		border-radius: 7px;
		padding: 3px;
		gap: 3px;
	}
	.view-switch button {
		border: 0;
		border-radius: 5px;
		background: none;
		color: #80946a;
		padding: 9px 14px;
		font: inherit;
		font-size: 10px;
		cursor: pointer;
	}
	.view-switch button[aria-pressed='true'] {
		background: #fffefa;
		color: #3e5d30;
		box-shadow: 0 2px 6px #304b2010;
	}
	.property-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 18px;
	}
	.property-card {
		background: #fffefa;
		border: 1px solid #dce4d1;
		border-radius: 12px;
		overflow: hidden;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}
	.property-card:hover {
		transform: translateY(-3px);
		box-shadow: 0 12px 25px #29443409;
	}
	.card-art {
		height: 160px;
		background: #e4ebd9;
		position: relative;
		overflow: hidden;
		padding: 18px;
		color: #6c8354;
	}
	.card-art.inactive {
		background: #e9e9df;
		color: #929780;
	}
	.property-reference {
		font-size: 8px;
		letter-spacing: 1.5px;
		position: relative;
		z-index: 1;
	}
	.status {
		position: absolute;
		top: 14px;
		right: 14px;
		padding: 6px 9px;
		font-size: 8px;
		text-transform: capitalize;
		border-radius: 4px;
		background: #ffffffa0;
		color: #5d7749;
	}
	.card-art svg {
		position: absolute;
		right: -5px;
		bottom: -2px;
		height: 125px;
		width: 230px;
		stroke: currentColor;
		stroke-width: 1;
		opacity: 0.35;
	}
	.art-monogram {
		font-family: Georgia, serif;
		font-size: 62px;
		letter-spacing: -5px;
		position: absolute;
		top: 49px;
		left: 20px;
		color: #809966;
		opacity: 0.5;
	}
	.card-art > small {
		position: absolute;
		bottom: 15px;
		left: 18px;
		font-size: 8px;
		letter-spacing: 0.8px;
		z-index: 1;
	}
	.card-body {
		padding: 23px 20px 17px;
	}
	.card-body h2 {
		font-size: 17px;
		font-weight: 500;
		letter-spacing: -0.5px;
		line-height: 1.4;
		margin-bottom: 7px;
	}
	.card-body h2 a {
		color: #304e2e;
		text-decoration: none;
		display: flex;
		justify-content: space-between;
		gap: 15px;
		overflow-wrap: anywhere;
	}
	.card-body h2 span {
		font-size: 16px;
		color: #8b9e77;
		flex: none;
	}
	.address {
		font-size: 9px;
		line-height: 1.8;
		color: #97a18b;
		min-height: 32px;
		margin-bottom: 20px;
	}
	.card-numbers {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 10px;
	}
	.card-numbers > div {
		border-right: 1px solid #e8ecdf;
	}
	.card-numbers > div:last-child {
		border: 0;
	}
	.card-numbers strong {
		display: block;
		font-size: 21px;
		font-weight: 500;
		letter-spacing: -0.6px;
	}
	.card-numbers small {
		display: block;
		font-size: 8px;
		color: #91a07f;
		margin-top: 6px;
	}
	.occupancy-track {
		height: 4px;
		background: #ebefdf;
		border-radius: 5px;
		margin: 20px 0 17px;
		overflow: hidden;
	}
	.occupancy-track i {
		display: block;
		height: 100%;
		background: #88a76b;
		border-radius: 5px;
	}
	.card-foot {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		border-top: 1px solid #e7ecdc;
		padding-top: 14px;
		font-size: 8px;
		color: #94a383;
	}
	.needs-care {
		color: #a47744;
	}
	.table-shell {
		border: 1px solid #dfe5d5;
		border-radius: 10px;
		overflow: auto;
		background: #fffefa;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		white-space: nowrap;
	}
	caption {
		text-align: left;
		padding: 20px;
		font-size: 11px;
		color: #7d8f69;
	}
	th {
		text-align: left;
		background: #edf1e5;
		color: #7d9069;
		font-size: 9px;
		font-weight: 500;
		padding: 15px;
	}
	td {
		padding: 19px 15px;
		border-top: 1px solid #e7ecdd;
		font-size: 10px;
		color: #728461;
		text-transform: capitalize;
	}
	td:first-child a {
		font-size: 12px;
		color: #416035;
		text-decoration: none;
	}
	td small {
		display: block;
		font-size: 9px;
		color: #99a68a;
		margin-top: 8px;
	}
	td a {
		color: #5c7748;
	}
	.map-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 260px;
		gap: 18px;
	}
	.map-panel {
		min-width: 0;
	}
	.map-description {
		font-size: 9px;
		line-height: 1.8;
		color: #8a9b77;
		margin: 16px 0;
	}
	.map-register {
		border: 1px solid #dce5d0;
		background: #fffefa;
		padding: 20px;
		border-radius: 10px;
		max-height: 520px;
		overflow: auto;
	}
	.map-register a {
		display: block;
		border-top: 1px solid #e9eddf;
		padding: 19px 0;
		text-decoration: none;
		color: inherit;
	}
	.map-register strong {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		font-size: 11px;
		font-weight: 500;
	}
	.map-register small {
		display: block;
		color: #99a58a;
		font-size: 9px;
		margin-top: 8px;
	}
	.pin-label {
		display: block;
		margin-top: 13px;
		color: #82996b;
		font-size: 8px;
	}
	.portfolio-note {
		font-size: 8px;
		line-height: 1.9;
		color: #9ba58d;
		margin-top: 24px;
	}
	.empty {
		padding: 65px 25px;
		text-align: center;
		border: 1px dashed #cddabd;
		border-radius: 12px;
		display: grid;
		justify-items: center;
		gap: 15px;
	}
	.empty > span {
		font-size: 32px;
		color: #8ca776;
	}
	.empty h2 {
		font-size: 22px;
		font-weight: 500;
		margin: 0;
	}
	.empty p {
		font-size: 12px;
		color: #8e9f7b;
		margin: 0;
	}
	.empty button {
		background: #e7eedc;
		border: 0;
		padding: 12px 18px;
		color: #637f49;
		cursor: pointer;
		border-radius: 5px;
	}
	a:focus-visible,
	button:focus-visible,
	input:focus-visible,
	select:focus-visible {
		outline: 2px solid #8caa70;
		outline-offset: 4px;
	}
	@media (max-width: 1250px) {
		.property-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.portfolio-summary small {
			display: block;
			margin: 7px 0 0;
		}
		.map-layout {
			grid-template-columns: minmax(0, 1fr) 220px;
		}
	}
	@media (max-width: 900px) {
		.browser-controls {
			flex-wrap: wrap;
		}
		.browser-controls .search {
			flex-basis: 100%;
		}
		.property-grid {
			gap: 12px;
		}
		.map-layout {
			grid-template-columns: 1fr;
		}
		.map-register {
			max-height: 300px;
		}
		.portfolio-heading {
			align-items: start;
			flex-direction: column;
		}
	}
	@media (max-width: 550px) {
		.portfolio-heading h1 {
			font-size: 30px;
		}
		.portfolio-summary {
			grid-template-columns: 1fr 1fr;
			gap: 22px 0;
			padding: 22px 4px;
		}
		.portfolio-summary > div:nth-child(2) {
			border: 0;
		}
		.portfolio-summary > div {
			padding: 0 16px;
		}
		.portfolio-summary strong {
			font-size: 25px;
		}
		.property-grid {
			grid-template-columns: 1fr;
		}
		.browser-controls {
			padding: 15px;
			gap: 15px 9px;
		}
		.browser-controls label {
			flex-basis: 40%;
		}
		.results-toolbar {
			flex-wrap: wrap;
			gap: 16px;
		}
		.view-switch {
			width: 100%;
		}
		.view-switch button {
			flex: 1;
			padding: 11px;
		}
		.card-art {
			height: 150px;
		}
		.card-body h2 {
			font-size: 19px;
		}
		.card-numbers strong {
			font-size: 24px;
		}
		.address {
			min-height: 0;
		}
		.portfolio-note {
			font-size: 9px;
		}
		.card-foot {
			font-size: 9px;
		}
		.card-numbers small {
			font-size: 9px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.property-card {
			transition: none;
		}
	}
</style>
