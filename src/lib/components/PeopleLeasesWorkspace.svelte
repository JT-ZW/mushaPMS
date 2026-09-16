<script lang="ts">
	import { resolve } from '$app/paths';

	type Person = {
		id: string;
		user_id?: string | null;
		person_type: string;
		first_name: string;
		last_name: string;
		email: string | null;
		phone: string | null;
		id_number: string | null;
		date_of_birth?: string | null;
		address_line_1?: string | null;
		city: string | null;
		country: string | null;
		notes: string | null;
	};
	type Property = { id: string; name: string };
	type Space = { id: string; property_id: string; name: string; kind: string; status: string };
	type Tenancy = {
		id: string;
		space_id: string;
		lease_reference?: string | null;
		status: string;
		start_date: string;
		end_date: string | null;
		rent_amount: number | string;
		deposit_amount: number | string;
		billing_frequency: string;
		rent_due_day?: number | null;
		notice_period_days?: number | null;
		move_in_at?: string | null;
		move_out_at?: string | null;
		notes: string | null;
	};
	type Party = { tenancy_id: string; person_id: string; role: string };
	type Charge = {
		id: string;
		tenancy_id: string;
		description: string;
		amount: number | string;
		due_on: string;
		status?: string;
	};
	type Payment = {
		id: string;
		tenancy_id: string | null;
		amount: number | string;
		payment_date: string;
		reference: string | null;
	};
	type Allocation = {
		payment_id: string;
		charge_id: string;
		amount: number | string;
		created_at?: string;
	};
	type Document = {
		id: string;
		person_id: string | null;
		tenancy_id: string | null;
		document_type: string;
		file_name: string;
		expires_on: string | null;
		approval_status: string;
		url: string | null;
	};
	type Maintenance = {
		id: string;
		reporter_person_id: string | null;
		title: string;
		status: string;
		priority: string;
		created_at: string;
	};
	type WorkspaceData = {
		organization: { id: string; name: string; currency_code: string };
		properties: Property[];
		spaces: Space[];
		people: Person[];
		tenancies: Tenancy[];
		parties: Party[];
		charges: Charge[];
		payments: Payment[];
		paymentAllocations: Allocation[];
		documents: Document[];
		maintenance: Maintenance[];
	};

	const props = $props<{
		data: WorkspaceData;
		active: string;
		profileId?: string | null;
		form?: { message?: string; success?: boolean } | null;
	}>();
	const data = $derived(props.data as WorkspaceData);
	const active = $derived(props.active);
	const profileId = $derived(props.profileId ?? '');
	const today = new Date().toISOString().slice(0, 10);
	let selectedPersonId = $state('');
	let profileOpen = $state(false);

	const tenantPeople = $derived(
		data.people.filter((person: Person) => person.person_type === 'tenant')
	);
	$effect(() => {
		if (profileId) {
			selectedPersonId = profileId;
			profileOpen = true;
		} else {
			selectedPersonId = '';
			profileOpen = false;
		}
	});
	const selectedPerson = $derived(
		tenantPeople.find((person: Person) => person.id === selectedPersonId) ?? null
	);
	const selectedTenancies = $derived(
		data.tenancies.filter((tenancy: Tenancy) =>
			data.parties.some(
				(party: Party) =>
					party.tenancy_id === tenancy.id &&
					party.person_id === selectedPersonId &&
					party.role === 'primary'
			)
		)
	);
	const selectedTenancyIds = $derived(
		new Set(selectedTenancies.map((tenancy: Tenancy) => tenancy.id))
	);
	const selectedDocuments = $derived(
		data.documents.filter(
			(document: Document) =>
				document.person_id === selectedPersonId ||
				(document.tenancy_id ? selectedTenancyIds.has(document.tenancy_id) : false)
		)
	);
	const selectedCharges = $derived(
		data.charges.filter((charge: Charge) => selectedTenancyIds.has(charge.tenancy_id))
	);
	const selectedPayments = $derived(
		data.payments.filter(
			(payment: Payment) => payment.tenancy_id && selectedTenancyIds.has(payment.tenancy_id)
		)
	);
	const selectedMaintenance = $derived(
		data.maintenance.filter(
			(request: Maintenance) => request.reporter_person_id === selectedPersonId
		)
	);
	const activeTenancies = $derived(
		data.tenancies.filter((tenancy: Tenancy) => tenancy.status === 'active')
	);
	const endedTenancies = $derived(
		data.tenancies.filter((tenancy: Tenancy) =>
			['completed', 'terminated', 'expired'].includes(tenancy.status)
		)
	);
	const expiringTenancies = $derived(
		activeTenancies.filter(
			(tenancy: Tenancy) =>
				tenancy.end_date &&
				tenancy.end_date <= new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
		)
	);
	const spaceName = (id: string) =>
		data.spaces.find((space: Space) => space.id === id)?.name ?? 'Space not found';
	const propertyName = (id: string) => {
		const space = data.spaces.find((item: Space) => item.id === id);
		return (
			data.properties.find((property: Property) => property.id === (space?.property_id ?? id))
				?.name ?? 'Property not found'
		);
	};
	const personName = (tenancyId: string) => {
		const party = data.parties.find(
			(item: Party) => item.tenancy_id === tenancyId && item.role === 'primary'
		);
		const person = data.people.find((item: Person) => item.id === party?.person_id);
		return person ? `${person.first_name} ${person.last_name}` : 'Tenant not linked';
	};
	const money = (value: number | string | null | undefined) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: data.organization.currency_code
		}).format(Number(value ?? 0));
	const amount = (value: number | string | null | undefined) => Number(value ?? 0);
	const allocationsForCharge = (chargeId: string) =>
		data.paymentAllocations
			.filter((item: Allocation) => item.charge_id === chargeId)
			.reduce((sum: number, item: Allocation) => sum + amount(item.amount), 0);
	const outstanding = (charge: Charge) =>
		Math.max(0, amount(charge.amount) - allocationsForCharge(charge.id));
	const tenancyBalance = (tenancyId: string) =>
		data.charges
			.filter((charge: Charge) => charge.tenancy_id === tenancyId && charge.status !== 'void')
			.reduce((sum: number, charge: Charge) => sum + outstanding(charge), 0);
	const performance = (personId: string) => {
		const tenancyIds = new Set(
			data.tenancies
				.filter((tenancy: Tenancy) =>
					data.parties.some(
						(party: Party) =>
							party.tenancy_id === tenancy.id &&
							party.person_id === personId &&
							party.role === 'primary'
					)
				)
				.map((tenancy: Tenancy) => tenancy.id)
		);
		const charges = data.charges.filter(
			(charge: Charge) =>
				tenancyIds.has(charge.tenancy_id) && charge.status !== 'void' && charge.status !== 'draft'
		);
		const billed = charges.reduce((sum: number, charge: Charge) => sum + amount(charge.amount), 0);
		const collected = charges.reduce(
			(sum: number, charge: Charge) => sum + allocationsForCharge(charge.id),
			0
		);
		const overdue = charges
			.filter((charge: Charge) => charge.due_on < today && outstanding(charge) > 0)
			.reduce((sum: number, charge: Charge) => sum + outstanding(charge), 0);
		const paidOnTime = charges.filter(
			(charge: Charge) => outstanding(charge) === 0 && charge.due_on >= today
		).length;
		return {
			billed,
			collected,
			overdue,
			rate: billed ? Math.round((collected / billed) * 100) : 0,
			paidOnTime,
			chargeCount: charges.length
		};
	};
	const tabs = [
		['people', 'Overview'],
		['tenants', 'Tenant profiles'],
		['new-tenant', 'Add tenant'],
		['leases', 'Leases & occupancy'],
		['documents', 'Documents'],
		['move-outs', 'Move-outs & history']
	];
	const href = (key: string) => resolve(`/workspace/${data.organization.id}/${key}`);
	const initials = (person: Person) =>
		`${person.first_name.slice(0, 1)}${person.last_name.slice(0, 1)}`.toUpperCase();
	const label = (value: string) => value.replaceAll('_', ' ');
	const tenantTenanciesFor = (personId: string) =>
		data.tenancies.filter((tenancy: Tenancy) =>
			data.parties.some(
				(party: Party) =>
					party.tenancy_id === tenancy.id &&
					party.person_id === personId &&
					party.role === 'primary'
			)
		);
	const currentTenancyFor = (personId: string) =>
		tenantTenanciesFor(personId).find((tenancy: Tenancy) => tenancy.status === 'active') ??
		tenantTenanciesFor(personId)[0] ??
		null;
	const spaceKindLabel = (kind?: string | null) =>
		kind === 'unit'
			? 'Whole unit'
			: kind === 'room'
				? 'Room / section'
				: kind === 'bed'
					? 'Bed'
					: kind
						? label(kind)
						: 'Not assigned';
	const tenantProfileHref = (personId: string) =>
		`${href('tenants')}/${encodeURIComponent(personId)}`;
</script>

<section class="people-workspace" aria-labelledby="people-title">
	<div class="page-heading">
		<div>
			<p class="eyebrow">People & leases</p>
			<h1 id="people-title">Know who is in each space<span>.</span></h1>
			<p class="intro-copy">
				Keep the person, lease, payment record, documents, and move-out history together.
			</p>
		</div>
		<a class="primary" href={href('new-tenant')}>Add tenant <span>→</span></a>
	</div>

	<nav class="section-tabs" aria-label="People and leases sections">
		{#each tabs as [key, labelText] (key)}
			<a class:active={active === key} href={href(key)}>{labelText}</a>
		{/each}
	</nav>

	{#if active === 'people'}
		<div class="metric-row">
			<div class="metric emphasis">
				<span>Active tenants</span><strong
					>{new Set(
						activeTenancies.flatMap((tenancy: Tenancy) =>
							data.parties
								.filter(
									(party: Party) => party.tenancy_id === tenancy.id && party.role === 'primary'
								)
								.map((party: Party) => party.person_id)
						)
					).size}</strong
				><small>Currently checked in</small>
			</div>
			<div class="metric">
				<span>Active leases</span><strong>{activeTenancies.length}</strong><small
					>Spaces under contract</small
				>
			</div>
			<div class="metric">
				<span>Expiring soon</span><strong>{expiringTenancies.length}</strong><small
					>Within 90 days</small
				>
			</div>
			<div class="metric">
				<span>Balances to follow up</span><strong
					>{data.tenancies.filter((tenancy: Tenancy) => tenancyBalance(tenancy.id) > 0)
						.length}</strong
				><small>Outstanding accounts</small>
			</div>
		</div>
		<div class="overview-grid">
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Start here</p>
						<h2>Keep the register current</h2>
						<p>
							Complete the key handoffs once, then let Finance and Maintenance use the same records.
						</p>
					</div>
				</div>
				<div class="quick-actions">
					<a href={href('new-tenant')}
						><strong>Add a tenant</strong><small>Person, lease, rent plan, and check-in</small><span
							>→</span
						></a
					><a href={href('leases')}
						><strong>Review leases</strong><small>Expiry dates, occupancy, and rent terms</small
						><span>→</span></a
					><a href={href('documents')}
						><strong>Manage documents</strong><small
							>Agreements, IDs, inspections, and approvals</small
						><span>→</span></a
					>
				</div>
			</section>
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Needs attention</p>
						<h2>Lease and payment signals</h2>
					</div>
				</div>
				<div class="signal-list">
					{#each expiringTenancies.slice(0, 4) as tenancy (tenancy.id)}<div>
							<span class="signal-dot">!</span><span
								><strong>{personName(tenancy.id)}</strong><small
									>{spaceName(tenancy.space_id)} · expires {tenancy.end_date}</small
								></span
							><b>{money(tenancyBalance(tenancy.id))}</b>
						</div>{/each}{#if !expiringTenancies.length}<p class="muted">
							No leases expire within the next 90 days.
						</p>{/if}
				</div>
			</section>
		</div>
		<section class="panel records-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Current occupancy</p>
					<h2>Recent active leases</h2>
				</div>
				<a class="secondary-link" href={href('leases')}>View all →</a>
			</div>
			{#if activeTenancies.length === 0}<div class="empty">
					<strong>No active leases yet.</strong>
					<p>Start with Add tenant to place the first person into a rentable space.</p>
				</div>{:else}<div class="table-list">
					{#each activeTenancies.slice(0, 8) as tenancy (tenancy.id)}<div class="table-row">
							<span class="avatar">{personName(tenancy.id).slice(0, 1)}</span><span
								><strong>{personName(tenancy.id)}</strong><small
									>{propertyName(tenancy.space_id)} · {spaceName(tenancy.space_id)}</small
								></span
							><span><small>Rent</small><strong>{money(tenancy.rent_amount)}</strong></span><span
								><small>Due</small><strong>{tenancy.rent_due_day ?? 'Schedule'}</strong></span
							><span class="badge active">Active</span>
						</div>{/each}
				</div>{/if}
		</section>
	{:else if active === 'new-tenant'}
		<section class="panel form-panel onboarding-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Tenant onboarding</p>
					<h2>Add a person and place them correctly</h2>
					<p>
						Save as a draft until check-in. Checking in activates the lease, marks the space
						occupied, and starts the recurring rent schedule.
					</p>
				</div>
			</div>
			{#if data.spaces.length === 0}<div class="empty">
					<strong>Add a rentable space first.</strong>
					<p>Tenants need a property room, unit, bed, office, shop, or listing.</p>
					<a class="secondary" href={resolve(`/workspace/${data.organization.id}/new-property`)}
						>Add a property →</a
					>
				</div>{:else}<form method="POST" action="?/createTenant" class="form-stack">
					<div class="form-section">
						<p class="eyebrow">01 · Person</p>
						<div class="form-grid two">
							<label>First name<input name="first_name" required /></label><label
								>Last name<input name="last_name" required /></label
							><label>Email<input name="email" type="email" /></label><label
								>Mobile number<input name="phone" type="tel" /></label
							><label>ID / passport number<input name="id_number" /></label><label
								>Date of birth<input name="date_of_birth" type="date" /></label
							><label>Address<input name="address_line_1" /></label><label
								>City<input name="city" /></label
							><label>Country<input name="country" /></label>
						</div>
						<label
							>Person notes<textarea
								name="person_notes"
								rows="2"
								placeholder="Employment, emergency context, or useful notes"></textarea></label
						>
					</div>
					<div class="form-section">
						<p class="eyebrow">02 · Accommodation and lease</p>
						<div class="form-grid two">
							<label
								>Rentable space<select name="space_id" required
									><option value="">Choose space</option
									>{#each data.spaces as space (space.id)}<option
											value={space.id}
											disabled={space.status === 'occupied'}
											>{propertyName(space.id)} · {space.name} · {space.kind}{space.status ===
											'occupied'
												? ' · occupied'
												: ''}</option
										>{/each}</select
								></label
							><label>Lease reference<input name="lease_reference" placeholder="LEASE-001" /></label
							><label>Start date<input name="start_date" type="date" required /></label><label
								>End date<input name="end_date" type="date" /></label
							><label
								>Rent ({data.organization.currency_code})<input
									name="rent_amount"
									type="number"
									min="0"
									step="0.01"
									required
								/></label
							><label
								>Deposit ({data.organization.currency_code})<input
									name="deposit_amount"
									type="number"
									min="0"
									step="0.01"
								/></label
							><label
								>Billing frequency<select name="billing_frequency"
									><option value="monthly">Monthly</option><option value="weekly">Weekly</option
									><option value="quarterly">Quarterly</option><option value="annual">Annual</option
									></select
								></label
							><label
								>Rent due day<input
									name="rent_due_day"
									type="number"
									min="1"
									max="31"
									placeholder="1"
								/></label
							><label
								>Notice period (days)<input
									name="notice_period_days"
									type="number"
									min="0"
									placeholder="30"
								/></label
							>
						</div>
						<label
							>Lease notes<textarea
								name="lease_notes"
								rows="2"
								placeholder="Special terms, utilities, renewal notes"></textarea></label
						>
					</div>
					<div class="checkin-card">
						<label class="checkbox-line"
							><input name="checked_in" type="checkbox" /><span
								><strong>Tenant has checked in</strong><small
									>Activates the tenancy and starts invoice automation. Leave unticked to save a
									draft.</small
								></span
							></label
						>
					</div>
					<button class="primary" type="submit">Save tenant and lease <span>→</span></button>
				</form>{/if}
		</section>
	{:else if active === 'tenants'}
		<div class="tenant-view">
			{#if !profileId}<section class="panel tenant-table-panel">
					<div class="panel-heading">
						<div>
							<p class="eyebrow">Tenant register</p>
							<h2>Tenant profiles</h2>
							<p>See who is connected to each property, space, and lease at a glance.</p>
						</div>
						<span class="count">{tenantPeople.length}</span>
					</div>
					{#if !tenantPeople.length}<div class="empty">
							<strong>No tenant profiles yet.</strong>
							<p>Add the first tenant to begin.</p>
						</div>{:else}<div class="tenant-table-wrap">
							<table class="tenant-table">
								<thead>
									<tr
										><th>Tenant</th><th>Property & space</th><th>Occupancy</th><th>Rent</th><th
											>Status</th
										><th><span class="sr-only">Actions</span></th></tr
									>
								</thead>
								<tbody>
									{#each tenantPeople as person (person.id)}
										{@const tenancy = currentTenancyFor(person.id)}
										{@const assignedSpace = tenancy
											? data.spaces.find((space: Space) => space.id === tenancy.space_id)
											: null}
										<tr>
											<td>
												<div class="tenant-cell">
													<span class="avatar">{initials(person)}</span><span
														><strong>{person.first_name} {person.last_name}</strong><small
															>{person.email ?? person.phone ?? 'No contact details'}</small
														></span
													>
												</div>
											</td>
											<td>
												{#if tenancy}<strong>{propertyName(tenancy.space_id)}</strong><small
														>{spaceName(tenancy.space_id)}</small
													>{:else}<span class="table-muted">Not assigned</span>{/if}
											</td>
											<td
												><span class="occupancy-pill">{spaceKindLabel(assignedSpace?.kind)}</span
												></td
											>
											<td
												>{#if tenancy}<strong>{money(tenancy.rent_amount)}</strong><small
														>{label(tenancy.billing_frequency)}</small
													>{:else}<span class="table-muted">—</span>{/if}</td
											>
											<td
												><span class={`badge ${tenancy?.status ?? 'draft'}`}
													>{tenancy ? label(tenancy.status) : 'Unassigned'}</span
												></td
											>
											<td class="table-action">
												<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
												<a class="view-button" href={tenantProfileHref(person.id)}
													>View <span aria-hidden="true">→</span></a
												>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>{/if}
				</section>{/if}
			{#if selectedPerson && (profileOpen || profileId)}<section class="profile-detail">
					<a class="back-to-table" href={href('tenants')}>← Back to tenant table</a>
					<div class="profile-hero">
						<span class="avatar xl">{initials(selectedPerson)}</span>
						<div>
							<p class="eyebrow">Tenant profile</p>
							<h2>{selectedPerson.first_name} {selectedPerson.last_name}</h2>
							<p>{selectedPerson.email ?? 'No email'} · {selectedPerson.phone ?? 'No phone'}</p>
						</div>
					</div>
					<div class="profile-summary">
						<section class="panel portal-panel">
							<div class="panel-heading">
								<div>
									<p class="eyebrow">Tenant portal</p>
									<h3>
										{selectedPerson.user_id
											? 'Portal access is active'
											: 'Give this tenant portal access'}
									</h3>
									<p>
										{selectedPerson.user_id
											? 'The tenant can sign in to view their lease, balance, invoices, documents, and maintenance updates.'
											: 'Send a secure invitation so the tenant can see their own records and raise maintenance requests.'}
									</p>
								</div>
								<span class:portal-active={Boolean(selectedPerson.user_id)} class="portal-status">
									{selectedPerson.user_id ? 'Connected' : 'Not connected'}
								</span>
							</div>
							<form method="POST" action="?/createTenantPortalAccess" class="portal-form">
								<input type="hidden" name="person_id" value={selectedPerson.id} />
								<label
									>Portal email<input
										name="email"
										type="email"
										value={selectedPerson.email ?? ''}
										required
										placeholder="tenant@example.com"
									/></label
								><button class="secondary" type="submit"
									>{selectedPerson.user_id
										? 'Resend portal invitation'
										: 'Provision tenant portal'}</button
								>
							</form>
						</section>
						<section class="panel">
							<div class="panel-heading">
								<div>
									<p class="eyebrow">Payment performance</p>
									<h3>How this tenancy is tracking</h3>
								</div>
								<span class="performance-badge"
									>{performance(selectedPerson.id).rate}% collected</span
								>
							</div>
							<div class="performance-grid">
								<div>
									<strong>{money(performance(selectedPerson.id).collected)}</strong><small
										>Collected of {money(performance(selectedPerson.id).billed)}</small
									>
								</div>
								<div>
									<strong>{money(performance(selectedPerson.id).overdue)}</strong><small
										>Overdue balance</small
									>
								</div>
								<div>
									<strong>{performance(selectedPerson.id).paidOnTime}</strong><small
										>Paid on time</small
									>
								</div>
							</div>
						</section>
					</div>
					<details class="panel disclosure">
						<summary>Edit tenant information</summary>
						<form method="POST" action="?/updatePerson" class="form-stack">
							<input type="hidden" name="person_id" value={selectedPerson.id} />
							<div class="form-grid two">
								<label
									>First name<input
										name="first_name"
										value={selectedPerson.first_name}
										required
									/></label
								><label
									>Last name<input
										name="last_name"
										value={selectedPerson.last_name}
										required
									/></label
								><label
									>Email<input
										name="email"
										type="email"
										value={selectedPerson.email ?? ''}
									/></label
								><label
									>Mobile number<input name="phone" value={selectedPerson.phone ?? ''} /></label
								><label
									>ID / passport number<input
										name="id_number"
										value={selectedPerson.id_number ?? ''}
									/></label
								><label
									>Address<input
										name="address_line_1"
										value={selectedPerson.address_line_1 ?? ''}
									/></label
								><label>City<input name="city" value={selectedPerson.city ?? ''} /></label><label
									>Country<input name="country" value={selectedPerson.country ?? ''} /></label
								>
							</div>
							<label
								>Notes<textarea name="notes" rows="2">{selectedPerson.notes ?? ''}</textarea></label
							><button class="secondary" type="submit">Save profile</button>
						</form>
					</details>
					<section class="panel profile-documents">
						<div class="panel-heading">
							<div>
								<p class="eyebrow">Attached documents</p>
								<h3>Identity, lease, and supporting records</h3>
							</div>
							<span class="count">{selectedDocuments.length}</span>
						</div>
						{#if !selectedDocuments.length}
							<p class="muted">
								No documents are attached to this tenant yet. Upload an ID, lease, or supporting
								record from Documents.
							</p>
						{:else}
							<div class="profile-document-list">
								{#each selectedDocuments as document (document.id)}
									<div class="profile-document-row">
										<span class="file-icon" aria-hidden="true">↗</span>
										<div>
											<strong>{document.file_name}</strong>
											<small
												>{label(document.document_type)} · {document.approval_status} · {document.expires_on ??
													'No expiry'}</small
											>
										</div>
										{#if document.url}
											<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
											<a class="text-action" href={document.url} target="_blank" rel="noreferrer"
												>View →</a
											>
										{:else}
											<span class="table-muted">Unavailable</span>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</section>
					<div class="profile-records">
						<section class="panel">
							<div class="panel-heading">
								<div>
									<p class="eyebrow">Lease history</p>
									<h3>Current and previous leases</h3>
								</div>
							</div>
							{#if !selectedTenancies.length}<p class="muted">No leases linked yet.</p>{:else}<div
									class="table-list"
								>
									{#each selectedTenancies as tenancy (tenancy.id)}<div
											class="table-row compact-row"
										>
											<span
												><strong
													>{propertyName(tenancy.space_id)} · {spaceName(tenancy.space_id)}</strong
												><small
													>{tenancy.start_date} → {tenancy.end_date ?? 'ongoing'} · {money(
														tenancy.rent_amount
													)} · {label(tenancy.status)}</small
												></span
											>{#if tenancy.status === 'active'}<form
													method="POST"
													action="?/endTenancy"
													class="inline-form"
												>
													<input type="hidden" name="tenancy_id" value={tenancy.id} /><input
														name="move_out_date"
														type="date"
														required
													/><input name="reason" placeholder="Reason (optional)" /><button
														class="danger"
														type="submit">End tenancy</button
													>
												</form>{/if}
										</div>{/each}
								</div>{/if}
						</section>
						<section class="panel">
							<div class="panel-heading">
								<div>
									<p class="eyebrow">Recent activity</p>
									<h3>Charges, payments, and maintenance</h3>
								</div>
							</div>
							<div class="activity-list">
								{#each selectedCharges.slice(0, 5) as charge (charge.id)}<div>
										<span>Charge</span><strong>{charge.description}</strong><b
											>{money(outstanding(charge))} open</b
										>
									</div>{/each}{#each selectedPayments.slice(0, 5) as payment (payment.id)}<div>
										<span>Payment</span><strong
											>{payment.payment_date} · {payment.reference ?? 'Manual payment'}</strong
										><b>{money(payment.amount)}</b>
									</div>{/each}{#each selectedMaintenance.slice(0, 5) as request (request.id)}<div>
										<span>Maintenance</span><strong>{request.title}</strong><b class="status-text"
											>{label(request.status)}</b
										>
									</div>{/each}{#if !selectedCharges.length && !selectedPayments.length && !selectedMaintenance.length}<p
										class="muted"
									>
										No activity recorded yet.
									</p>{/if}
							</div>
						</section>
					</div>
				</section>{/if}
		</div>
	{:else if active === 'leases'}
		<section class="panel records-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Occupancy register</p>
					<h2>Leases and rent schedules</h2>
					<p>Monitor who occupies each space and update terms without losing the history.</p>
				</div>
				<span class="count">{data.tenancies.length}</span>
			</div>
			{#if !data.tenancies.length}<div class="empty">
					<strong>No lease records yet.</strong>
					<p>Add a tenant and assign a space to create the first lease.</p>
				</div>{:else}<div class="lease-list">
					{#each data.tenancies as tenancy (tenancy.id)}<details
							class="lease-card"
							open={tenancy.status === 'active'}
						>
							<summary
								><span class="avatar">{personName(tenancy.id).slice(0, 1)}</span><span
									><strong>{personName(tenancy.id)}</strong><small
										>{propertyName(tenancy.space_id)} · {spaceName(tenancy.space_id)} · {tenancy.start_date}
										→ {tenancy.end_date ?? 'ongoing'}</small
									></span
								><b>{money(tenancy.rent_amount)}</b><span class={`badge ${tenancy.status}`}
									>{label(tenancy.status)}</span
								></summary
							>
							<form method="POST" action="?/updateTenancy" class="form-grid four lease-edit">
								<input type="hidden" name="tenancy_id" value={tenancy.id} /><label
									>Status<select name="status"
										><option value="draft" selected={tenancy.status === 'draft'}>Draft</option
										><option value="active" selected={tenancy.status === 'active'}>Active</option
										><option value="ending_soon" selected={tenancy.status === 'ending_soon'}
											>Ending soon</option
										><option value="completed" selected={tenancy.status === 'completed'}
											>Completed</option
										><option value="terminated" selected={tenancy.status === 'terminated'}
											>Terminated</option
										></select
									></label
								><label
									>Start date<input
										name="start_date"
										type="date"
										value={tenancy.start_date}
										required
									/></label
								><label
									>End date<input
										name="end_date"
										type="date"
										value={tenancy.end_date ?? ''}
									/></label
								><label
									>Rent<input
										name="rent_amount"
										type="number"
										min="0"
										step="0.01"
										value={tenancy.rent_amount}
										required
									/></label
								><label
									>Deposit<input
										name="deposit_amount"
										type="number"
										min="0"
										step="0.01"
										value={tenancy.deposit_amount}
									/></label
								><label
									>Frequency<select name="billing_frequency"
										><option value="monthly" selected={tenancy.billing_frequency === 'monthly'}
											>Monthly</option
										><option value="weekly" selected={tenancy.billing_frequency === 'weekly'}
											>Weekly</option
										><option value="quarterly" selected={tenancy.billing_frequency === 'quarterly'}
											>Quarterly</option
										><option value="annual" selected={tenancy.billing_frequency === 'annual'}
											>Annual</option
										></select
									></label
								><label
									>Due day<input
										name="rent_due_day"
										type="number"
										min="1"
										max="31"
										value={tenancy.rent_due_day ?? ''}
									/></label
								><label
									>Notice days<input
										name="notice_period_days"
										type="number"
										min="0"
										value={tenancy.notice_period_days ?? ''}
									/></label
								><label class="wide"
									>Notes<textarea name="notes" rows="2">{tenancy.notes ?? ''}</textarea></label
								><button class="primary" type="submit">Save lease changes <span>→</span></button>
							</form>
						</details>{/each}
				</div>{/if}
		</section>
	{:else if active === 'documents'}
		<section class="section-grid">
			<section class="panel form-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Document register</p>
						<h2>Store lease documents safely</h2>
						<p>
							Upload agreements, IDs, inspections, and supporting records. Approve them before
							tenant access.
						</p>
					</div>
				</div>
				<form
					method="POST"
					action="?/uploadDocument"
					enctype="multipart/form-data"
					class="form-stack"
				>
					<label
						>Tenant<select name="person_id" required
							><option value="">Choose tenant</option
							>{#each tenantPeople as person (person.id)}<option value={person.id}
									>{person.first_name} {person.last_name}</option
								>{/each}</select
						></label
					><label
						>Document type<select name="document_type"
							><option value="lease">Lease agreement</option><option value="identity"
								>Identity document</option
							><option value="inspection">Inspection report</option><option value="other"
								>Other</option
							></select
						></label
					><label
						>Expiry date <small class="optional">Optional</small><input
							name="expires_on"
							type="date"
						/></label
					><label
						>File<input
							name="file"
							type="file"
							accept="application/pdf,image/jpeg,image/png,image/webp"
							required
						/></label
					><button class="primary" type="submit">Upload document <span>→</span></button>
				</form>
			</section>
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Review queue</p>
						<h3>Documents</h3>
					</div>
					<span class="count">{data.documents.length}</span>
				</div>
				{#if !data.documents.length}<div class="empty">
						<strong>No documents uploaded.</strong>
						<p>Lease agreements and IDs will appear here.</p>
					</div>{:else}<div class="document-list">
						{#each data.documents as document (document.id)}<div class="document-row">
								<span class="file-icon">↗</span><span
									><strong>{document.file_name}</strong><small
										>{document.document_type} · {document.person_id
											? data.people.find((person: Person) => person.id === document.person_id)
													?.first_name
											: 'Workspace'} · {document.expires_on ?? 'No expiry'}</small
									></span
								>
								<form method="POST" action="?/updateDocumentApproval" class="approval-form">
									<input type="hidden" name="document_id" value={document.id} /><select
										name="approval_status"
										><option value="pending" selected={document.approval_status === 'pending'}
											>Pending</option
										><option value="approved" selected={document.approval_status === 'approved'}
											>Approved</option
										><option value="rejected" selected={document.approval_status === 'rejected'}
											>Rejected</option
										></select
									><button class="text-action" type="submit">Save</button>
								</form>
								{#if document.url}<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
									<a class="text-action" href={document.url} target="_blank" rel="noreferrer"
										>View</a
									>{/if}
							</div>{/each}
					</div>{/if}
			</section>
		</section>
	{:else if active === 'move-outs'}
		<section class="panel records-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Tenancy history</p>
					<h2>Move-outs and completed leases</h2>
					<p>Keep the record, settle the final balance, and make the space available again.</p>
				</div>
				<span class="count">{endedTenancies.length}</span>
			</div>
			{#if !endedTenancies.length}<div class="empty">
					<strong>No move-outs recorded.</strong>
					<p>When a tenant leaves, end the tenancy instead of deleting their profile.</p>
				</div>{:else}<div class="table-list">
					{#each endedTenancies as tenancy (tenancy.id)}<div class="table-row">
							<span class="avatar">{personName(tenancy.id).slice(0, 1)}</span><span
								><strong>{personName(tenancy.id)}</strong><small
									>{propertyName(tenancy.space_id)} · {spaceName(tenancy.space_id)}</small
								></span
							><span
								><small>Moved out</small><strong>{tenancy.end_date ?? 'Date not captured'}</strong
								></span
							><span
								><small>Balance</small><strong>{money(tenancyBalance(tenancy.id))}</strong></span
							><span class="badge">{label(tenancy.status)}</span>
						</div>{/each}
				</div>{/if}
		</section>
	{/if}
</section>

<style>
	.people-workspace {
		display: grid;
		gap: 22px;
	}
	.page-heading {
		display: flex;
		justify-content: space-between;
		gap: 30px;
		align-items: end;
	}
	.page-heading h1 {
		margin: 0;
		max-width: 760px;
		font-size: clamp(2.7rem, 6vw, 5.1rem);
		line-height: 0.93;
		letter-spacing: -0.075em;
		color: var(--musha-ink);
	}
	.page-heading h1 span {
		color: var(--musha-lime);
	}
	.page-heading p {
		max-width: 700px;
	}
	.page-heading > .primary {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		align-self: center;
		flex: 0 0 auto;
		white-space: nowrap;
		padding: 10px 14px;
		font-size: 13px;
		line-height: 1;
	}
	.eyebrow {
		color: #6b8e7e;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}
	.intro-copy {
		color: #668579;
		font-size: 17px;
		line-height: 1.55;
	}
	.primary,
	.secondary,
	.danger,
	.text-action,
	.secondary-link {
		text-decoration: none;
		cursor: pointer;
	}
	.primary {
		border: 0;
		border-radius: 9px;
		background: var(--musha-ink);
		color: white;
		padding: 14px 18px;
		font: inherit;
		font-weight: 800;
	}
	.primary span {
		color: var(--musha-lime);
		margin-left: 12px;
	}
	.page-heading > .primary span {
		margin-left: 0;
	}
	.secondary {
		display: inline-block;
		border: 1px solid #bed5c3;
		border-radius: 8px;
		background: #f3f8ed;
		color: var(--musha-ink);
		padding: 10px 13px;
		font-weight: 700;
	}
	.secondary-link {
		color: #33745d;
	}
	.section-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		border-bottom: 1px solid #dbe8dc;
		padding-bottom: 12px;
	}
	.section-tabs a {
		border-radius: 7px;
		color: #6c8a7e;
		padding: 10px 13px;
		text-decoration: none;
		font-size: 13px;
		font-weight: 700;
	}
	.section-tabs a:hover,
	.section-tabs a.active {
		background: #dcefe0;
		color: var(--musha-ink);
	}
	.metric-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 12px;
	}
	.metric {
		border: 1px solid #dbe8dc;
		border-radius: 12px;
		background: #fff;
		padding: 20px;
	}
	.metric.emphasis {
		background: var(--musha-ink);
		color: #fff;
	}
	.metric span,
	.metric small,
	.table-row small,
	.document-row small,
	.lease-card small,
	.activity-list span,
	.activity-list b {
		display: block;
		color: #76968a;
		font-size: 12px;
	}
	.metric.emphasis span,
	.metric.emphasis small {
		color: #b7d4c1;
	}
	.metric strong {
		display: block;
		margin: 12px 0 5px;
		font-size: 30px;
		letter-spacing: -0.06em;
	}
	.overview-grid,
	.section-grid,
	.profile-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 18px;
	}
	.panel {
		border: 1px solid #dce8dc;
		border-radius: 13px;
		background: #fff;
		padding: 26px;
	}
	.records-panel {
		padding: 26px;
	}
	.panel-heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 18px;
		margin-bottom: 20px;
	}
	.panel-heading h2,
	.panel-heading h3 {
		margin: 5px 0 6px;
		color: var(--musha-ink);
		letter-spacing: -0.055em;
	}
	.panel-heading h2 {
		font-size: 27px;
	}
	.panel-heading h3 {
		font-size: 21px;
	}
	.panel-heading p {
		color: #749589;
		line-height: 1.5;
		margin: 0;
	}
	.portal-panel {
		background: #f8fbf2;
	}
	.portal-status {
		border-radius: 999px;
		background: #fff0d4;
		color: #9c7125;
		padding: 7px 10px;
		font-size: 11px;
		font-weight: 800;
		white-space: nowrap;
	}
	.portal-status.portal-active {
		background: #e5f2d5;
		color: #4c7d47;
	}
	.portal-form {
		display: flex;
		align-items: end;
		gap: 12px;
	}
	.portal-form label {
		flex: 1;
	}
	.quick-actions {
		display: grid;
		gap: 10px;
	}
	.quick-actions a {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 2px 15px;
		border: 1px solid #e1ece1;
		border-radius: 10px;
		padding: 15px;
		color: var(--musha-ink);
		text-decoration: none;
	}
	.quick-actions a:hover {
		border-color: #9acb73;
		background: #f8fbf1;
	}
	.quick-actions small {
		color: #78988a;
	}
	.quick-actions span {
		grid-column: 2;
		grid-row: 1 / 3;
		align-self: center;
		color: #6eae35;
		font-size: 20px;
	}
	.signal-list,
	.people-list,
	.document-list,
	.lease-list,
	.activity-list {
		display: grid;
		gap: 9px;
	}
	.signal-list > div,
	.activity-list > div {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 10px;
		border-bottom: 1px solid #edf2ed;
		padding: 9px 0;
	}
	.signal-dot {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: #fff0d5;
		color: #a8681d;
		font-weight: 800;
	}
	.table-list {
		display: grid;
		gap: 8px;
	}
	.table-row {
		display: grid;
		grid-template-columns: auto 1.5fr repeat(3, auto);
		gap: 16px;
		align-items: center;
		border: 1px solid #e1ebe1;
		border-radius: 10px;
		padding: 13px;
	}
	.table-row.compact-row {
		grid-template-columns: 1fr auto;
	}
	.table-row strong,
	.document-row strong,
	.lease-card strong {
		color: var(--musha-ink);
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 9px;
		background: #eaf3d5;
		color: #3f7757;
		font-size: 12px;
		font-weight: 800;
	}
	.avatar.large {
		width: 42px;
		height: 42px;
	}
	.avatar.xl {
		width: 68px;
		height: 68px;
		border-radius: 16px;
		font-size: 22px;
	}
	.badge,
	.performance-badge,
	.mini-status {
		display: inline-flex;
		width: fit-content;
		border-radius: 999px;
		background: #edf4dc;
		color: #567d4f;
		padding: 6px 9px;
		font-size: 11px;
		font-weight: 800;
		text-transform: capitalize;
	}
	.badge.completed,
	.badge.terminated,
	.badge.expired {
		background: #edf0ee;
		color: #718078;
	}
	.badge.draft {
		background: #fff0d4;
		color: #9c7125;
	}
	.form-stack {
		display: grid;
		gap: 14px;
	}
	.form-grid {
		display: grid;
		gap: 13px;
	}
	.form-grid.two {
		grid-template-columns: repeat(2, 1fr);
	}
	.form-grid.four {
		grid-template-columns: repeat(4, 1fr);
	}
	.form-grid label,
	.form-stack > label {
		display: grid;
		gap: 6px;
		color: #386455;
		font-size: 12px;
		font-weight: 700;
	}
	input,
	select,
	textarea {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid #d5e3d7;
		border-radius: 8px;
		background: #fbfcfa;
		color: var(--musha-ink);
		padding: 11px 12px;
		font: inherit;
		font-size: 14px;
	}
	textarea {
		resize: vertical;
	}
	.form-section {
		display: grid;
		gap: 14px;
		border-top: 1px solid #e4eee4;
		padding-top: 21px;
	}
	.form-section:first-child {
		border-top: 0;
		padding-top: 0;
	}
	.checkin-card {
		border: 1px solid #bdd795;
		border-radius: 10px;
		background: #f4f9e7;
		padding: 15px;
	}
	.checkbox-line {
		display: flex;
		align-items: start;
		gap: 10px;
		color: var(--musha-ink);
	}
	.checkbox-line input {
		width: auto;
		margin-top: 3px;
	}
	.checkbox-line strong,
	.checkbox-line small {
		display: block;
	}
	.checkbox-line small {
		color: #719080;
		margin-top: 4px;
	}
	.profile-layout {
		grid-template-columns: minmax(270px, 0.72fr) 1.5fr;
		align-items: start;
	}
	.tenant-view {
		display: grid;
		gap: 18px;
	}
	.tenant-table-panel {
		padding: 22px;
	}
	.tenant-table-wrap {
		overflow-x: auto;
	}
	.tenant-table {
		width: 100%;
		min-width: 780px;
		border-collapse: collapse;
		table-layout: fixed;
	}
	.tenant-table th {
		padding: 0 12px 11px;
		color: #78978b;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-align: left;
		text-transform: uppercase;
	}
	.tenant-table th:nth-child(1) {
		width: 23%;
	}
	.tenant-table th:nth-child(2) {
		width: 22%;
	}
	.tenant-table th:nth-child(3) {
		width: 17%;
	}
	.tenant-table th:nth-child(4) {
		width: 13%;
	}
	.tenant-table th:nth-child(5) {
		width: 12%;
	}
	.tenant-table th:last-child {
		width: 13%;
	}
	.tenant-table td {
		border-top: 1px solid #e5eee5;
		padding: 13px 12px;
		color: #527867;
		font-size: 12px;
		overflow: hidden;
		vertical-align: middle;
	}
	.tenant-table td strong,
	.tenant-table td small {
		display: block;
	}
	.tenant-table td strong {
		color: var(--musha-ink);
		font-size: 13px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.tenant-table td small {
		margin-top: 4px;
		color: #78978b;
		font-size: 11px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.tenant-cell {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}
	.tenant-cell > span:last-child {
		min-width: 0;
	}
	.occupancy-pill {
		display: inline-flex;
		border-radius: 999px;
		background: #f0f6e6;
		color: #5c8455;
		padding: 6px 8px;
		font-size: 10px;
		font-weight: 800;
		white-space: nowrap;
	}
	.table-muted {
		color: #91a49a;
	}
	.table-action {
		text-align: right;
	}
	.view-button,
	.back-to-table {
		display: inline-flex;
		align-items: center;
		border: 1px solid #bed5c3;
		border-radius: 7px;
		background: #f5faef;
		color: #33745d;
		cursor: pointer;
		font: inherit;
		font-size: 11px;
		font-weight: 800;
		text-decoration: none;
	}
	.view-button {
		padding: 8px 10px;
		white-space: nowrap;
	}
	.view-button span {
		margin-left: 5px;
		color: #6eae35;
	}
	.view-button:hover,
	.back-to-table:hover {
		border-color: #88bb68;
		background: #edf7df;
	}
	.back-to-table {
		justify-self: start;
		padding: 8px 11px;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	.profile-list {
		padding: 20px;
		position: sticky;
		top: 18px;
	}
	.person-card {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 12px;
		border: 1px solid #e0ebe0;
		border-radius: 10px;
		background: #fff;
		padding: 11px;
		text-align: left;
		cursor: pointer;
	}
	.person-card:hover,
	.person-card.selected {
		border-color: #88bb68;
		background: #f5faed;
	}
	.profile-detail {
		display: grid;
		gap: 14px;
		min-width: 0;
	}
	.profile-summary,
	.profile-records {
		display: grid;
		gap: 14px;
		align-items: start;
		min-width: 0;
	}
	.profile-summary {
		grid-template-columns: minmax(0, 1.25fr) minmax(250px, 0.75fr);
	}
	.profile-records {
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
	}
	.profile-summary > .panel,
	.profile-records > .panel {
		min-width: 0;
		box-sizing: border-box;
	}
	.profile-documents {
		min-width: 0;
	}
	.profile-document-list {
		display: grid;
		gap: 0;
	}
	.profile-document-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 12px;
		padding: 12px 0;
		border-top: 1px solid #e8f0e8;
	}
	.profile-document-row strong,
	.profile-document-row small {
		display: block;
	}
	.profile-document-row strong {
		color: var(--musha-ink);
		font-size: 13px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.profile-document-row small {
		margin-top: 4px;
		color: #76968a;
		font-size: 11px;
	}
	.optional {
		color: #89a096;
		font-size: 11px;
		font-weight: 500;
	}
	.profile-hero {
		display: flex;
		align-items: center;
		gap: 15px;
		padding: 5px 3px;
	}
	.profile-hero h2 {
		margin: 3px 0;
		color: var(--musha-ink);
		font-size: 31px;
		letter-spacing: -0.06em;
	}
	.profile-hero p:last-child {
		margin: 0;
		color: #719184;
	}
	.performance-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}
	.performance-grid > div {
		border: 1px solid #e1ebe1;
		border-radius: 9px;
		padding: 15px;
	}
	.performance-grid strong,
	.performance-grid small {
		display: block;
	}
	.performance-grid strong {
		color: var(--musha-ink);
		font-size: 22px;
	}
	.performance-grid small {
		color: #78978b;
		margin-top: 4px;
	}
	.disclosure summary {
		cursor: pointer;
		color: var(--musha-ink);
		font-weight: 800;
	}
	.disclosure .form-stack {
		margin-top: 17px;
	}
	.inline-form {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
		justify-content: end;
	}
	.inline-form input {
		width: auto;
		min-width: 130px;
	}
	.profile-records .table-row.compact-row {
		grid-template-columns: 1fr;
		align-items: start;
	}
	.profile-records .inline-form {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		justify-content: stretch;
		width: 100%;
	}
	.profile-records .inline-form input,
	.profile-records .inline-form button {
		box-sizing: border-box;
		min-width: 0;
		width: 100%;
	}
	.profile-records .inline-form button {
		grid-column: 1 / -1;
	}
	.danger {
		border: 0;
		border-radius: 7px;
		background: #fff0ed;
		color: #a44335;
		padding: 9px 10px;
		font: inherit;
		font-size: 12px;
		font-weight: 800;
	}
	.lease-card {
		border: 1px solid #e0ebe0;
		border-radius: 10px;
		padding: 15px;
	}
	.lease-card summary {
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		align-items: center;
		gap: 12px;
		cursor: pointer;
		list-style: none;
	}
	.lease-card summary::-webkit-details-marker {
		display: none;
	}
	.lease-edit {
		margin-top: 18px;
		border-top: 1px solid #e5eee5;
		padding-top: 18px;
	}
	.lease-edit .wide {
		grid-column: 1 / -1;
	}
	.lease-edit button {
		grid-column: 1 / -1;
		width: fit-content;
	}
	.document-row {
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		gap: 12px;
		align-items: center;
		border-bottom: 1px solid #e8f0e8;
		padding: 11px 0;
	}
	.file-icon {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 8px;
		background: #eaf3d5;
		color: #5b8c4a;
	}
	.approval-form {
		display: flex;
		gap: 7px;
		align-items: center;
	}
	.approval-form select {
		width: auto;
		padding: 8px;
		font-size: 12px;
	}
	.text-action {
		border: 0;
		background: none;
		color: #33745d;
		padding: 3px;
		font: inherit;
		font-size: 12px;
		font-weight: 800;
	}
	.activity-list > div {
		grid-template-columns: 88px 1fr auto;
	}
	.status-text {
		color: #527e68;
		font-size: 12px;
		text-transform: capitalize;
	}
	.empty {
		border: 1px dashed #c9ddcd;
		border-radius: 10px;
		background: #fbfdf9;
		padding: 28px;
		text-align: center;
		color: #719083;
	}
	.empty strong {
		display: block;
		color: var(--musha-ink);
		margin-bottom: 5px;
	}
	.muted {
		color: #78978b;
	}
	.count {
		border-radius: 999px;
		background: #edf4dc;
		color: #5c8455;
		padding: 7px 10px;
		font-size: 12px;
	}
	@media (max-width: 980px) {
		.metric-row {
			grid-template-columns: repeat(2, 1fr);
		}
		.overview-grid,
		.section-grid,
		.profile-layout {
			grid-template-columns: 1fr;
		}
		.profile-list {
			position: static;
		}
		.form-grid.four {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 680px) {
		.page-heading {
			align-items: start;
			flex-direction: column;
		}
		.page-heading > .primary {
			align-self: start;
		}
		.metric-row,
		.form-grid.two,
		.form-grid.four,
		.performance-grid {
			grid-template-columns: 1fr;
		}
		.profile-summary,
		.profile-records {
			grid-template-columns: 1fr;
		}
		.page-heading h1 {
			font-size: 3.2rem;
		}
		.panel {
			padding: 18px;
		}
		.table-row {
			grid-template-columns: auto 1fr;
		}
		.table-row > span:nth-child(n + 3) {
			grid-column: 2;
		}
		.lease-card summary {
			grid-template-columns: auto 1fr auto;
		}
		.lease-card summary .badge {
			grid-column: 2 / -1;
		}
		.document-row {
			grid-template-columns: auto 1fr;
		}
		.profile-document-row {
			grid-template-columns: auto minmax(0, 1fr);
		}
		.profile-document-row .text-action,
		.profile-document-row .table-muted {
			grid-column: 2;
			justify-self: start;
		}
		.approval-form,
		.document-row .text-action {
			grid-column: 2;
			justify-self: start;
		}
		.inline-form {
			justify-content: start;
			grid-column: 1 / -1;
		}
		.section-tabs {
			overflow-x: auto;
			flex-wrap: nowrap;
		}
		.section-tabs a {
			white-space: nowrap;
		}
	}
</style>
