<script lang="ts">
	import { resolve } from '$app/paths';
	import PortfolioMap from '$lib/components/PortfolioMap.svelte';

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
		name: string;
		kind: string;
		status: string;
		monthly_rent: number | string | null;
	};

	let { organization, properties, spaces } = $props<{
		organization: { id: string; currency_code: string };
		properties: Property[];
		spaces: Space[];
	}>();

	const modeLabels: Record<string, string> = {
		whole_property: 'Whole property',
		room_by_room: 'Room by room',
		mixed: 'Mixed arrangement'
	};

	const spacesFor = (propertyId: string) =>
		spaces.filter((space: Space) => space.property_id === propertyId);
	const occupiedFor = (propertyId: string) =>
		spacesFor(propertyId).filter((space: Space) => space.status === 'occupied').length;
	const mappedCount = $derived(
		properties.filter((property: Property) => property.latitude && property.longitude).length
	);
	const occupiedCount = $derived(
		spaces.filter((space: Space) => space.status === 'occupied').length
	);
	const vacantCount = $derived(spaces.filter((space: Space) => space.status === 'vacant').length);
</script>

<svelte:head><title>Properties · {organization.currency_code} · Musha</title></svelte:head>

<section class="properties-page" aria-labelledby="properties-title">
	<div class="page-heading">
		<div>
			<p class="eyebrow">Portfolio register</p>
			<h2 id="properties-title">Your properties<span>.</span></h2>
			<p class="intro-copy">
				A calm overview of every location you manage. Open the registration flow when you are ready
				to add another one.
			</p>
		</div>
		<a class="primary" href={resolve(`/workspace/${organization.id}/new-property`)}
			>Add a property <span>→</span></a
		>
	</div>

	<div class="metric-row">
		<div class="metric emphasis">
			<span>Properties</span><strong>{properties.length}</strong><small>Managed locations</small>
		</div>
		<div class="metric">
			<span>Rentable spaces</span><strong>{spaces.length}</strong><small
				>{occupiedCount} occupied · {vacantCount} vacant</small
			>
		</div>
		<div class="metric">
			<span>Mapped locations</span><strong>{mappedCount}</strong><small
				>Visible on your portfolio map</small
			>
		</div>
	</div>

	<div class="overview-grid">
		<section class="panel property-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">All locations</p>
					<h3>Property register</h3>
					<p>Each property keeps its address, rental model, and spaces together.</p>
				</div>
				<span class="count"
					>{properties.length} {properties.length === 1 ? 'property' : 'properties'}</span
				>
			</div>
			{#if properties.length === 0}
				<div class="empty">
					<strong>No properties listed yet.</strong>
					<p>Start with the first location in your portfolio.</p>
					<a class="secondary" href={resolve(`/workspace/${organization.id}/new-property`)}
						>Register your first property →</a
					>
				</div>
			{:else}
				<div class="property-list">
					{#each properties as property (property.id)}
						{@const propertySpaces = spacesFor(property.id)}
						{@const occupied = occupiedFor(property.id)}
						<article class="property-card">
							<div class="property-card-heading">
								<span class="property-icon">⌂</span>
								<div>
									<h4>{property.name}</h4>
									<p>
										{property.address_line_1 ??
											property.city ??
											'Address not captured'}{property.country ? ` · ${property.country}` : ''}
									</p>
								</div>
								<span class:inactive={property.status !== 'active'} class="status"
									>{property.status}</span
								>
							</div>
							<div class="property-meta">
								<span><b>{propertySpaces.length}</b> spaces</span><span
									><b>{occupied}</b> occupied</span
								><span
									><b
										>{propertySpaces.length
											? Math.round((occupied / propertySpaces.length) * 100)
											: 0}%</b
									> occupied</span
								><span class="model">{modeLabels[property.rental_mode ?? 'whole_property']}</span>
							</div>
							<div
								class="occupancy-bar"
								aria-label={`${occupied} of ${propertySpaces.length} spaces occupied`}
							>
								<i
									style={`width: ${propertySpaces.length ? Math.round((occupied / propertySpaces.length) * 100) : 0}%`}
								></i>
							</div>
							<div class="property-footer">
								<small
									>{property.code ?? 'No reference code'} · {property.latitude && property.longitude
										? 'Mapped location'
										: 'Location not pinned'}</small
								><a href={resolve(`/workspace/${organization.id}/new-property`)}>Manage spaces →</a>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
		<section class="panel map-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Portfolio map</p>
					<h3>Where your properties are</h3>
					<p>Use the map to understand your footprint at a glance.</p>
				</div>
				<span class="count">{mappedCount} pinned</span>
			</div>
			<PortfolioMap {properties} />
			<div class="map-note">
				<span>⌖</span>
				<p>
					Need to add another location? <a
						href={resolve(`/workspace/${organization.id}/new-property`)}>Register a property</a
					> and pin it during setup.
				</p>
			</div>
		</section>
	</div>
</section>

<style>
	.properties-page {
		display: grid;
		gap: 16px;
	}
	.page-heading {
		align-items: flex-end;
		display: flex;
		gap: 24px;
		justify-content: space-between;
	}
	.eyebrow {
		color: #718f82;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.15em;
		margin: 0 0 9px;
		text-transform: uppercase;
	}
	h2,
	h3,
	h4,
	p {
		margin-top: 0;
	}
	h2 {
		color: #093f3d;
		font-size: clamp(40px, 5vw, 62px);
		letter-spacing: -0.08em;
		line-height: 0.94;
		margin-bottom: 12px;
	}
	h2 span {
		color: var(--musha-lime);
	}
	h3 {
		color: #0b4541;
		font-size: 25px;
		letter-spacing: -0.06em;
		margin-bottom: 8px;
	}
	h4 {
		color: #2d5b4b;
		font-size: 17px;
		letter-spacing: -0.03em;
		margin-bottom: 4px;
	}
	.intro-copy,
	.panel-heading p {
		color: #718a7e;
		font-size: 14px;
		line-height: 1.55;
		margin-bottom: 0;
		max-width: 620px;
	}
	.primary {
		align-items: center;
		background: var(--musha-deep);
		border-radius: 7px;
		color: #fff;
		display: inline-flex;
		font-size: 13px;
		font-weight: 800;
		gap: 12px;
		padding: 13px 16px;
		text-decoration: none;
		white-space: nowrap;
	}
	.primary span {
		color: var(--musha-lime);
		font-size: 17px;
	}
	.metric-row {
		display: grid;
		gap: 10px;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	.metric {
		background: #fff;
		border: 1px solid #e1ebe2;
		border-radius: 10px;
		padding: 17px;
	}
	.metric.emphasis {
		background: var(--musha-deep);
		border-color: var(--musha-deep);
		color: #fff;
	}
	.metric span,
	.metric small {
		color: #7a9287;
		display: block;
		font-size: 11px;
	}
	.metric.emphasis span,
	.metric.emphasis small {
		color: #b7d1c2;
	}
	.metric strong {
		color: #244a3b;
		display: block;
		font-size: 30px;
		letter-spacing: -0.06em;
		margin: 9px 0 3px;
	}
	.metric.emphasis strong {
		color: #fff;
	}
	.overview-grid {
		align-items: start;
		display: grid;
		gap: 14px;
		grid-template-columns: minmax(0, 1.25fr) minmax(330px, 0.75fr);
	}
	.panel {
		background: #fff;
		border: 1px solid #e1ebe2;
		border-radius: 12px;
		padding: 25px;
	}
	.panel-heading {
		align-items: flex-start;
		display: flex;
		gap: 15px;
		justify-content: space-between;
		margin-bottom: 20px;
	}
	.count,
	.status {
		background: #edf4dc;
		border-radius: 99px;
		color: #668a6d;
		font-size: 11px;
		padding: 7px 10px;
		white-space: nowrap;
	}
	.status {
		text-transform: capitalize;
	}
	.status.inactive {
		background: #f6e6e0;
		color: #9a5a4c;
	}
	.property-list {
		display: grid;
		gap: 9px;
	}
	.property-card {
		border: 1px solid #e4eee5;
		border-radius: 9px;
		padding: 15px;
	}
	.property-card-heading {
		align-items: center;
		display: flex;
		gap: 10px;
	}
	.property-card-heading > div {
		flex: 1;
		min-width: 0;
	}
	.property-card-heading p {
		color: #8a9e94;
		font-size: 11px;
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.property-icon {
		align-items: center;
		background: #eaf3d7;
		border-radius: 9px;
		color: #5c8a63;
		display: inline-flex;
		flex: 0 0 34px;
		height: 34px;
		justify-content: center;
	}
	.property-meta {
		align-items: center;
		color: #7b9287;
		display: flex;
		flex-wrap: wrap;
		font-size: 11px;
		gap: 15px;
		margin: 15px 0 9px 44px;
	}
	.property-meta b {
		color: #3f6d56;
		font-size: 12px;
	}
	.property-meta .model {
		background: #f0f5e9;
		border-radius: 99px;
		color: #688c6a;
		padding: 5px 8px;
	}
	.occupancy-bar {
		background: #edf3eb;
		border-radius: 99px;
		height: 5px;
		margin-left: 44px;
		overflow: hidden;
	}
	.occupancy-bar i {
		background: #87ad62;
		border-radius: inherit;
		display: block;
		height: 100%;
	}
	.property-footer {
		align-items: center;
		display: flex;
		gap: 12px;
		justify-content: space-between;
		margin: 12px 0 0 44px;
	}
	.property-footer small {
		color: #91a198;
		font-size: 10px;
	}
	.property-footer a,
	.map-note a {
		color: #4c8061;
		font-size: 11px;
		font-weight: 800;
		text-decoration: none;
	}
	.empty {
		align-items: center;
		border: 1px dashed #d9e7dc;
		border-radius: 8px;
		display: grid;
		gap: 7px;
		justify-items: center;
		min-height: 190px;
		text-align: center;
	}
	.empty strong {
		color: #486b5b;
		font-size: 13px;
	}
	.empty p {
		color: #8a9f94;
		font-size: 12px;
		margin-bottom: 5px;
	}
	.secondary {
		background: #edf4dc;
		border-radius: 7px;
		color: #3b7255;
		font-size: 12px;
		font-weight: 800;
		padding: 10px 12px;
		text-decoration: none;
	}
	.map-panel :global(.portfolio-map) {
		height: 380px;
	}
	.map-note {
		align-items: center;
		background: #f4f8ed;
		border-radius: 8px;
		display: flex;
		gap: 9px;
		margin-top: 12px;
		padding: 10px 12px;
	}
	.map-note span {
		color: #6b996d;
		font-size: 18px;
	}
	.map-note p {
		color: #718b7d;
		font-size: 11px;
		line-height: 1.4;
		margin: 0;
	}
	@media (max-width: 900px) {
		.overview-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 650px) {
		.page-heading {
			align-items: flex-start;
			flex-direction: column;
		}
		.metric-row {
			grid-template-columns: 1fr;
		}
		.panel {
			padding: 18px;
		}
		.map-panel :global(.portfolio-map) {
			height: 280px;
		}
	}
	@media (max-width: 480px) {
		.property-card-heading {
			align-items: flex-start;
			flex-wrap: wrap;
		}
		.property-card-heading .status {
			margin-left: 44px;
		}
		.property-meta,
		.occupancy-bar,
		.property-footer {
			margin-left: 0;
		}
		.property-footer {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
