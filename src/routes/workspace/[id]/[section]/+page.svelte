<script lang="ts">
	import WorkspaceChrome from '$lib/components/WorkspaceChrome.svelte';
	import PropertyRegistrationWizard from '$lib/components/PropertyRegistrationWizard.svelte';
	import PropertiesOverview from '$lib/components/PropertiesOverview.svelte';
	import LocationPicker from '$lib/components/LocationPicker.svelte';
	import PortfolioMap from '$lib/components/PortfolioMap.svelte';
	import MaintenanceWorkspace from '$lib/components/MaintenanceWorkspace.svelte';
	import MaintenanceVendorDirectory from '$lib/components/MaintenanceVendorDirectory.svelte';
	import FinanceWorkspace from '$lib/components/FinanceWorkspace.svelte';
	import PeopleLeasesWorkspace from '$lib/components/PeopleLeasesWorkspace.svelte';
	import ReportsWorkspace from '$lib/components/ReportsWorkspace.svelte';
	import SupportWorkspace from '$lib/components/SupportWorkspace.svelte';
	import { resolve } from '$app/paths';

	let { data, form } = $props();
	const money = (amount: number | string | null | undefined) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: data.organization.currency_code
		}).format(Number(amount ?? 0));
	const personName = (id: string | null | undefined) => {
		const person = data.people.find((item: { id: string }) => item.id === id);
		return person ? `${person.first_name} ${person.last_name}` : 'Unassigned';
	};
	const spaceName = (id: string | null | undefined) => {
		const space = data.spaces.find((item: { id: string }) => item.id === id);
		return space?.name ?? 'Space not found';
	};
	const propertyName = (id: string | null | undefined) => {
		const property = data.properties.find((item: { id: string }) => item.id === id);
		return property?.name ?? 'Property not found';
	};
	const primaryTenant = (tenancyId: string) => {
		const party = data.parties.find(
			(item: { tenancy_id: string; role: string }) =>
				item.tenancy_id === tenancyId && item.role === 'primary'
		);
		return party ? personName(party.person_id) : 'Tenant not linked';
	};
	const total = (records: { amount: number | string }[]) =>
		records.reduce((sum, item) => sum + Number(item.amount), 0);
</script>

<svelte:head><title>{data.section.title} · {data.organization.name} · Musha</title></svelte:head>

<WorkspaceChrome
	organization={data.organization}
	modules={data.modules}
	active={data.sectionKey}
	role={data.membership.role}
	supportMode={data.supportMode}
>
	{#if !['properties', 'new-property', 'finance', 'people', 'tenants', 'new-tenant', 'leases', 'documents', 'move-outs', 'vendors'].includes(data.sectionKey)}
		<section class="heading">
			<div>
				<p class="eyebrow">{data.section.eyebrow}</p>
				<h1>{data.section.title}<span>.</span></h1>
				<p>{data.section.copy}</p>
			</div>
			<span class="role">{data.membership.role}</span>
		</section>
	{/if}
	{#if form?.message}<div class:failure={!form.success} class="notice">{form.message}</div>{/if}

	{#if data.sectionKey === 'new-property'}
		<PropertyRegistrationWizard
			organization={data.organization}
			properties={data.properties}
			spaces={data.spaces}
			form={form ?? undefined}
		/>
		<div class="legacy-portfolio">
			<div class="section-grid portfolio-grid">
				<section class="panel form-panel">
					<div class="panel-heading">
						<div>
							<p class="eyebrow">New location</p>
							<h2>Add a property</h2>
							<p>Record the address and pin it on the map for an accurate portfolio view.</p>
						</div>
					</div>
					<form method="POST" action="?/addProperty" class="form-stack">
						<div class="form-grid two">
							<label
								>Property name<input
									name="name"
									required
									placeholder="e.g. Emerald Hill House"
								/></label
							><label>Reference / code<input name="code" placeholder="EMH-01" /></label>
						</div>
						<label
							>Street address<input name="address_line_1" placeholder="12 Example Road" /></label
						>
						<div class="form-grid three">
							<label>City<input name="city" placeholder="Harare" /></label><label
								>Country<input name="country" placeholder="Zimbabwe" /></label
							><label>Postal code<input name="postal_code" placeholder="Optional" /></label>
						</div>
						<LocationPicker />
						<button class="primary" type="submit">Add property <span>→</span></button>
					</form>
				</section>
				<section class="panel map-panel">
					<div class="panel-heading">
						<div>
							<p class="eyebrow">Portfolio map</p>
							<h2>Where your properties are</h2>
							<p>Mapped locations appear here and scale to your portfolio.</p>
						</div>
						<span class="count"
							>{data.properties.filter(
								(property: { latitude: unknown; longitude: unknown }) =>
									property.latitude && property.longitude
							).length} pinned</span
						>
					</div>
					<PortfolioMap properties={data.properties} />
				</section>
			</div>
			<section class="panel inventory-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Rentable inventory</p>
						<h2>Build spaces, rooms and beds</h2>
						<p>
							A house can be a unit; add rooms underneath it, then beds underneath rooms when each
							occupant pays separately.
						</p>
					</div>
					<span class="count">{data.spaces.length} spaces</span>
				</div>
				<form method="POST" action="?/addSpace" class="form-stack space-form">
					<div class="form-grid three">
						<label
							>Property<select name="property_id" required
								><option value="">Choose a property</option
								>{#each data.properties as property (property.id)}<option value={property.id}
										>{property.name}</option
									>{/each}</select
							></label
						><label
							>Parent space <small>Optional</small><select name="parent_space_id"
								><option value="">Top-level space</option
								>{#each data.spaces as space (space.id)}<option value={space.id}
										>{space.name} · {space.kind}</option
									>{/each}</select
							></label
						><label
							>Space type<select name="kind"
								><option value="unit">Unit / house</option><option value="room">Room</option><option
									value="bed">Bed</option
								><option value="office">Office</option><option value="shop">Shop</option><option
									value="listing">Listing</option
								></select
							></label
						>
					</div>
					<div class="form-grid three">
						<label>Name / number<input name="name" required placeholder="Room 1" /></label><label
							>Code<input name="code" placeholder="R-01" /></label
						><label>Floor / block<input name="floor_label" placeholder="Ground floor" /></label>
					</div>
					<div class="form-grid four">
						<label>Bedrooms<input name="bedrooms" type="number" min="0" placeholder="3" /></label
						><label
							>Bathrooms<input
								name="bathrooms"
								type="number"
								min="0"
								step="0.5"
								placeholder="1"
							/></label
						><label>Capacity<input name="capacity" type="number" min="1" placeholder="1" /></label
						><label
							>Area m²<input
								name="area_sqm"
								type="number"
								min="0"
								step="0.01"
								placeholder="Optional"
							/></label
						>
					</div>
					<div class="form-grid two">
						<label
							>Monthly rent ({data.organization.currency_code})<input
								name="monthly_rent"
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
							/></label
						><label
							>Deposit ({data.organization.currency_code})<input
								name="deposit_amount"
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
							/></label
						>
					</div>
					<button class="primary" type="submit">Add rentable space <span>→</span></button>
				</form>
			</section>
			<section class="panel records-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Portfolio register</p>
						<h2>Properties and their spaces</h2>
					</div>
				</div>
				{#if data.properties.length === 0}<div class="empty">
						<strong>No properties yet.</strong>
						<p>Start by adding your first managed location.</p>
					</div>{:else}<div class="property-register">
						{#each data.properties as property (property.id)}<article class="property-row">
								<div class="property-row-heading">
									<div>
										<strong>{property.name}</strong><small
											>{property.address_line_1 ??
												property.city ??
												'Address not captured'}{property.country
												? ` · ${property.country}`
												: ''}</small
										>
									</div>
									<form method="POST" action="?/updatePropertyStatus" class="status-form">
										<input type="hidden" name="property_id" value={property.id} /><select
											name="status"
											value={property.status}
											onchange={(event) => event.currentTarget.form?.requestSubmit()}
											><option value="active">Active</option><option value="inactive"
												>Inactive</option
											></select
										>
									</form>
								</div>
								<div class="space-chips">
									{#each data.spaces.filter((space: { property_id: string }) => space.property_id === property.id) as space (space.id)}<span
											class:occupied={space.status === 'occupied'}
											>{space.kind} · {space.name}{space.parent_space_id ? ' ↳ nested' : ''}</span
										>{/each}{#if data.spaces.filter((space: { property_id: string }) => space.property_id === property.id).length === 0}<em
											>No spaces added</em
										>{/if}
								</div>
							</article>{/each}
					</div>{/if}
			</section>
		</div>
	{:else if data.sectionKey === 'properties'}
		<PropertiesOverview
			organization={data.organization}
			properties={data.properties}
			spaces={data.spaces}
		/>
	{:else if data.sectionKey === 'people' || data.sectionKey === 'tenants' || data.sectionKey === 'new-tenant' || data.sectionKey === 'leases' || data.sectionKey === 'documents' || data.sectionKey === 'move-outs'}
		<PeopleLeasesWorkspace {data} active={data.sectionKey} profileId={data.profileId} {form} />
		<div class="legacy-people">
			<div class="section-grid">
				<section class="panel form-panel">
					<div class="panel-heading">
						<div>
							<p class="eyebrow">People register</p>
							<h2>Add a person</h2>
							<p>
								Use tenants for renters and occupiers, then attach guardians or contacts to leases
								as needed.
							</p>
						</div>
						<span class="count">{data.people.length}</span>
					</div>
					<form method="POST" action="?/addPerson" class="form-stack">
						<div class="form-grid three">
							<label
								>Person type<select name="person_type"
									><option value="tenant">Tenant / occupier</option><option value="guardian"
										>Guardian</option
									><option value="contact">Emergency contact</option><option value="supplier"
										>Supplier</option
									></select
								></label
							><label>First name<input name="first_name" required /></label><label
								>Last name<input name="last_name" required /></label
							>
						</div>
						<div class="form-grid three">
							<label>Email<input name="email" type="email" /></label><label
								>Mobile number<input name="phone" type="tel" /></label
							><label>ID / passport number<input name="id_number" /></label>
						</div>
						<div class="form-grid three">
							<label>Date of birth<input name="date_of_birth" type="date" /></label><label
								>City<input name="city" /></label
							><label>Country<input name="country" /></label>
						</div>
						<label
							>Notes<textarea
								name="notes"
								rows="3"
								placeholder="Emergency contact, employment or other useful context"
							></textarea></label
						><button class="primary" type="submit">Add person <span>→</span></button>
					</form>
					<div class="portal-access-box">
						<p class="eyebrow">Tenant portal</p>
						<h3>Provision tenant access</h3>
						<p class="muted">
							Send a secure sign-in invitation or link an existing account to a tenant record.
						</p>
						<form method="POST" action="?/createTenantPortalAccess" class="form-stack">
							<label
								>Tenant<select name="person_id" required
									><option value="">Choose tenant</option
									>{#each data.people.filter((person: { person_type: string }) => person.person_type === 'tenant') as person (person.id)}<option
											value={person.id}
											>{person.first_name} {person.last_name} · {person.email ?? 'No email'}</option
										>{/each}</select
								></label
							>
							<button class="secondary" type="submit">Create portal access <span>→</span></button>
						</form>
					</div>
				</section>
				<section class="panel form-panel">
					<div class="panel-heading">
						<div>
							<p class="eyebrow">Occupancy & rent</p>
							<h2>Create a tenancy</h2>
							<p>
								Each tenancy links a primary person to the exact house, room, bed, office or shop
								they occupy.
							</p>
						</div>
						<span class="count">{data.tenancies.length}</span>
					</div>
					{#if data.people.length === 0 || data.spaces.length === 0}<div class="empty compact">
							<strong>Add people and spaces first.</strong>
							<p>Then create the lease and rent plan here.</p>
						</div>{:else}<form method="POST" action="?/createTenancy" class="form-stack">
							<div class="form-grid two">
								<label
									>Primary tenant / occupier<select name="person_id" required
										><option value="">Choose person</option
										>{#each data.people as person (person.id)}<option value={person.id}
												>{person.first_name} {person.last_name} · {person.person_type}</option
											>{/each}</select
									></label
								><label
									>Rentable space<select name="space_id" required
										><option value="">Choose space</option
										>{#each data.spaces as space (space.id)}<option value={space.id}
												>{space.name} · {space.kind} · {propertyName(space.property_id)}</option
											>{/each}</select
									></label
								>
							</div>
							<div class="form-grid three">
								<label
									>Lease reference<input name="lease_reference" placeholder="LEASE-001" /></label
								><label>Start date<input name="start_date" type="date" required /></label><label
									>End date<input name="end_date" type="date" /></label
								>
							</div>
							<div class="form-grid four">
								<label
									>Monthly / periodic rent<input
										name="rent_amount"
										type="number"
										min="0"
										step="0.01"
										required
									/></label
								><label
									>Deposit<input name="deposit_amount" type="number" min="0" step="0.01" /></label
								><label
									>Billing<select name="billing_frequency"
										><option value="monthly">Monthly</option><option value="weekly">Weekly</option
										><option value="quarterly">Quarterly</option><option value="annual"
											>Annual</option
										><option value="custom">Custom</option></select
									></label
								><label
									>Due day<input
										name="rent_due_day"
										type="number"
										min="1"
										max="31"
										placeholder="1"
									/></label
								>
							</div>
							<div class="form-grid two">
								<label
									>Notice period (days)<input
										name="notice_period_days"
										type="number"
										min="0"
										placeholder="30"
									/></label
								><label
									>Initial status<select name="status"
										><option value="active">Active</option><option value="draft">Draft</option
										></select
									></label
								>
							</div>
							<label
								>Lease notes<textarea
									name="notes"
									rows="3"
									placeholder="Special terms, utilities, renewal notes"></textarea></label
							><button class="primary" type="submit"
								>Create tenancy & rent schedule <span>→</span></button
							>
						</form>{/if}
				</section>
			</div>
			<section class="panel records-panel document-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Document register</p>
						<h2>Lease and tenant documents</h2>
						<p>
							Upload approved agreements, IDs, inspection records and supporting files. Tenants only
							see approved documents linked to them.
						</p>
					</div>
					<span class="count">{data.documents.length}</span>
				</div>
				<form
					method="POST"
					action="?/uploadDocument"
					enctype="multipart/form-data"
					class="form-grid four"
				>
					<label
						>Tenant<select name="person_id" required
							><option value="">Choose tenant</option
							>{#each data.people.filter((person: { person_type: string }) => person.person_type === 'tenant') as person (person.id)}<option
									value={person.id}>{person.first_name} {person.last_name}</option
								>{/each}</select
						></label
					>
					<label
						>Document type<select name="document_type"
							><option value="lease">Lease agreement</option><option value="identity"
								>Identity document</option
							><option value="inspection">Inspection report</option><option value="other"
								>Other</option
							></select
						></label
					>
					<label
						>Expiry date <small class="optional">Optional</small><input
							name="expires_on"
							type="date"
						/></label
					>
					<label
						>File<input
							name="file"
							type="file"
							accept="application/pdf,image/jpeg,image/png,image/webp"
							required
						/></label
					>
					<button class="primary" type="submit">Upload document <span>→</span></button>
				</form>
				{#if data.documents.length}<div class="record-list document-list">
						{#each data.documents.slice(0, 10) as document (document.id)}<div class="record">
								<span class="record-icon">↗</span>
								<div>
									<strong>{document.file_name}</strong><small
										>{document.document_type} · {document.approval_status} · {document.expires_on ??
											'No expiry'}</small
									>
								</div>
								{#if document.url}<a
										class="text-button"
										href={document.url}
										target="_blank"
										rel="noreferrer">View →</a
									>{/if}
							</div>{/each}
					</div>{/if}
			</section>
			<section class="panel records-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Current records</p>
						<h2>People and lease register</h2>
					</div>
				</div>
				<div class="split-records">
					<div>
						<h3>People</h3>
						{#if data.people.length === 0}<p class="muted">
								No people recorded yet.
							</p>{:else}{#each data.people as person (person.id)}<div class="record">
									<span class="record-icon"
										>{person.first_name.slice(0, 1)}{person.last_name.slice(0, 1)}</span
									>
									<div>
										<strong>{person.first_name} {person.last_name}</strong><small
											>{person.person_type} · {person.phone ??
												person.email ??
												'No contact details'}</small
										>
									</div>
								</div>{/each}{/if}
					</div>
					<div>
						<h3>Tenancies</h3>
						{#if data.tenancies.length === 0}<p class="muted">
								No tenancy records yet.
							</p>{:else}{#each data.tenancies as tenancy (tenancy.id)}<div class="record">
									<span class="record-icon">⌂</span>
									<div>
										<strong>{primaryTenant(tenancy.id)} · {spaceName(tenancy.space_id)}</strong
										><small
											>{tenancy.start_date}
											{tenancy.end_date ? `to ${tenancy.end_date}` : 'onwards'} · {money(
												tenancy.rent_amount
											)}
											{tenancy.billing_frequency}</small
										>
									</div>
									<span class="status">{tenancy.status}</span>
								</div>{/each}{/if}
					</div>
				</div>
			</section>
		</div>
	{:else if data.sectionKey === 'finance'}
		<FinanceWorkspace {data} />
		<div class="legacy-finance">
			<div class="metric-row">
				<div>
					<span>Total charges</span><strong>{money(total(data.charges))}</strong><small
						>{data.charges.length} ledger entries</small
					>
				</div>
				<div>
					<span>Payments recorded</span><strong>{money(total(data.payments))}</strong><small
						>{data.payments.length} receipts</small
					>
				</div>
				<div class:attention={total(data.charges) > total(data.payments)}>
					<span>Unallocated picture</span><strong
						>{money(total(data.charges) - total(data.payments))}</strong
					><small>Charges less payments</small>
				</div>
			</div>
			<div class="section-grid">
				<section class="panel form-panel">
					<div class="panel-heading">
						<div>
							<p class="eyebrow">Money due</p>
							<h2>Add a charge</h2>
							<p>Record rent, deposits, utilities and one-off fees against a tenancy.</p>
						</div>
					</div>
					{#if data.tenancies.length === 0}<div class="empty compact">
							<strong>Create a tenancy first.</strong>
							<p>Charges are kept against the relevant occupier and space.</p>
						</div>{:else}<form method="POST" action="?/addCharge" class="form-stack">
							<label
								>Tenancy<select name="tenancy_id" required
									><option value="">Choose tenancy</option
									>{#each data.tenancies as tenancy (tenancy.id)}<option value={tenancy.id}
											>{primaryTenant(tenancy.id)} · {spaceName(tenancy.space_id)}</option
										>{/each}</select
								></label
							>
							<div class="form-grid three">
								<label
									>Type<select name="charge_type"
										><option value="rent">Rent</option><option value="deposit">Deposit</option
										><option value="utility">Utility</option><option value="fee">Fee</option><option
											value="other">Other</option
										></select
									></label
								><label
									>Description<input
										name="description"
										required
										placeholder="October rent"
									/></label
								><label>Due date<input name="due_on" type="date" required /></label>
							</div>
							<label
								>Amount ({data.organization.currency_code})<input
									name="amount"
									type="number"
									min="0"
									step="0.01"
									required
								/></label
							><button class="primary" type="submit">Add charge <span>→</span></button>
						</form>{/if}
				</section>
				<section class="panel form-panel">
					<div class="panel-heading">
						<div>
							<p class="eyebrow">Money received</p>
							<h2>Record a payment</h2>
							<p>Capture the date, method, reference and amount as funds arrive.</p>
						</div>
					</div>
					<form method="POST" action="?/recordPayment" class="form-stack">
						<div class="form-grid two">
							<label
								>Tenancy<select name="tenancy_id"
									><option value="">Not linked to a tenancy</option
									>{#each data.tenancies as tenancy (tenancy.id)}<option value={tenancy.id}
											>{primaryTenant(tenancy.id)} · {spaceName(tenancy.space_id)}</option
										>{/each}</select
								></label
							><label
								>Payer<select name="payer_person_id"
									><option value="">Choose payer</option
									>{#each data.people as person (person.id)}<option value={person.id}
											>{person.first_name} {person.last_name}</option
										>{/each}</select
								></label
							>
						</div>
						<div class="form-grid three">
							<label
								>Amount<input name="amount" type="number" min="0.01" step="0.01" required /></label
							><label>Payment date<input name="payment_date" type="date" required /></label><label
								>Method<select name="method"
									><option value="bank_transfer">Bank transfer</option><option value="cash"
										>Cash</option
									><option value="mobile_money">Mobile money</option><option value="card"
										>Card</option
									><option value="manual">Manual</option><option value="other">Other</option
									></select
								></label
							>
						</div>
						<label
							>Reference<input
								name="reference"
								placeholder="Receipt / transaction reference"
							/></label
						><label class="toggle"
							><input name="generate_receipt" type="checkbox" checked /><span
								><strong>Generate a receipt</strong><small
									>Create the branded receipt and queue an email when an address is available.</small
								></span
							></label
						><button class="primary" type="submit">Record payment <span>→</span></button>
					</form>
				</section>
			</div>
			<section class="panel records-panel">
				<div class="split-records">
					<div>
						<h3>Latest charges</h3>
						{#if data.charges.length === 0}<p class="muted">
								No charges recorded.
							</p>{:else}{#each data.charges.slice(0, 8) as charge (charge.id)}<div class="record">
									<span class="record-icon">$</span>
									<div>
										<strong>{charge.description}</strong><small
											>{charge.due_on} · {primaryTenant(charge.tenancy_id)}</small
										>
									</div>
									<b>{money(charge.amount)}</b>
								</div>{/each}{/if}
					</div>
					<div>
						<h3>Latest payments</h3>
						{#if data.payments.length === 0}<p class="muted">
								No payments recorded.
							</p>{:else}{#each data.payments.slice(0, 8) as payment (payment.id)}<div
									class="record"
								>
									<span class="record-icon">✓</span>
									<div>
										<strong>{personName(payment.payer_person_id)}</strong><small
											>{payment.payment_date} · {payment.method}</small
										>
									</div>
									<b>{money(payment.amount)}</b>
								</div>{/each}{/if}
					</div>
				</div>
			</section>
			<section class="panel records-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Billing documents</p>
						<h2>Invoices and receipts</h2>
						<p>
							Generate a document from the ledger, then hand it to the tenant or queue it for email
							delivery.
						</p>
					</div>
				</div>
				{#if data.billingDocuments.length === 0}<p class="muted">
						No invoices or receipts have been generated yet.
					</p>{:else}<div class="record-list">
						{#each data.billingDocuments as document (document.id)}<div class="record">
								<span class="record-icon">{document.document_type === 'receipt' ? '✓' : '#'}</span>
								<div>
									<strong>{document.document_number}</strong><small
										>{document.document_type} · {document.issue_date} · {document.status}</small
									>
								</div>
								<b>{money(document.total_amount)}</b><a
									class="text-button"
									href={resolve(`/workspace/${data.organization.id}/documents/${document.id}`)}
									target="_blank"
									rel="noreferrer">Print →</a
								>
							</div>{/each}
					</div>{/if}
				<div class="document-actions">
					{#each data.charges.slice(0, 6) as charge (charge.id)}<form
							method="POST"
							action="?/generateInvoice"
						>
							<input type="hidden" name="charge_id" value={charge.id} /><button
								class="text-button"
								type="submit">Invoice {charge.description} →</button
							>
						</form>{/each}
					{#each data.payments.slice(0, 6) as payment (payment.id)}<form
							method="POST"
							action="?/generateReceipt"
						>
							<input type="hidden" name="payment_id" value={payment.id} /><button
								class="text-button"
								type="submit">Receipt {payment.reference || payment.payment_date} →</button
							>
						</form>{/each}
				</div>
			</section>
		</div>
	{:else if data.sectionKey === 'maintenance' && false}
		<div class="section-grid">
			<section class="panel form-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">New request</p>
						<h2>Log maintenance</h2>
						<p>Capture an issue against the property and, where useful, the exact room or unit.</p>
					</div>
					<span class="count">{data.maintenance.length} total</span>
				</div>
				{#if data.properties.length === 0}<div class="empty compact">
						<strong>Add a property first.</strong>
						<p>Requests need a location so your team can respond clearly.</p>
					</div>{:else}<form method="POST" action="?/createMaintenance" class="form-stack">
						<div class="form-grid two">
							<label
								>Property<select name="property_id" required
									><option value="">Choose property</option
									>{#each data.properties as property (property.id)}<option value={property.id}
											>{property.name}</option
										>{/each}</select
								></label
							><label
								>Space <small>Optional</small><select name="space_id"
									><option value="">Whole property</option
									>{#each data.spaces as space (space.id)}<option value={space.id}
											>{space.name} · {propertyName(space.property_id)}</option
										>{/each}</select
								></label
							>
						</div>
						<div class="form-grid two">
							<label
								>Issue title<input name="title" required placeholder="Leaking kitchen tap" /></label
							><label
								>Priority<select name="priority"
									><option value="low">Low</option><option value="normal" selected>Normal</option
									><option value="high">High</option><option value="urgent">Urgent</option></select
								></label
							>
						</div>
						<label
							>Description<textarea
								name="description"
								rows="4"
								placeholder="What happened, when it was noticed, and any access notes"
							></textarea></label
						><label
							>Estimated cost ({data.organization.currency_code})<input
								name="estimated_cost"
								type="number"
								min="0"
								step="0.01"
							/></label
						><button class="primary" type="submit">Log maintenance request <span>→</span></button>
					</form>{/if}
			</section>
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Request board</p>
						<h2>Move work forward</h2>
						<p>Every status change remains attached to the original request.</p>
					</div>
				</div>
				<div class="request-list">
					{#if data.maintenance.length === 0}<div class="empty compact">
							<strong>Your request board is clear.</strong>
							<p>New work orders will appear here.</p>
						</div>{:else}{#each data.maintenance as request (request.id)}<article class="request">
								<div>
									<strong>{request.title}</strong><small
										>{propertyName(request.property_id)}{request.space_id
											? ` · ${spaceName(request.space_id)}`
											: ''} · {request.priority} priority</small
									>
								</div>
								<form method="POST" action="?/updateMaintenanceStatus">
									<input type="hidden" name="request_id" value={request.id} /><select
										name="status"
										value={request.status}
										onchange={(event) => event.currentTarget.form?.requestSubmit()}
										>{#each ['reported', 'triage', 'assigned', 'in_progress', 'awaiting_approval', 'completed', 'closed'] as status (status)}<option
												value={status}>{status.replaceAll('_', ' ')}</option
											>{/each}</select
									>
								</form>
							</article>{/each}{/if}
				</div>
			</section>
		</div>
	{:else if data.sectionKey === 'vendors'}
		<MaintenanceVendorDirectory {data} {form} />
	{:else if data.sectionKey === 'maintenance'}
		<MaintenanceWorkspace {data} {form} />
	{:else if data.sectionKey === 'support'}
		<SupportWorkspace tickets={data.supportTickets} attachments={data.supportTicketAttachments} {form} />
	{:else if data.sectionKey === 'reports' && false}
		<div class="metric-row">
			<div>
				<span>Portfolio</span><strong>{data.properties.length}</strong><small>properties</small>
			</div>
			<div>
				<span>Inventory</span><strong>{data.spaces.length}</strong><small
					>{data.spaces.filter((space: { status: string }) => space.status === 'occupied').length} occupied</small
				>
			</div>
			<div>
				<span>People</span><strong>{data.people.length}</strong><small
					>{data.tenancies.filter((tenancy: { status: string }) => tenancy.status === 'active')
						.length} active tenancies</small
				>
			</div>
			<div>
				<span>Collections</span><strong>{money(total(data.payments))}</strong><small
					>payments received</small
				>
			</div>
		</div>
		<div class="section-grid">
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Occupancy</p>
						<h2>Inventory snapshot</h2>
					</div>
				</div>
				<div class="table-list">
					{#each data.properties as property (property.id)}<div>
							<span>{property.name}</span><strong
								>{data.spaces.filter(
									(space: { property_id: string; status: string }) =>
										space.property_id === property.id && space.status === 'occupied'
								).length} / {data.spaces.filter(
									(space: { property_id: string }) => space.property_id === property.id
								).length} occupied</strong
							>
						</div>{:else}<p class="muted">Add properties and spaces to see occupancy.</p>{/each}
				</div>
			</section>
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Attention</p>
						<h2>Operating signals</h2>
					</div>
				</div>
				<div class="signal-list">
					<div>
						<span>Open maintenance</span><strong
							>{data.maintenance.filter(
								(request: { status: string }) => !['completed', 'closed'].includes(request.status)
							).length}</strong
						>
					</div>
					<div>
						<span>Charges not matched by payments</span><strong
							>{money(Math.max(0, total(data.charges) - total(data.payments)))}</strong
						>
					</div>
					<div>
						<span>Unmapped properties</span><strong
							>{data.properties.filter(
								(property: { latitude: unknown; longitude: unknown }) =>
									!property.latitude || !property.longitude
							).length}</strong
						>
					</div>
				</div>
			</section>
		</div>
	{:else if data.sectionKey === 'reports'}
		<ReportsWorkspace {data} />
	{:else if data.sectionKey === 'settings'}
		<div class="section-grid">
			<section class="panel form-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Organization profile</p>
						<h2>Operating defaults</h2>
						<p>
							These are shared across your client workspace and are visible to the Musha
							implementation team.
						</p>
					</div>
				</div>
				<form
					method="POST"
					action="?/updateSettings"
					enctype="multipart/form-data"
					class="form-stack"
				>
					<label
						>Organization name<input name="name" required value={data.organization.name} /></label
					>
					<div class="form-grid two">
						<label
							>Legal or registered name<input
								name="legal_name"
								value={data.workspaceSettings?.legal_name ?? ''}
								placeholder="Optional legal name"
							/></label
						>
						<label
							>Contact email<input
								name="contact_email"
								type="email"
								value={data.workspaceSettings?.contact_email ?? ''}
								placeholder="operations@example.com"
							/></label
						>
					</div>
					<div class="form-grid three">
						<label
							>Contact phone<input
								name="contact_phone"
								value={data.workspaceSettings?.contact_phone ?? ''}
								placeholder="+263 …"
							/></label
						>
						<label
							>City<input
								name="city"
								value={data.workspaceSettings?.city ?? ''}
								placeholder="Harare"
							/></label
						>
						<label
							>Country<input
								name="country"
								value={data.workspaceSettings?.country ?? ''}
								placeholder="Zimbabwe"
							/></label
						>
					</div>
					<label
						>Business address<input
							name="address_line_1"
							value={data.workspaceSettings?.address_line_1 ?? ''}
							placeholder="Registered or correspondence address"
						/></label
					>
					<div class="branding-box">
						<div>
							<strong>Organization branding</strong><small
								>Used on generated invoices and receipts.</small
							>
						</div>
						{#if data.brandingLogoUrl}<img
								src={data.brandingLogoUrl}
								alt="Current organization logo"
							/>{/if}
						<label
							>Upload logo<input
								name="logo"
								type="file"
								accept="image/png,image/jpeg,image/webp,image/svg+xml"
							/></label
						>
					</div>
					<div class="form-grid two">
						<label
							>Invoice prefix<input
								name="invoice_prefix"
								maxlength="12"
								value={data.workspaceSettings?.invoice_prefix ?? 'INV'}
							/></label
						>
						<label
							>Receipt prefix<input
								name="receipt_prefix"
								maxlength="12"
								value={data.workspaceSettings?.receipt_prefix ?? 'RCT'}
							/></label
						>
					</div>
					<label
						>Receipt and invoice footer<textarea
							name="receipt_footer"
							rows="2"
							placeholder="Thank you for your business."
							>{data.workspaceSettings?.receipt_footer ?? ''}</textarea
						></label
					>
					<label
						>Payment terms<textarea
							name="payment_terms"
							rows="2"
							placeholder="Rent is due on the agreed date. Late payments may attract a fee."
							>{data.workspaceSettings?.payment_terms ?? ''}</textarea
						></label
					>
					<div class="form-grid two">
						<label
							>Base currency<select name="currency_code" value={data.organization.currency_code}
								><option value="USD">USD — US Dollar</option><option value="ZIG"
									>ZiG — Zimbabwe Gold</option
								></select
							></label
						><label
							>Timezone<select name="timezone" value={data.organization.timezone}
								><option value="Africa/Harare">Africa/Harare</option><option
									value="Africa/Johannesburg">Africa/Johannesburg</option
								><option value="UTC">UTC</option></select
							></label
						>
					</div>
					<button class="primary" type="submit">Save workspace settings <span>→</span></button>
				</form>
			</section>
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Access & modules</p>
						<h2>Your workspace scope</h2>
						<p>
							Platform administrators allocate operating modules. Your internal team can use the
							pages relevant to those modules.
						</p>
					</div>
				</div>
				<div class="settings-list">
					<div><span>Workspace status</span><strong>{data.organization.status}</strong></div>
					<div><span>Team members</span><strong>{data.members.length}</strong></div>
					<div><span>Enabled modules</span><strong>{data.modules.length}</strong></div>
				</div>
				<div class="module-row">
					{#each data.modules as module (module.module_key)}<span
							>{module.module_key.replace('_', ' ')}</span
						>{/each}
				</div>
			</section>
		</div>
		<section class="panel security-panel"><div class="panel-heading"><div><p class="eyebrow">Account security</p><h2>Change your password</h2><p>Use a private password known only to you. Password changes are recorded in the workspace audit log.</p></div></div>{#if data.user?.user_metadata?.must_change_password}<div class="security-notice">This account is using a temporary password. Please choose a new one now.</div>{/if}{#if form?.message}<div class:failure={!form.success} class="security-notice">{form.message}</div>{/if}<form method="POST" action="?/changePassword" class="form-stack"><div class="form-grid two"><label>New password<input name="new_password" type="password" minlength="8" required autocomplete="new-password" placeholder="At least 8 characters" /></label><label>Confirm password<input name="confirm_password" type="password" minlength="8" required autocomplete="new-password" placeholder="Repeat the new password" /></label></div><button class="primary" type="submit">Update password <span>→</span></button></form></section>
		<div class="section-grid settings-grid">
			<section class="panel form-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Collections</p>
						<h2>Rent and payment defaults</h2>
						<p>Set the operating rules your team follows when collecting rent.</p>
					</div>
				</div>
				<form method="POST" action="?/updateCollectionDefaults" class="form-stack">
					<div class="form-grid three">
						<label
							>Default rent due day<input
								name="default_rent_due_day"
								type="number"
								min="1"
								max="31"
								value={data.workspaceSettings?.default_rent_due_day ?? ''}
								placeholder="1"
							/></label
						>
						<label
							>Grace period (days)<input
								name="grace_period_days"
								type="number"
								min="0"
								value={data.workspaceSettings?.grace_period_days ?? 0}
							/></label
						>
						<label
							>Late fee ({data.organization.currency_code})<input
								name="late_fee_amount"
								type="number"
								min="0"
								step="0.01"
								value={data.workspaceSettings?.late_fee_amount ?? 0}
							/></label
						>
					</div>
					<div class="form-grid two">
						<label
							>Invoice lead time (days)<input
								name="default_invoice_lead_days"
								type="number"
								min="0"
								max="90"
								value={data.workspaceSettings?.default_invoice_lead_days ?? 7}
							/></label
						><label
							>Default notice period (days)<input
								name="default_notice_period_days"
								type="number"
								min="0"
								max="365"
								value={data.workspaceSettings?.default_notice_period_days ?? 30}
							/></label
						>
					</div>
					<label class="toggle compact-toggle"
						><input
							name="auto_generate_rent_invoices"
							type="checkbox"
							checked={data.workspaceSettings?.auto_generate_rent_invoices ?? true}
						/><span
							><strong>Automatically generate recurring rent invoices</strong><small
								>New checked-in leases inherit this rule and are invoiced by the daily job.</small
							></span
						></label
					>
					<label
						>Payment reference prefix<input
							name="payment_reference_prefix"
							value={data.workspaceSettings?.payment_reference_prefix ?? ''}
							placeholder="e.g. MUSHA-REC"
						/></label
					>
					<label
						>Payment instructions<textarea
							name="payment_instructions"
							rows="4"
							placeholder="Bank account, mobile money number, or internal instructions"
							>{data.workspaceSettings?.payment_instructions ?? ''}</textarea
						></label
					>
					<button class="primary" type="submit">Save collection defaults <span>→</span></button>
				</form>
			</section>
			<section class="panel form-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Notifications</p>
						<h2>Operating alerts</h2>
						<p>Choose which operational reminders should be active for this workspace.</p>
					</div>
				</div>
				<form method="POST" action="?/updateNotifications" class="form-stack toggle-stack">
					<label class="toggle"
						><input
							name="send_rent_reminders"
							type="checkbox"
							checked={data.workspaceSettings?.send_rent_reminders ?? true}
						/><span
							><strong>Rent reminders</strong><small
								>Prompt the team before scheduled rent is due.</small
							></span
						></label
					>
					<label class="toggle"
						><input
							name="send_maintenance_updates"
							type="checkbox"
							checked={data.workspaceSettings?.send_maintenance_updates ?? true}
						/><span
							><strong>Maintenance updates</strong><small
								>Keep the team aware when a request changes status.</small
							></span
						></label
					>
					<label class="toggle"
						><input
							name="send_lease_expiry_alerts"
							type="checkbox"
							checked={data.workspaceSettings?.send_lease_expiry_alerts ?? true}
						/><span
							><strong>Lease expiry alerts</strong><small
								>Surface agreements that are approaching their end date.</small
							></span
						></label
					>
					<label class="toggle"
						><input
							name="send_invoice_notifications"
							type="checkbox"
							checked={data.workspaceSettings?.send_invoice_notifications ?? true}
						/><span
							><strong>Invoice notifications</strong><small
								>Queue invoice delivery when a tenant has an email or WhatsApp number.</small
							></span
						></label
					>
					<label class="toggle"
						><input
							name="send_payment_receipts"
							type="checkbox"
							checked={data.workspaceSettings?.send_payment_receipts ?? true}
						/><span
							><strong>Payment receipt notifications</strong><small
								>Keep receipt delivery opt-in while external email and WhatsApp services are
								connected.</small
							></span
						></label
					>
					<button class="primary" type="submit">Save notification preferences <span>→</span></button
					>
				</form>
			</section>
		</div>
		<section class="panel team-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Team access</p>
					<h2>People who can operate this workspace</h2>
					<p>
						Invite client staff and assign only the role they need. Ownership remains protected by
						the Musha platform team.
					</p>
				</div>
				<span class="count">{data.members.length} active</span>
			</div>
			<div class="section-grid team-grid">
				<form method="POST" action="?/inviteWorkspaceMember" class="invite-form">
					<div class="form-grid two">
						<label
							>Work email<input
								name="email"
								type="email"
								required
								placeholder="colleague@example.com"
							/></label
						><label
							>Role<select name="role"
								><option value="admin">Admin</option><option value="manager"
									>Property manager</option
								><option value="finance">Finance</option><option value="maintenance"
									>Maintenance</option
								><option value="viewer">Read-only viewer</option></select
							></label
						>
					</div>
					<button class="primary" type="submit">Invite team member <span>→</span></button>
				</form>
				<div class="security-card">
					<strong>Account security</strong>
					<p>
						Each colleague has their own secure login. Password recovery uses Musha authentication,
						never shared credentials.
					</p>
					<a href={resolve('/forgot-password')}>Reset your own password →</a>
				</div>
			</div>
			<div class="team-list">
				{#each data.members as member (member.user_id)}
					<article class="team-row">
						<div>
							<strong
								>{member.user_id === data.user.id
									? 'You'
									: `Workspace user · ${member.user_id.slice(0, 8)}`}</strong
							><small>Added {new Date(member.created_at).toLocaleDateString()}</small>
						</div>
						<form method="POST" action="?/updateWorkspaceMemberRole">
							<input type="hidden" name="user_id" value={member.user_id} /><select
								name="role"
								value={member.role}
								disabled={member.role === 'owner'}
								onchange={(event) => event.currentTarget.form?.requestSubmit()}
								>{#each ['admin', 'manager', 'finance', 'maintenance', 'viewer'] as role (role)}<option
										value={role}>{role}</option
									>{/each}</select
							>
						</form>
						{#if member.role !== 'owner' && member.user_id !== data.user.id}<form
								method="POST"
								action="?/removeWorkspaceMember"
							>
								<input type="hidden" name="user_id" value={member.user_id} /><button
									class="text-button"
									type="submit">Remove</button
								>
							</form>{/if}
					</article>
				{/each}
			</div>
			{#if data.invitations.length > 0}<div class="pending-invitations">
					<p class="eyebrow">Recent invitations</p>
					{#each data.invitations as invitation (invitation.id)}<div>
							<span>{invitation.email}</span><small>{invitation.role} · {invitation.status}</small>
						</div>{/each}
				</div>{/if}
		</section>
	{/if}
</WorkspaceChrome>

<style>
	.heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 30px;
	}
	.eyebrow {
		color: #718f82;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.15em;
		margin: 0 0 9px;
		text-transform: uppercase;
	}
	h1,
	h2,
	h3,
	p {
		margin-top: 0;
	}
	h1 {
		font-size: clamp(38px, 5vw, 62px);
		line-height: 0.95;
		letter-spacing: -0.08em;
		margin-bottom: 13px;
	}
	h1 span {
		color: var(--musha-lime);
	}
	h2 {
		font-size: 25px;
		letter-spacing: -0.06em;
		margin: 0 0 8px;
	}
	h3 {
		color: #406252;
		font-size: 14px;
		margin: 0 0 12px;
	}
	.heading > div > p:last-child,
	.panel-heading p:not(.eyebrow) {
		color: #718a7e;
		font-size: 14px;
		line-height: 1.55;
		margin-bottom: 0;
	}
	.role,
	.count,
	.status {
		border-radius: 99px;
		background: #edf4dc;
		color: #668a6d;
		font-size: 11px;
		padding: 7px 10px;
		text-transform: capitalize;
		white-space: nowrap;
	}
	.notice {
		border-radius: 8px;
		background: #e5f2e5;
		color: #376b4a;
		font-size: 13px;
		margin: -10px 0 18px;
		padding: 12px 15px;
	}
	.notice.failure {
		background: #fae9e5;
		color: #9a5548;
	}
	.section-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
		margin-bottom: 14px;
	}
	.portfolio-grid {
		align-items: start;
		grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
	}
	.panel {
		border: 1px solid #e1ebe2;
		border-radius: 12px;
		background: #fff;
		padding: 25px;
	}
	.panel-heading {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 15px;
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
	.four {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}
	label {
		display: grid;
		gap: 6px;
		color: #4d7060;
		font-size: 12px;
		font-weight: 700;
	}
	label small {
		color: #91a499;
		font-size: 10px;
		font-weight: 600;
	}
	input,
	select,
	textarea {
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		border: 1px solid #d9e7dc;
		border-radius: 7px;
		background: #fbfdfb;
		color: #204a3b;
		padding: 10px 11px;
		font: inherit;
		font-size: 13px;
	}
	textarea {
		resize: vertical;
	}
	.primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		width: fit-content;
		border: 0;
		border-radius: 7px;
		background: var(--musha-deep);
		color: #fff;
		cursor: pointer;
		font: inherit;
		font-size: 13px;
		font-weight: 800;
		padding: 12px 15px;
	}
	.primary span {
		color: var(--musha-lime);
		font-size: 17px;
	}
	.map-panel :global(.portfolio-map) {
		margin-top: 22px;
	}
	.inventory-panel,
	.records-panel {
		margin-bottom: 14px;
	}
	.space-form {
		max-width: 980px;
	}
	.property-register,
	.request-list {
		display: grid;
		gap: 9px;
	}
	.property-row {
		border: 1px solid #edf2ed;
		border-radius: 9px;
		padding: 14px;
	}
	.property-row-heading,
	.request {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.property-row strong,
	.property-row small,
	.request strong,
	.request small {
		display: block;
	}
	.property-row strong,
	.request strong {
		color: #345b4b;
		font-size: 14px;
	}
	.property-row small,
	.request small {
		color: #8a9e94;
		font-size: 11px;
		margin-top: 4px;
	}
	.status-form select,
	.request select {
		width: auto;
		font-size: 11px;
		padding: 6px 8px;
	}
	.space-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 12px;
	}
	.space-chips span {
		border-radius: 5px;
		background: #f0f5e9;
		color: #5a7b67;
		font-size: 10px;
		padding: 6px 7px;
	}
	.space-chips span.occupied {
		background: #e3f0e3;
		color: #397156;
	}
	.space-chips em {
		color: #9aa9a1;
		font-size: 11px;
		font-style: normal;
	}
	.split-records {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 25px;
	}
	.split-records > div + div {
		border-left: 1px solid #edf2ed;
		padding-left: 25px;
	}
	.record {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 0;
		border-top: 1px solid #edf2ed;
	}
	.record-icon {
		display: grid;
		place-items: center;
		width: 31px;
		height: 31px;
		flex: 0 0 31px;
		border-radius: 8px;
		background: #edf4dc;
		color: #5e8966;
		font-size: 11px;
		font-weight: 800;
	}
	.record > div {
		min-width: 0;
		flex: 1;
	}
	.record strong,
	.record small {
		display: block;
	}
	.record strong {
		color: #345b4b;
		font-size: 12px;
	}
	.record small {
		color: #8c9f95;
		font-size: 10px;
		line-height: 1.45;
		margin-top: 3px;
	}
	.record b {
		color: #406c56;
		font-size: 12px;
		white-space: nowrap;
	}
	.record .status {
		font-size: 9px;
		padding: 5px 7px;
	}
	.metric-row {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
		margin-bottom: 14px;
	}
	.metric-row > div {
		border: 1px solid #e1ebe2;
		border-radius: 10px;
		background: #fff;
		padding: 17px;
	}
	.metric-row > div.attention {
		background: #fbf5e6;
		border-color: #f0deb9;
	}
	.metric-row span,
	.metric-row small {
		display: block;
		color: #7a9287;
		font-size: 11px;
	}
	.metric-row strong {
		display: block;
		color: #244a3b;
		font-size: 27px;
		letter-spacing: -0.06em;
		margin: 10px 0 4px;
	}
	.empty {
		display: grid;
		place-content: center;
		min-height: 160px;
		border: 1px dashed #d9e7dc;
		border-radius: 8px;
		color: #789185;
		text-align: center;
	}
	.empty strong {
		color: #486b5b;
		font-size: 13px;
	}
	.empty p {
		font-size: 12px;
		margin: 5px 0 0;
	}
	.empty.compact {
		min-height: 130px;
	}
	.muted {
		color: #91a198;
		font-size: 12px;
	}
	.table-list,
	.signal-list,
	.settings-list {
		display: grid;
		gap: 8px;
	}
	.table-list div,
	.signal-list div,
	.settings-list div {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		border: 1px solid #edf2ed;
		border-radius: 7px;
		color: #728b80;
		font-size: 12px;
		padding: 12px;
	}
	.table-list strong,
	.signal-list strong,
	.settings-list strong {
		color: #426856;
		font-size: 12px;
	}
	.module-row {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
		margin-top: 18px;
	}
	.module-row span {
		border-radius: 99px;
		background: #eff5e6;
		color: #597668;
		font-size: 11px;
		font-weight: 700;
		padding: 7px 9px;
		text-transform: capitalize;
	}
	.settings-grid {
		align-items: start;
	}
	.toggle-stack {
		gap: 9px;
	}
	.toggle {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		border: 1px solid #e4eee5;
		border-radius: 8px;
		padding: 11px;
		cursor: pointer;
	}
	.toggle input {
		width: 17px;
		height: 17px;
		margin: 1px 0 0;
		accent-color: var(--musha-emerald);
	}
	.toggle span,
	.toggle strong,
	.toggle small {
		display: block;
	}
	.toggle strong {
		color: #365b4b;
		font-size: 12px;
	}
	.toggle small {
		color: #82958b;
		font-size: 11px;
		font-weight: 500;
		line-height: 1.4;
		margin-top: 3px;
	}
	.team-panel {
		margin-bottom: 14px;
	}
	.team-grid {
		align-items: center;
		margin-bottom: 20px;
	}
	.invite-form {
		display: grid;
		gap: 10px;
	}
	.security-card {
		border-radius: 9px;
		background: #f0f6e5;
		padding: 17px;
	}
	.security-card strong {
		color: #365b4b;
		font-size: 13px;
	}
	.security-card p {
		color: #6c8779;
		font-size: 12px;
		line-height: 1.55;
		margin: 6px 0 11px;
	}
	.security-card a {
		color: #356a52;
		font-size: 12px;
		font-weight: 800;
		text-decoration: none;
	}
	.team-list {
		display: grid;
		gap: 7px;
	}
	.team-row {
		display: grid;
		grid-template-columns: 1fr auto auto;
		align-items: center;
		gap: 12px;
		border: 1px solid #edf2ed;
		border-radius: 8px;
		padding: 11px 12px;
	}
	.team-row strong,
	.team-row small {
		display: block;
	}
	.team-row strong {
		color: #365b4b;
		font-size: 12px;
	}
	.team-row small {
		color: #8a9e94;
		font-size: 10px;
		margin-top: 3px;
	}
	.team-row select {
		width: auto;
		font-size: 11px;
		padding: 7px 9px;
	}
	.text-button {
		border: 0;
		background: transparent;
		color: #a15e4e;
		cursor: pointer;
		font: inherit;
		font-size: 11px;
		font-weight: 700;
	}
	.pending-invitations {
		display: grid;
		gap: 6px;
		margin-top: 20px;
		padding-top: 17px;
		border-top: 1px solid #edf2ed;
	}
	.pending-invitations > div {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		color: #486b5b;
		font-size: 12px;
	}
	.pending-invitations small {
		color: #8a9e94;
		font-size: 11px;
		text-transform: capitalize;
	}
	.portal-access-box {
		margin-top: 22px;
		padding-top: 18px;
		border-top: 1px solid #edf2ed;
	}
	.portal-access-box h3 {
		margin: 4px 0;
		font-size: 18px;
	}
	.portal-access-box .muted {
		margin: 4px 0 12px;
		font-size: 13px;
	}
	.secondary {
		border: 1px solid #b9d9c4;
		background: #edf4d7;
		color: #195c50;
		border-radius: 8px;
		padding: 10px 13px;
		font-weight: 700;
		cursor: pointer;
		justify-self: start;
	}
	.branding-box {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 12px;
		align-items: center;
		border: 1px solid #e5eee7;
		border-radius: 10px;
		padding: 12px;
		background: #fbfdf9;
	}
	.branding-box strong,
	.branding-box small {
		display: block;
	}
	.branding-box strong {
		color: #275b4a;
		font-size: 12px;
	}
	.branding-box small {
		color: #82958b;
		font-size: 11px;
		margin-top: 3px;
	}
	.branding-box img {
		width: 48px;
		height: 48px;
		object-fit: contain;
		border-radius: 8px;
		background: #fff;
	}
	.branding-box label {
		grid-column: 1 / -1;
	}
	.document-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 14px;
		margin-top: 18px;
		padding-top: 14px;
		border-top: 1px solid #edf2ed;
	}
	.legacy-portfolio {
		display: none;
	}
	.legacy-finance {
		display: none;
	}
	.legacy-people {
		display: none;
	}
	@media (max-width: 1050px) {
		.portfolio-grid {
			grid-template-columns: 1fr;
		}
		.four {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 760px) {
		.heading {
			align-items: start;
			flex-direction: column;
		}
		.section-grid,
		.split-records {
			grid-template-columns: 1fr;
		}
		.split-records > div + div {
			border-left: 0;
			border-top: 1px solid #edf2ed;
			padding: 20px 0 0;
		}
		.three {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.panel {
			padding: 18px;
		}
		.metric-row {
			grid-template-columns: 1fr 1fr;
		}
		.team-row {
			grid-template-columns: 1fr;
			align-items: start;
		}
		.team-row select {
			width: 100%;
		}
	}
	@media (max-width: 520px) {
		.two,
		.three,
		.four,
		.metric-row {
			grid-template-columns: 1fr;
		}
		.property-row-heading,
		.request {
			align-items: start;
			flex-direction: column;
		}
		.status-form select,
		.request select {
			width: 100%;
		}
	}
.security-panel{background:#f5faef;border-color:#d9e9ca;margin-top:14px}.security-notice{background:#e8f5df;border-radius:8px;color:#39704c;font-size:11px;margin:12px 0;padding:10px}.security-notice.failure{background:#fff0eb;color:#a35545}
</style>
