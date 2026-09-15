<script lang="ts">
	import { resolve } from '$app/paths';
	import LocationPicker from '$lib/components/LocationPicker.svelte';
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
		parent_space_id: string | null;
		name: string;
		code: string | null;
		kind: string;
		status: string;
		monthly_rent: number | string | null;
		deposit_amount: number | string | null;
		floor_label: string | null;
	};

	let { organization, properties, spaces, form } = $props<{
		organization: { id: string; currency_code: string };
		properties: Property[];
		spaces: Space[];
		form?: { message?: string; success?: boolean; nextStep?: number; propertyId?: string } | null;
	}>();

	let step = $state(1);
	let selectedPropertyId = $state('');
	let rentalMode = $state('whole_property');
	let showRoomForm = $state(false);

	const modes = [
		{
			key: 'whole_property',
			title: 'One whole property',
			copy: 'One household, business, or guest booking uses the full property.',
			kind: 'unit'
		},
		{
			key: 'room_by_room',
			title: 'Rooms or spaces',
			copy: 'Each room, office, shop, or bed can have its own occupant and rent.',
			kind: 'room'
		},
		{
			key: 'mixed',
			title: 'Mixed arrangement',
			copy: 'Keep a whole-property option alongside individually rentable rooms.',
			kind: 'unit'
		}
	];

	$effect(() => {
		if (!selectedPropertyId && properties.length) selectedPropertyId = properties[0].id;
		const selected = properties.find((property: Property) => property.id === selectedPropertyId);
		if (selected?.rental_mode) rentalMode = selected.rental_mode;
	});
	$effect(() => {
		if (form?.success && form.nextStep) {
			step = form.nextStep;
			if (form.propertyId) selectedPropertyId = form.propertyId;
		}
	});

	const selectedProperty = $derived(
		properties.find((property: Property) => property.id === selectedPropertyId) ?? null
	);
	const selectedSpaces = $derived(
		spaces.filter((space: Space) => space.property_id === selectedPropertyId)
	);
	const rootSpaces = $derived(selectedSpaces.filter((space: Space) => !space.parent_space_id));
	const currency = $derived(organization.currency_code);

	const chooseProperty = (id: string) => {
		selectedPropertyId = id;
		const selected = properties.find((property: Property) => property.id === id);
		rentalMode = selected?.rental_mode ?? 'whole_property';
		step = 2;
	};

	const modeTitle = (key: string) =>
		modes.find((mode) => mode.key === key)?.title ?? 'Not configured';
</script>

<section class="registration-shell" aria-labelledby="registration-title">
	<div class="registration-intro">
		<div>
			<p class="eyebrow">Portfolio setup</p>
			<h2 id="registration-title">
				Register a property, then shape its rentable spaces<span>.</span>
			</h2>
			<p class="intro-copy">
				Start with the physical location. Musha will then help you decide whether it is rented as
				one whole property, room by room, or as a mixture of both.
			</p>
		</div>
		<div class="setup-note">
			<strong>Simple by design</strong><span>One property at a time</span>
		</div>
	</div>

	<nav class="steps" aria-label="Property registration steps">
		<button class:active={step === 1} type="button" onclick={() => (step = 1)}>
			<span>01</span><strong>Location</strong><small>Address and map pin</small>
		</button>
		<button
			class:active={step === 2}
			class:disabled={!properties.length}
			type="button"
			onclick={() => properties.length && (step = 2)}
		>
			<span>02</span><strong>Rental model</strong><small>Whole, rooms, or mixed</small>
		</button>
		<button
			class:active={step === 3}
			class:disabled={!selectedProperty}
			type="button"
			onclick={() => selectedProperty && (step = 3)}
		>
			<span>03</span><strong>Rentable spaces</strong><small>Units and rooms</small>
		</button>
		<button
			class:active={step === 4}
			class:disabled={!selectedProperty}
			type="button"
			onclick={() => selectedProperty && (step = 4)}
		>
			<span>04</span><strong>Review</strong><small>Ready for people and leases</small>
		</button>
	</nav>

	{#if step === 1}
		<div class="step-grid">
			<section class="panel form-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Step 1 · New location</p>
						<h3>Where is the property?</h3>
						<p>
							Search for a road or place, choose a suggestion, then fine-tune the pin if needed.
						</p>
					</div>
				</div>
				<form method="POST" action="?/addProperty" class="form-stack">
					<input type="hidden" name="rental_mode" value="whole_property" />
					<div class="form-grid two">
						<label
							>Property name<input
								name="name"
								required
								placeholder="e.g. Emerald Hill House"
							/></label
						><label>Reference / code<input name="code" placeholder="EMH-01" /></label>
					</div>
					<label>Street address<input name="address_line_1" placeholder="12 Example Road" /></label>
					<div class="form-grid three">
						<label>City<input name="city" placeholder="Harare" /></label><label
							>Country<input name="country" placeholder="Zimbabwe" /></label
						><label>Postal code<input name="postal_code" placeholder="Optional" /></label>
					</div>
					<LocationPicker />
					<button class="primary" type="submit">Save property and continue <span>→</span></button>
				</form>
			</section>
			<aside class="panel guidance-panel">
				<p class="eyebrow">What you need now</p>
				<h3>Just the location.</h3>
				<p>
					Do not worry about tenants or leases yet. We will add those after the property’s rentable
					structure is clear.
				</p>
				<div class="guidance-list">
					<div>
						<span>✓</span><strong>Property identity</strong><small>Name, code, and address</small>
					</div>
					<div>
						<span>⌖</span><strong>Accurate location</strong><small
							>Search, click, or use coordinates</small
						>
					</div>
					<div>
						<span>→</span><strong>Rentable structure</strong><small
							>Configured in the next step</small
						>
					</div>
				</div>
				<div class="portfolio-map-block">
					<p class="eyebrow">Portfolio view</p>
					<h4>Where your properties are</h4>
					<PortfolioMap {properties} />
				</div>
			</aside>
		</div>
	{:else if step === 2}
		<div class="workflow-stage">
			<div class="stage-toolbar">
				<div>
					<p class="eyebrow">Step 2 · Rental model</p>
					<h3>How will {selectedProperty?.name ?? 'this property'} be rented?</h3>
					<p>Choose the model that matches how people pay for and occupy the property.</p>
				</div>
				<button class="quiet-button" type="button" onclick={() => (step = 1)}
					>← Add another property</button
				>
			</div>
			<div class="property-selector" aria-label="Select property">
				{#each properties as property (property.id)}<button
						class:chosen={property.id === selectedPropertyId}
						type="button"
						onclick={() => chooseProperty(property.id)}
						><span class="property-mark">⌂</span><span
							><strong>{property.name}</strong><small
								>{property.city ?? property.country ?? 'Location not set'} · {spaces.filter(
									(space: Space) => space.property_id === property.id
								).length} spaces</small
							></span
						><b>→</b></button
					>{/each}
			</div>
			<div class="mode-grid">
				{#each modes as mode (mode.key)}<button
						class:chosen={rentalMode === mode.key}
						class="mode-card"
						type="button"
						onclick={() => (rentalMode = mode.key)}
						><span class="mode-number">{rentalMode === mode.key ? '✓' : '0'}</span><span
							><strong>{mode.title}</strong><small>{mode.copy}</small></span
						></button
					>{/each}
			</div>
			<form method="POST" action="?/updatePropertyRentalMode" class="stage-footer">
				<input type="hidden" name="property_id" value={selectedPropertyId} /><input
					type="hidden"
					name="rental_mode"
					value={rentalMode}
				/>
				<div>
					<strong>{modeTitle(rentalMode)}</strong><small
						>You can change this later in property settings.</small
					>
				</div>
				<button class="primary" type="submit" onclick={() => (step = 3)}
					>Save model and add spaces <span>→</span></button
				>
			</form>
		</div>
	{:else if step === 3}
		<div class="workflow-stage">
			<div class="stage-toolbar">
				<div>
					<p class="eyebrow">Step 3 · Rentable inventory</p>
					<h3>Add the spaces people will rent.</h3>
					<p>
						Use one whole-property unit, or add each room individually. You can keep adding spaces
						as the portfolio grows.
					</p>
				</div>
				<button class="quiet-button" type="button" onclick={() => (step = 2)}
					>← Change rental model</button
				>
			</div>
			<div class="inventory-context">
				<div>
					<span class="property-mark">⌂</span><span
						><strong>{selectedProperty?.name}</strong><small
							>{modeTitle(rentalMode)} · {selectedSpaces.length} spaces configured</small
						></span
					>
				</div>
				<span class="context-status">{selectedSpaces.length ? 'In progress' : 'Start here'}</span>
			</div>
			<div class="space-actions">
				<button
					class:active={rentalMode !== 'room_by_room'}
					type="button"
					onclick={() => (showRoomForm = false)}
					><span>⌂</span><strong>Add whole property</strong><small
						>One lease covers the property</small
					></button
				><button
					class:active={rentalMode !== 'whole_property'}
					type="button"
					onclick={() => (showRoomForm = true)}
					><span>＋</span><strong>Add a room or space</strong><small
						>Each space can have its own tenant</small
					></button
				>
			</div>
			{#if rentalMode === 'room_by_room' || showRoomForm}
				<form method="POST" action="?/addSpace" class="panel nested-form">
					<input type="hidden" name="property_id" value={selectedPropertyId} /><input
						type="hidden"
						name="kind"
						value="room"
					/>
					<div class="form-grid three">
						<label
							>Room / space name<input
								name="name"
								required
								placeholder="Room 1 or Cottage A"
							/></label
						><label>Code<input name="code" placeholder="R-01" /></label><label
							>Floor / block<input name="floor_label" placeholder="Ground floor" /></label
						>
					</div>
					<div class="form-grid three">
						<label
							>Monthly rent ({currency})<input
								name="monthly_rent"
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
							/></label
						><label
							>Deposit ({currency})<input
								name="deposit_amount"
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
							/></label
						><label>Capacity<input name="capacity" type="number" min="1" placeholder="1" /></label>
					</div>
					{#if rootSpaces.length}<label
							>Parent space <small>Optional · use this for a room inside a unit</small><select
								name="parent_space_id"
								><option value="">Top-level space</option
								>{#each rootSpaces as space (space.id)}<option value={space.id}
										>{space.name} · {space.kind}</option
									>{/each}</select
							></label
						>{/if}<button class="primary" type="submit"
						>Add room to {selectedProperty?.name} <span>＋</span></button
					>
				</form>
			{:else}
				<form method="POST" action="?/addSpace" class="panel nested-form">
					<input type="hidden" name="property_id" value={selectedPropertyId} /><input
						type="hidden"
						name="kind"
						value="unit"
					/>
					<div class="form-grid three">
						<label>Property unit name<input name="name" required placeholder="Main house" /></label
						><label>Code<input name="code" placeholder="UNIT-01" /></label><label
							>Floor / block<input name="floor_label" placeholder="Ground floor" /></label
						>
					</div>
					<div class="form-grid three">
						<label
							>Monthly rent ({currency})<input
								name="monthly_rent"
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
							/></label
						><label
							>Deposit ({currency})<input
								name="deposit_amount"
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
							/></label
						><label>Bedrooms<input name="bedrooms" type="number" min="0" placeholder="3" /></label>
					</div>
					<button class="primary" type="submit">Add whole-property unit <span>＋</span></button>
				</form>
			{/if}
			{#if selectedSpaces.length}<div class="space-list">
					{#each selectedSpaces as space (space.id)}<div class="space-row">
							<span class="space-icon">{space.kind === 'room' ? '□' : '⌂'}</span>
							<div>
								<strong>{space.name}</strong><small
									>{space.kind} · {space.monthly_rent
										? `${currency} ${space.monthly_rent}`
										: 'Rent to configure'}{space.parent_space_id ? ' · nested space' : ''}</small
								>
							</div>
							<span class="space-status">{space.status}</span>
						</div>{/each}
				</div>{/if}
			<div class="stage-footer">
				<div>
					<strong
						>{selectedSpaces.length
							? `${selectedSpaces.length} rentable space${selectedSpaces.length === 1 ? '' : 's'} ready`
							: 'No spaces yet'}</strong
					><small>You can add more later from Properties & units.</small>
				</div>
				<button
					class="primary"
					type="button"
					disabled={!selectedSpaces.length}
					onclick={() => (step = 4)}>Review setup <span>→</span></button
				>
			</div>
		</div>
	{:else}
		<div class="workflow-stage review-stage">
			<div class="stage-toolbar">
				<div>
					<p class="eyebrow">Step 4 · Review</p>
					<h3>{selectedProperty?.name} is ready for people and leases.</h3>
					<p>
						The property structure is in place. Next, link tenants to the exact room, unit, or space
						they occupy.
					</p>
				</div>
				<button class="quiet-button" type="button" onclick={() => (step = 3)}>← Edit spaces</button>
			</div>
			<div class="review-grid">
				<div class="review-card">
					<span class="review-icon">⌂</span><strong>{selectedProperty?.name}</strong><small
						>{selectedProperty?.address_line_1 ??
							selectedProperty?.city ??
							'Address not captured'}</small
					><b>{modeTitle(rentalMode)}</b>
				</div>
				<div class="review-card">
					<span class="review-icon">□</span><strong>{selectedSpaces.length} rentable spaces</strong
					><small
						>{selectedSpaces.filter((space: Space) => space.status === 'occupied').length} occupied ·
						{selectedSpaces.filter((space: Space) => space.status === 'vacant').length} vacant</small
					><b>Ready for leases</b>
				</div>
			</div>
			<div class="next-step">
				<div>
					<p class="eyebrow">Next step</p>
					<h4>Bring in your people</h4>
					<p>Add tenants, then create a lease against the precise space they occupy.</p>
				</div>
				<a class="primary link-button" href={resolve(`/workspace/${organization.id}/people`)}
					>Open people & leases <span>→</span></a
				>
			</div>
			<p class="review-footnote">
				You can manage all properties, rooms, leases, collections, and maintenance from the
				workspace navigation.
			</p>
		</div>
	{/if}
</section>

<style>
	.registration-shell {
		display: grid;
		gap: 18px;
		margin-bottom: 18px;
	}
	.registration-intro,
	.stage-toolbar,
	.stage-footer,
	.inventory-context {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 22px;
	}
	.registration-intro {
		padding: 2px 0 8px;
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
		font-size: clamp(27px, 3.2vw, 39px);
		letter-spacing: -0.065em;
		line-height: 0.98;
		max-width: 680px;
		margin-bottom: 12px;
	}
	h2 span {
		color: var(--musha-lime);
	}
	h3 {
		color: #093f3d;
		font-size: 25px;
		letter-spacing: -0.055em;
		margin-bottom: 8px;
	}
	h4 {
		color: #164e45;
		font-size: 20px;
		margin-bottom: 6px;
	}
	.intro-copy,
	.panel-heading p,
	.stage-toolbar p,
	.review-footnote {
		color: #718a7e;
		font-size: 14px;
		line-height: 1.55;
		margin-bottom: 0;
		max-width: 650px;
	}
	.setup-note {
		border-left: 2px solid #bfdc76;
		color: #557664;
		display: grid;
		gap: 4px;
		padding: 5px 0 5px 13px;
		white-space: nowrap;
	}
	.setup-note strong {
		font-size: 13px;
	}
	.setup-note span {
		color: #8ca196;
		font-size: 11px;
	}
	.steps {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 7px;
	}
	.steps button {
		align-items: center;
		background: #f1f6ee;
		border: 1px solid #e0eadf;
		border-radius: 10px;
		color: #5f7f6e;
		cursor: pointer;
		display: grid;
		gap: 2px;
		grid-template-columns: auto 1fr;
		padding: 12px 14px;
		text-align: left;
	}
	.steps button.active {
		background: var(--musha-deep);
		border-color: var(--musha-deep);
		color: #fff;
	}
	.steps button.disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}
	.steps span {
		grid-row: span 2;
		color: #8aa897;
		font-size: 11px;
		font-weight: 800;
		padding-right: 5px;
	}
	.steps button.active span {
		color: var(--musha-lime);
	}
	.steps strong {
		font-size: 12px;
	}
	.steps small {
		color: #89a095;
		font-size: 10px;
	}
	.steps button.active small {
		color: #b9d9c2;
	}
	.step-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr);
		gap: 14px;
	}
	.panel,
	.workflow-stage {
		background: #fff;
		border: 1px solid #e1ebe2;
		border-radius: 12px;
		padding: 25px;
	}
	.panel-heading {
		margin-bottom: 20px;
	}
	.form-stack {
		display: grid;
		gap: 13px;
	}
	.form-grid {
		display: grid;
		gap: 10px;
	}
	.two {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.three {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	label {
		color: #4d7060;
		display: grid;
		font-size: 12px;
		font-weight: 700;
		gap: 6px;
	}
	label small {
		color: #91a499;
		font-size: 10px;
		font-weight: 600;
	}
	input,
	select {
		background: #fbfdfb;
		border: 1px solid #d9e7dc;
		border-radius: 7px;
		box-sizing: border-box;
		color: #204a3b;
		font: inherit;
		font-size: 13px;
		min-width: 0;
		padding: 10px 11px;
		width: 100%;
	}
	.primary {
		align-items: center;
		background: var(--musha-deep);
		border: 0;
		border-radius: 7px;
		color: #fff;
		cursor: pointer;
		display: inline-flex;
		font: inherit;
		font-size: 13px;
		font-weight: 800;
		gap: 12px;
		justify-content: center;
		padding: 12px 15px;
		text-decoration: none;
		width: fit-content;
	}
	.primary span {
		color: var(--musha-lime);
		font-size: 17px;
	}
	.primary:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}
	.guidance-panel {
		background: #edf5dd;
		border-color: #dcebc8;
	}
	.guidance-panel h3 {
		font-size: 27px;
	}
	.guidance-panel > p:not(.eyebrow) {
		color: #668675;
		font-size: 13px;
		line-height: 1.55;
	}
	.guidance-list {
		display: grid;
		gap: 11px;
		margin-top: 25px;
	}
	.guidance-list div {
		display: grid;
		gap: 2px 10px;
		grid-template-columns: 28px 1fr;
	}
	.guidance-list span {
		background: #d7e9b6;
		border-radius: 50%;
		color: #4c7b5a;
		display: grid;
		font-size: 13px;
		grid-row: span 2;
		height: 28px;
		place-items: center;
		width: 28px;
	}
	.guidance-list strong {
		color: #32624e;
		font-size: 12px;
	}
	.guidance-list small {
		color: #799384;
		font-size: 11px;
	}
	.portfolio-map-block {
		border-top: 1px solid #dcebcf;
		margin-top: 24px;
		padding-top: 18px;
	}
	.portfolio-map-block h4 {
		font-size: 18px;
		margin-bottom: 10px;
	}
	.portfolio-map-block :global(.portfolio-map) {
		height: 220px;
		border-color: #d4e4d2;
	}
	.workflow-stage {
		display: grid;
		gap: 18px;
	}
	.quiet-button {
		background: transparent;
		border: 0;
		color: #5f856f;
		cursor: pointer;
		font: inherit;
		font-size: 12px;
		font-weight: 700;
		padding: 4px 0;
		white-space: nowrap;
	}
	.property-selector {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.property-selector button {
		align-items: center;
		background: #fbfdfb;
		border: 1px solid #dfebe0;
		border-radius: 9px;
		color: #3f6756;
		cursor: pointer;
		display: flex;
		gap: 9px;
		min-width: 210px;
		padding: 10px 12px;
		text-align: left;
	}
	.property-selector button.chosen {
		background: #eef6e1;
		border-color: #9fca7b;
	}
	.property-selector button > span:nth-child(2) {
		display: grid;
		gap: 3px;
		flex: 1;
	}
	.property-selector strong,
	.property-selector small {
		display: block;
	}
	.property-selector strong {
		font-size: 12px;
	}
	.property-selector small {
		color: #8aa096;
		font-size: 10px;
	}
	.property-selector b {
		color: #6a966b;
	}
	.property-mark,
	.space-icon {
		align-items: center;
		background: #eaf3d7;
		border-radius: 8px;
		color: #5c8a63;
		display: inline-flex;
		height: 30px;
		justify-content: center;
		width: 30px;
	}
	.mode-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}
	.mode-card,
	.space-actions button {
		align-items: flex-start;
		background: #fbfdfb;
		border: 1px solid #dfe9e1;
		border-radius: 10px;
		color: #365d4c;
		cursor: pointer;
		display: flex;
		gap: 11px;
		padding: 16px;
		text-align: left;
	}
	.mode-card.chosen,
	.space-actions button.active {
		background: #eef6e1;
		border-color: #9fca7b;
		box-shadow: 0 0 0 2px #dceec2 inset;
	}
	.mode-card > span:last-child,
	.space-actions button > strong {
		display: grid;
		gap: 5px;
	}
	.mode-card strong,
	.space-actions strong {
		font-size: 13px;
	}
	.mode-card small,
	.space-actions small {
		color: #84998e;
		font-size: 11px;
		line-height: 1.4;
	}
	.mode-number {
		align-items: center;
		background: #e7f1d1;
		border-radius: 50%;
		color: #5d8b61;
		display: flex;
		flex: 0 0 24px;
		font-size: 11px;
		height: 24px;
		justify-content: center;
	}
	.stage-footer {
		align-items: center;
		border-top: 1px solid #edf2ed;
		padding-top: 16px;
	}
	.stage-footer > div {
		display: grid;
		gap: 3px;
	}
	.stage-footer strong {
		color: #365d4c;
		font-size: 13px;
	}
	.stage-footer small {
		color: #8aa096;
		font-size: 11px;
	}
	.space-actions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}
	.space-actions button > span {
		color: #5d9663;
		font-size: 20px;
		line-height: 1;
	}
	.nested-form {
		background: #f7fbf6;
		padding: 18px;
	}
	.space-list {
		display: grid;
		gap: 7px;
	}
	.space-row {
		align-items: center;
		border: 1px solid #e8f0e8;
		border-radius: 8px;
		display: flex;
		gap: 10px;
		padding: 10px 12px;
	}
	.space-row > div {
		flex: 1;
		min-width: 0;
	}
	.space-row strong,
	.space-row small {
		display: block;
	}
	.space-row strong {
		color: #385f4e;
		font-size: 12px;
	}
	.space-row small {
		color: #8a9d93;
		font-size: 10px;
		margin-top: 3px;
	}
	.space-status,
	.context-status {
		background: #eff5e5;
		border-radius: 99px;
		color: #67906c;
		font-size: 10px;
		padding: 6px 8px;
		text-transform: capitalize;
	}
	.inventory-context {
		align-items: center;
		background: #f7fbf4;
		border: 1px solid #e4eee1;
		border-radius: 9px;
		padding: 12px;
	}
	.inventory-context > div {
		align-items: center;
		display: flex;
		gap: 10px;
	}
	.inventory-context > div > span:last-child {
		display: grid;
		gap: 3px;
	}
	.inventory-context strong,
	.inventory-context small {
		display: block;
	}
	.inventory-context strong {
		color: #37604e;
		font-size: 13px;
	}
	.inventory-context small {
		color: #8aa096;
		font-size: 10px;
	}
	.review-stage {
		min-height: 310px;
	}
	.review-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}
	.review-card {
		border: 1px solid #e0ebe1;
		border-radius: 9px;
		display: grid;
		gap: 4px;
		padding: 18px;
	}
	.review-icon {
		background: #eaf3d7;
		border-radius: 8px;
		color: #5c8a63;
		display: grid;
		height: 32px;
		margin-bottom: 5px;
		place-items: center;
		width: 32px;
	}
	.review-card strong {
		color: #315b4b;
		font-size: 14px;
	}
	.review-card small {
		color: #84988e;
		font-size: 11px;
	}
	.review-card b {
		color: #6b916c;
		font-size: 10px;
		font-weight: 700;
		margin-top: 7px;
		text-transform: uppercase;
	}
	.next-step {
		align-items: center;
		background: #eef6de;
		border-radius: 10px;
		display: flex;
		justify-content: space-between;
		gap: 16px;
		padding: 18px;
	}
	.next-step p:not(.eyebrow) {
		color: #729080;
		font-size: 12px;
		margin-bottom: 0;
	}
	.next-step .eyebrow {
		margin-bottom: 6px;
	}
	.link-button {
		white-space: nowrap;
	}
	@media (max-width: 900px) {
		.step-grid {
			grid-template-columns: 1fr;
		}
		.mode-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 700px) {
		.registration-intro,
		.stage-toolbar,
		.stage-footer,
		.inventory-context,
		.next-step {
			align-items: flex-start;
			flex-direction: column;
		}
		.steps {
			grid-template-columns: repeat(2, 1fr);
		}
		.two,
		.three,
		.review-grid,
		.space-actions {
			grid-template-columns: 1fr;
		}
		.panel,
		.workflow-stage {
			padding: 18px;
		}
		.setup-note {
			display: none;
		}
		.stage-footer .primary,
		.next-step .primary {
			width: 100%;
		}
	}
	@media (max-width: 480px) {
		.steps button {
			padding: 10px;
		}
		.steps small {
			display: none;
		}
		.property-selector button {
			min-width: 100%;
		}
	}
</style>
