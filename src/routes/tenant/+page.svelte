<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, svelte/require-each-key, svelte/no-navigation-without-resolve */
	let { data, form } = $props();
	type Row = Record<string, any>;
	const properties: Row[] = $derived(data.properties ?? []);
	const spaces: Row[] = $derived(data.spaces ?? []);
	const tenancies: Row[] = $derived(data.tenancies ?? []);
	const charges: Row[] = $derived(data.charges ?? []);
	const payments: Row[] = $derived(data.payments ?? []);
	const paymentAllocations: Row[] = $derived(data.paymentAllocations ?? []);
	const propertyName = (id: string) =>
		properties.find((property) => property.id === id)?.name ?? 'Property';
	const space = (id: string) => spaces.find((item) => item.id === id);
	const money = (amount: number | string | null | undefined) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: data.organization?.currency_code ?? 'USD',
			maximumFractionDigits: 0
		}).format(Number(amount ?? 0));
	const dateLabel = (value: string | null | undefined) =>
		value
			? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(
					new Date(`${value.slice(0, 10)}T00:00:00`)
				)
			: '—';
	const chargeBalance = (tenancyId: string) =>
		charges
			.filter(
				(charge) =>
					charge.tenancy_id === tenancyId && charge.due_on <= new Date().toISOString().slice(0, 10)
			)
			.reduce(
				(total, charge) =>
					total +
					Number(charge.amount) -
					paymentAllocations
						.filter((allocation) => allocation.charge_id === charge.id)
						.reduce((allocated, allocation) => allocated + Number(allocation.amount), 0),
				0
			);
	const currentTenancies = $derived(
		tenancies.filter((tenancy) => ['active', 'ending_soon'].includes(tenancy.status))
	);
	const nextCharge = $derived(
		charges
			.filter((charge) => charge.due_on >= new Date().toISOString().slice(0, 10))
			.sort((a, b) => a.due_on.localeCompare(b.due_on))[0]
	);
	const allowedSpaces = $derived(spaces);
</script>

<svelte:head><title>Tenant portal · Musha</title></svelte:head>

<div class="portal-shell">
	<header class="portal-header">
		<a href="/tenant" class="brand"
			><img src="/logo.png" alt="Musha" /><span
				><strong>Musha</strong><small>Tenant portal</small></span
			></a
		>
		<div class="header-actions">
			<span>{data.organization?.name ?? 'Your home'}</span><a class="settings-link" href="/tenant/settings">Settings</a>
			<form method="POST" action="/logout"><button type="submit">Sign out</button></form>
		</div>
	</header>
	<nav class="portal-nav" aria-label="Tenant portal navigation"><a class="active" href="/tenant">Overview</a><a href="#lease">Lease</a><a href="#requests">Requests</a><a href="#documents">Documents</a><a href="#billing">Billing</a><a href="/tenant/settings">Settings</a></nav>
	<main class="portal-main">
		{#if form?.message}<div class:failure={!form.success} class="notice">
				{form.message}<button
					type="button"
					aria-label="Dismiss"
					onclick={(event) => event.currentTarget.parentElement?.remove()}>×</button
				>
				</div>{/if}
		{#if data.user?.user_metadata?.must_change_password}<div class="security-banner">You are using a temporary password. <a href="/tenant/settings">Open Settings to choose your own password →</a></div>{/if}
		<section class="welcome" id="overview">
			<div>
				<p class="eyebrow">Your Musha home</p>
				<h1>Hello, {data.person.first_name}<span>.</span></h1>
				<p>Keep your lease, payments and property requests close at hand.</p>
			</div>
			<div class="balance-card">
				<small>Current balance</small><strong
					>{money(
						currentTenancies.reduce((total, tenancy) => total + chargeBalance(tenancy.id), 0)
					)}</strong
				><span
					>{nextCharge ? `Next due ${dateLabel(nextCharge.due_on)}` : 'No upcoming charge'}</span
				>
			</div>
		</section>
		<div class="summary-grid">
			<div><span>Current leases</span><strong>{currentTenancies.length}</strong></div>
			<div><span>Rent due</span><strong>{nextCharge ? money(nextCharge.amount) : '—'}</strong></div>
			<div>
				<span>Open requests</span><strong
					>{data.maintenance.filter((item: Row) => !['completed', 'closed'].includes(item.status))
						.length}</strong
				>
			</div>
			<div><span>Documents</span><strong>{data.documents.length}</strong></div>
		</div>
		<div class="content-grid">
			<section class="card">
				<div class="card-heading">
					<div>
						<p class="eyebrow" id="lease">Your agreement</p>
						<h2>Current lease</h2>
					</div>
				</div>
				{#each currentTenancies as tenancy}<article class="lease">
						<div>
							<strong
								>{propertyName(space(tenancy.space_id)?.property_id)} · {space(tenancy.space_id)
									?.name ?? 'Space'}</strong
							><small
								>{space(tenancy.space_id)?.kind ?? 'Rental space'} · {tenancy.lease_reference ??
									'Lease record'}</small
							>
						</div>
						<div class="lease-meta">
							<span><small>Rent</small><strong>{money(tenancy.rent_amount)}</strong></span><span
								><small>Starts</small><strong>{dateLabel(tenancy.start_date)}</strong></span
							><span><small>Ends</small><strong>{dateLabel(tenancy.end_date)}</strong></span><span
								><small>Balance</small><strong class:warning={chargeBalance(tenancy.id) > 0}
									>{money(chargeBalance(tenancy.id))}</strong
								></span
							>
						</div>
					</article>{:else}<div class="empty">
						Your property manager has not linked an active lease yet.
					</div>{/each}
			</section>
			<section class="card contact">
				<p class="eyebrow">Need help?</p>
				<h2>Property contact</h2>
				<p>For urgent issues, contact your property manager directly.</p>
				<div>
					<strong>{data.organization?.name ?? 'Property manager'}</strong><small
						>{data.settings?.contact_email ?? 'Contact details are being configured'}</small
					><small>{data.settings?.contact_phone ?? ''}</small>
				</div>
				<p class="payment-instructions">
					{data.settings?.payment_instructions ??
						'Payment instructions will appear here once your property manager adds them.'}
				</p>
			</section>
		</div>
		<div class="content-grid">
			<section class="card">
				<div class="card-heading">
					<div>
						<p class="eyebrow" id="requests">Property care</p>
						<h2>Report an issue</h2>
						<p>Tell the team what happened and add a photo when useful.</p>
					</div>
				</div>
				<form
					method="POST"
					action="?/createMaintenance"
					enctype="multipart/form-data"
					class="form-stack"
				>
					<div class="form-grid two">
						<label
							>Property<select name="property_id" required
								><option value="">Choose property</option>{#each properties as property}<option
										value={property.id}>{property.name}</option
									>{/each}</select
							></label
						><label
							>Space or room<select name="space_id"
								><option value="">Whole property</option>{#each allowedSpaces as item}<option
										value={item.id}>{item.name}</option
									>{/each}</select
							></label
						>
					</div>
					<div class="form-grid two">
						<label
							>Issue title<input name="title" required placeholder="Leaking kitchen tap" /></label
						><label
							>Category<select name="category"
								>{#each ['plumbing', 'electrical', 'hvac', 'carpentry', 'landscaping', 'painting', 'flooring', 'roofing', 'security', 'appliances', 'pest_control', 'cleaning', 'general'] as category}<option
										value={category}>{category.replaceAll('_', ' ')}</option
									>{/each}</select
							></label
						>
					</div>
					<label
						>Priority<select name="priority"
							><option value="normal">Normal</option><option value="low">Low</option><option
								value="high">High</option
							><option value="urgent">Urgent</option></select
						></label
					><label
						>What happened?<textarea
							name="description"
							rows="4"
							required
							placeholder="Describe the issue, when you noticed it and any access notes"
						></textarea></label
					><label class="file-label"
						>Photo (optional)<input
							name="photo"
							type="file"
							accept="image/jpeg,image/png,image/webp"
						/><small>JPG, PNG or WebP up to 10 MB.</small></label
					><button class="primary" type="submit">Submit maintenance request <span>→</span></button>
				</form>
			</section>
			<section class="card">
				<div class="card-heading">
					<div>
						<p class="eyebrow">Live updates</p>
						<h2>Your requests</h2>
					</div>
					<span class="count">{data.maintenance.length}</span>
				</div>
				{#each data.maintenance as item}<article class="request">
						<div>
							<strong>{item.title}</strong><small
								>{propertyName(item.property_id)} · {item.category.replaceAll('_', ' ')}</small
							>
						</div>
						<span
							class:urgent={item.priority === 'urgent'}
							class:done={['completed', 'closed'].includes(item.status)}
							class="status">{item.status.replaceAll('_', ' ')}</span
						><small>Reported {dateLabel(item.reported_at ?? item.created_at)}</small
						>{#each data.updates
							.filter((update: Row) => update.request_id === item.id)
							.slice(0, 2) as update}<p class="update">{update.body}</p>{/each}
						<form method="POST" action="?/addMaintenanceUpdate" class="inline-update">
							<input type="hidden" name="request_id" value={item.id} /><input
								name="body"
								placeholder="Add an update or access note"
							/><button type="submit">Post</button>
						</form>
					</article>{:else}<div class="empty">
						You have not submitted a maintenance request.
					</div>{/each}
			</section>
		</div>
		<div class="content-grid">
			<section class="card">
				<div class="card-heading">
					<div>
						<p class="eyebrow" id="documents">Approved records</p>
						<h2>Your documents</h2>
					</div>
				</div>
				{#each data.documents as document}<a
						class="document"
						href={document.url ?? '#'}
						target="_blank"
						rel="noreferrer"
						><span>↗</span>
						<div>
							<strong>{document.file_name}</strong><small
								>{document.document_type.replaceAll('_', ' ')} · {document.expires_on
									? `Expires ${dateLabel(document.expires_on)}`
									: 'No expiry recorded'}</small
							>
						</div></a
					>{:else}<div class="empty">Approved lease documents will appear here.</div>{/each}
			</section>
			<section class="card">
				<div class="card-heading">
					<div>
						<p class="eyebrow">Your details</p>
						<h2>Update profile</h2>
					</div>
				</div>
				<form method="POST" action="?/updateProfile" class="form-stack">
					<div class="form-grid two">
						<label>Email<input name="email" type="email" value={data.person.email ?? ''} /></label
						><label>Phone<input name="phone" value={data.person.phone ?? ''} /></label>
					</div>
					<div class="form-grid two">
						<label>City<input name="city" value={data.person.city ?? ''} /></label><label
							>Country<input name="country" value={data.person.country ?? ''} /></label
						>
					</div>
					<label
						>Notes for your property manager<textarea name="notes" rows="3"
							>{data.person.notes ?? ''}</textarea
						></label
					><button class="primary" type="submit">Save profile <span>→</span></button>
				</form>
			</section>
		</div>
		<div class="content-grid">
			<section class="card">
				<div class="card-heading">
					<div>
						<p class="eyebrow" id="billing">Billing</p>
						<h2>Your invoices and receipts</h2>
					</div>
				</div>
				{#each data.billingDocuments as document}<div class="document billing-document">
						<span>{document.document_type === 'receipt' ? '✓' : '#'}</span>
						<div>
							<strong>{document.document_number}</strong><small
								>{document.document_type} · {dateLabel(document.issue_date)} · {document.status}</small
							>
						</div>
						<b
							>{new Intl.NumberFormat('en-US', {
								style: 'currency',
								currency: document.currency_code
							}).format(Number(document.total_amount))}</b
						>
					</div>{:else}<div class="empty">
						Your property manager has not issued a billing document yet.
					</div>{/each}
			</section>
		</div>
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f7f8f5;
		color: #073d3c;
		font-family: var(--font-body, Inter, system-ui, sans-serif);
	}
	.portal-shell {
		min-height: 100vh;
	}
	.portal-header {
		height: 76px;
		border-bottom: 1px solid #dce6df;
		background: #fff;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 clamp(1rem, 4vw, 4rem);
		gap: 1rem;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		color: #073d3c;
		text-decoration: none;
	}
	.brand img {
		width: 54px;
		height: 54px;
		border-radius: 14px;
		object-fit: contain;
	}
	.brand strong,
	.brand small {
		display: block;
	}
	.brand strong {
		font-size: 1.2rem;
	}
	.brand small {
		font-size: 0.7rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #6e8790;
	}
	.header-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
		color: #698087;
		font-size: 0.85rem;
	}
	.settings-link { color: #397463; font-weight: 700; text-decoration: none; }
	.header-actions button {
		background: none;
		border: 1px solid #d4e2d9;
		border-radius: 8px;
		padding: 0.6rem 0.8rem;
		color: #225b56;
		cursor: pointer;
	}
	.portal-nav { align-items: center; background: #eef5ea; border-bottom: 1px solid #dce6df; display: flex; gap: .35rem; justify-content: center; padding: .55rem clamp(1rem, 4vw, 4rem); position: sticky; top: 0; z-index: 10; }
	.portal-nav a { border-radius: 8px; color: #5d7f76; font-size: .78rem; font-weight: 700; padding: .62rem .85rem; text-decoration: none; }
	.portal-nav a:hover, .portal-nav a.active { background: #075147; color: #fff; }
	#overview, #lease, #requests, #documents, #billing { scroll-margin-top: 70px; }
	.portal-main {
		max-width: 1240px;
		margin: 0 auto;
		padding: clamp(1.25rem, 4vw, 3.5rem) clamp(1rem, 4vw, 2rem);
		display: grid;
		gap: 1.1rem;
	}
	.welcome {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 2rem;
	}
	.eyebrow {
		font-size: 0.7rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #5b8584;
		margin: 0;
	}
	.welcome h1 {
		font-size: clamp(2.5rem, 6vw, 5rem);
		letter-spacing: -0.08em;
		line-height: 0.95;
		margin: 0.5rem 0 1rem;
	}
	.welcome h1 span {
		color: #b6d84a;
	}
	.welcome p:not(.eyebrow) {
		color: #6b858b;
		font-size: 1.05rem;
		margin: 0;
	}
	.balance-card {
		min-width: 210px;
		border-radius: 18px;
		background: #084f48;
		color: #fff;
		padding: 1.2rem 1.3rem;
	}
	.balance-card small,
	.balance-card span {
		display: block;
		color: #c3ded2;
		font-size: 0.8rem;
	}
	.balance-card strong {
		display: block;
		font-size: 2rem;
		letter-spacing: -0.06em;
		margin: 0.4rem 0;
	}
	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
	}
	.summary-grid > div {
		background: #fff;
		border: 1px solid #dce6df;
		border-radius: 14px;
		padding: 1rem;
	}
	.summary-grid span {
		display: block;
		color: #789199;
		font-size: 0.8rem;
	}
	.summary-grid strong {
		display: block;
		font-size: 1.5rem;
		margin-top: 0.4rem;
	}
	.content-grid {
		display: grid;
		grid-template-columns: 1.15fr 0.85fr;
		gap: 1rem;
	}
	.card {
		background: #fff;
		border: 1px solid #dce6df;
		border-radius: 18px;
		padding: 1.25rem;
		min-width: 0;
	}
	.card-heading {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: flex-start;
		margin-bottom: 1rem;
	}
	.card h2 {
		margin: 0.25rem 0;
		font-size: 1.45rem;
		letter-spacing: -0.05em;
	}
	.card-heading p:not(.eyebrow),
	.contact > p {
		color: #6e8790;
		margin: 0.4rem 0;
	}
	.count {
		background: #edf4d7;
		color: #597c45;
		border-radius: 999px;
		padding: 0.4rem 0.65rem;
	}
	.lease {
		border: 1px solid #e3ece5;
		border-radius: 12px;
		padding: 1rem;
		display: grid;
		gap: 0.9rem;
		margin-top: 0.7rem;
	}
	.lease strong,
	.lease small {
		display: block;
	}
	.lease small {
		color: #7b9398;
		margin-top: 0.25rem;
	}
	.lease-meta {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.6rem;
	}
	.lease-meta small {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.warning {
		color: #b75538 !important;
	}
	.contact {
		background: #edf4d7;
		border-color: #d7e6bd;
	}
	.contact > div {
		display: grid;
		gap: 0.3rem;
		margin: 1.2rem 0;
	}
	.contact > div small {
		color: #69836c;
	}
	.payment-instructions {
		border-top: 1px solid #d5e4bd;
		padding-top: 1rem;
	}
	.form-stack {
		display: grid;
		gap: 0.75rem;
	}
	.form-stack label {
		display: grid;
		gap: 0.35rem;
		color: #3d6063;
		font-size: 0.8rem;
	}
	.form-grid {
		display: grid;
		gap: 0.75rem;
	}
	.form-grid.two {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	input,
	select,
	textarea {
		font: inherit;
		border: 1px solid #d5e3dc;
		border-radius: 8px;
		padding: 0.75rem;
		background: #fff;
		color: #123e3b;
	}
	textarea {
		resize: vertical;
	}
	.file-label small {
		color: #8ba0a2;
	}
	.primary {
		background: #084f48;
		color: #fff;
		border: 0;
		border-radius: 9px;
		padding: 0.85rem 1rem;
		font-weight: 700;
		cursor: pointer;
		justify-self: start;
	}
	.primary span {
		color: #b6d84a;
		margin-left: 0.5rem;
	}
	.request {
		border-bottom: 1px solid #edf1ed;
		padding: 1rem 0;
		display: grid;
		gap: 0.3rem;
	}
	.request > div {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}
	.request strong,
	.request small {
		display: block;
	}
	.request small {
		color: #80959a;
	}
	.status {
		border-radius: 999px;
		background: #edf4d7;
		color: #587d45;
		padding: 0.3rem 0.55rem;
		font-size: 0.72rem;
		justify-self: start;
		text-transform: capitalize;
	}
	.status.urgent {
		background: #fde4d9;
		color: #ad4d31;
	}
	.status.done {
		background: #e2f3e7;
		color: #357e51;
	}
	.update {
		background: #f6f8f4;
		border-radius: 8px;
		padding: 0.55rem;
		color: #48686b;
		font-size: 0.85rem;
		margin: 0.35rem 0;
	}
	.inline-update {
		display: flex;
		gap: 0.4rem;
		margin-top: 0.5rem;
	}
	.inline-update input {
		min-width: 0;
		flex: 1;
		padding: 0.55rem;
	}
	.inline-update button {
		border: 0;
		border-radius: 8px;
		background: #dceec5;
		color: #2f6a46;
		padding: 0.55rem 0.75rem;
		cursor: pointer;
	}
	.document {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		text-decoration: none;
		color: #225e5a;
		padding: 0.85rem 0;
		border-bottom: 1px solid #edf1ed;
	}
	.document > span {
		width: 2rem;
		height: 2rem;
		display: grid;
		place-items: center;
		background: #edf4d7;
		border-radius: 8px;
	}
	.document strong,
	.document small {
		display: block;
	}
	.document small {
		color: #7e9498;
		margin-top: 0.2rem;
	}
	.empty {
		padding: 1.4rem;
		text-align: center;
		color: #7d9498;
		background: #fafcf9;
		border-radius: 10px;
	}
	.notice {
		position: fixed;
		z-index: 5;
		right: 1.2rem;
		bottom: 1.2rem;
		background: #084f48;
		color: #fff;
		padding: 1rem 2.8rem 1rem 1rem;
		border-radius: 12px;
		box-shadow: 0 12px 30px #083f3833;
	}
	.notice.failure {
		background: #a94a35;
	}
	.security-banner { background: #fff5df; border: 1px solid #f0dfb7; border-radius: 10px; color: #8b692b; font-size: 0.85rem; padding: 0.8rem 1rem; }
	.security-banner a { color: #6b5725; font-weight: 800; }
	.notice button {
		position: absolute;
		right: 0.7rem;
		top: 0.65rem;
		border: 0;
		background: transparent;
		color: inherit;
		font-size: 1.2rem;
		cursor: pointer;
	}
	@media (max-width: 800px) {
		.welcome,
		.content-grid {
			display: grid;
			grid-template-columns: 1fr;
		}
		.summary-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.lease-meta {
			grid-template-columns: repeat(2, 1fr);
		}
		.header-actions > span {
			display: none;
		}
	}
	@media (max-width: 480px) {
		.portal-nav { justify-content: flex-start; overflow-x: auto; }
		.portal-nav a { flex: 0 0 auto; }
		.summary-grid {
			grid-template-columns: 1fr;
		}
		.portal-header {
			height: auto;
			padding-block: 0.65rem;
		}
		.brand img {
			width: 44px;
			height: 44px;
		}
		.form-grid.two {
			grid-template-columns: 1fr;
		}
		.card {
			padding: 1rem;
		}
	}
</style>
