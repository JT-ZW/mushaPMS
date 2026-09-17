<script lang="ts">
	let { data, form } = $props();
	const categories = {
		plumbing: 'Plumbing',
		electrical: 'Electrical',
		hvac: 'HVAC & climate',
		carpentry: 'Carpentry',
		landscaping: 'Landscaping',
		painting: 'Painting',
		flooring: 'Flooring',
		roofing: 'Roofing',
		security: 'Security',
		appliances: 'Appliances',
		pest_control: 'Pest control',
		cleaning: 'Cleaning',
		general: 'General'
	} as const;
	const statuses = [
		'reported',
		'triage',
		'assigned',
		'in_progress',
		'awaiting_approval',
		'completed',
		'closed'
	];
	const statusLabels: Record<string, string> = {
		reported: 'Reported',
		triage: 'Triage',
		assigned: 'Assigned',
		in_progress: 'In progress',
		awaiting_approval: 'Awaiting approval',
		completed: 'Completed',
		closed: 'Closed'
	};
	const sourceLabels: Record<string, string> = {
		client: 'Client',
		staff: 'Staff',
		inspection: 'Inspection',
		preventive: 'Preventive'
	};
	const priorityLabels: Record<string, string> = {
		low: 'Low',
		normal: 'Normal',
		high: 'High',
		urgent: 'Urgent'
	};
	const frequencyLabels: Record<string, string> = {
		weekly: 'Every week',
		monthly: 'Every month',
		quarterly: 'Every quarter',
		biannual: 'Every 6 months',
		annual: 'Every year'
	};
	let view = $state('overview');
	let search = $state('');
	let categoryFilter = $state('all');
	let priorityFilter = $state('all');
	let vendorFilter = $state('all');
	let vendorSearch = $state('');
	let vendorStatusFilter = $state('all');
	let vendorSpecialtyFilter = $state('all');
	let vendorPage = $state(1);
	const openRequests = $derived(
		data.maintenance.filter(
			(item: { status: string }) => !['completed', 'closed'].includes(item.status)
		)
	);
	const urgentRequests = $derived(
		openRequests.filter((item: { priority: string }) => item.priority === 'urgent')
	);
	const scheduledRequests = $derived(
		openRequests.filter((item: { scheduled_for?: string | null }) => Boolean(item.scheduled_for))
	);
	const visibleRequests = $derived(
		data.maintenance.filter(
			(item: { title: string; description?: string; category: string; priority: string }) => {
				const needle = search.trim().toLowerCase();
				const text =
					`${item.title} ${item.description ?? ''} ${categories[item.category as keyof typeof categories] ?? item.category}`.toLowerCase();
				return (
					(!needle || text.includes(needle)) &&
					(categoryFilter === 'all' || item.category === categoryFilter) &&
					(priorityFilter === 'all' || item.priority === priorityFilter)
				);
			}
		)
	);
	const plannedRequests = $derived(
		visibleRequests.filter((item: { scheduled_for?: string | null }) => Boolean(item.scheduled_for))
	);
	const workQueue = $derived(
		[...openRequests].sort(
			(a: { scheduled_for?: string | null; created_at: string }, b: { scheduled_for?: string | null; created_at: string }) =>
				(a.scheduled_for ?? '9999-12-31').localeCompare(b.scheduled_for ?? '9999-12-31') ||
				b.created_at.localeCompare(a.created_at)
		)
	);
	const requestBoardRequests = $derived(
		visibleRequests.filter(
			(item: { status: string }) => !['completed', 'closed'].includes(item.status)
		)
	);
	const historyRequests = $derived(
		visibleRequests.filter((item: { status: string }) =>
			['completed', 'closed'].includes(item.status)
		)
	);
	const activeVendors = $derived(
		data.maintenanceVendors.filter((item: { status: string }) => item.status === 'active')
	);
	const visibleVendors = $derived(
		data.maintenanceVendors.filter(
			(item: { business_name: string; contact_name?: string | null; email?: string | null; resource_type?: string; status: string; specialties?: string[] }) => {
				const needle = vendorSearch.trim().toLowerCase();
				const text = `${item.business_name} ${item.contact_name ?? ''} ${item.email ?? ''}`.toLowerCase();
				return (
					(!needle || text.includes(needle)) &&
					(vendorFilter === 'all' || (item.resource_type ?? 'external') === vendorFilter) &&
					(vendorStatusFilter === 'all' || item.status === vendorStatusFilter) &&
					(vendorSpecialtyFilter === 'all' || (item.specialties ?? []).includes(vendorSpecialtyFilter))
				);
			}
		)
	);
	const specialtyOptions = $derived(
		Array.from(
			new Set(
				data.maintenanceVendors.flatMap((item: { specialties?: string[] }) => item.specialties ?? [])
			)
		).sort()
	);
	const vendorPageCount = $derived(Math.max(1, Math.ceil(visibleVendors.length / 10)));
	const effectiveVendorPage = $derived(Math.min(vendorPage, vendorPageCount));
	const pagedVendors = $derived(
		visibleVendors.slice((effectiveVendorPage - 1) * 10, effectiveVendorPage * 10)
	);
	const openReminders = $derived(
		data.maintenanceReminders.filter(
			(item: { acknowledged_at?: string | null }) => !item.acknowledged_at
		)
	);
	const duePlans = $derived(
		data.maintenancePlans.filter(
			(item: { active: boolean; next_due_on: string }) =>
				item.active && item.next_due_on <= new Date().toISOString().slice(0, 10)
		)
	);
	const categoryCounts = $derived(
		Object.entries(categories)
			.map(([key, label]) => ({
				key,
				label,
				count: data.maintenance.filter((item: { category: string }) => item.category === key).length
			}))
			.filter((item) => item.count > 0)
			.sort((a, b) => b.count - a.count)
	);
	const money = (amount: number | string | null | undefined) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: data.organization.currency_code
		}).format(Number(amount ?? 0));
	const personName = (id: string | null | undefined) => {
		const person = data.people.find((item: { id: string }) => item.id === id);
		return person ? `${person.first_name} ${person.last_name}` : 'Unassigned';
	};
	const propertyName = (id: string | null | undefined) =>
		data.properties.find((item: { id: string }) => item.id === id)?.name ?? 'Property not found';
	const spaceName = (id: string | null | undefined) =>
		data.spaces.find((item: { id: string }) => item.id === id)?.name ?? 'Whole property';
	const label = (values: Record<string, string>, key: string | null | undefined) =>
		values[key ?? ''] ?? (key ?? '—').replaceAll('_', ' ');
	const dateLabel = (value: string | null | undefined) =>
		value
			? new Intl.DateTimeFormat('en-GB', {
					day: '2-digit',
					month: 'short',
					year: 'numeric'
				}).format(new Date(value))
			: 'Not scheduled';
	const shortId = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;
	const statusIndex = (status: string) =>
		Math.max(0, ['reported', 'triage', 'assigned', 'in_progress', 'completed'].indexOf(status));
	const updatesFor = (requestId: string) =>
		data.maintenanceUpdates.filter((item: { request_id: string }) => item.request_id === requestId);
	const attachmentsFor = (requestId: string) =>
		data.maintenanceAttachments.filter(
			(item: { request_id: string }) => item.request_id === requestId
		);
	const vendorName = (id: string | null | undefined) =>
		data.maintenanceVendors.find((item: { id: string }) => item.id === id)?.business_name ??
		'No contractor';
	const reminderRequest = (id: string) =>
		data.maintenance.find((item: { id: string }) => item.id === id);
	const reminderLabel = (type: string) => (type === 'overdue' ? 'Overdue' : 'Due within 24 hours');
</script>

<div class="maintenance-shell">
	{#if form?.message}<div class:success={form.success} class="inline-feedback">
			{form.message}
		</div>{/if}
	<nav class="maintenance-nav" aria-label="Maintenance views">
		<div>
			<span class="nav-label">Maintenance workspace</span><strong>Keep every issue moving.</strong>
		</div>
		<div class="tabs">
			{#each [['overview', 'Overview'], ['requests', 'Requests'], ['planned', 'Planned work'], ['vendors', 'Vendors'], ['preventive', 'Preventive'], ['sla', 'SLA watch'], ['history', 'History']] as tab (tab[0])}{#if tab[0] === 'vendors'}<a href={`/workspace/${data.organization.id}/vendors`}>{tab[1]}</a>{:else}<button
					class:active={view === tab[0]}
					type="button"
					onclick={() => (view = tab[0])}>{tab[1]}</button
				>{/if}{/each}
		</div>
	</nav>

	{#if view === 'overview'}
		<div class="metric-row maintenance-metrics">
			<div class="metric-card dark">
				<span>Open requests</span><strong>{openRequests.length}</strong><small
					>Needs a next action</small
				>
			</div>
			<div class="metric-card">
				<span>Urgent</span><strong>{urgentRequests.length}</strong><small>Priority attention</small>
			</div>
			<div class="metric-card">
				<span>Planned work</span><strong>{scheduledRequests.length}</strong><small
					>Scheduled requests</small
				>
			</div>
			<div class="metric-card">
				<span>Maintenance spend</span><strong
					>{money(
						data.maintenance.reduce(
							(sum: number, item: { actual_cost?: number | string | null }) =>
								sum + Number(item.actual_cost ?? 0),
							0
						)
					)}</strong
				><small>Recorded actual cost</small>
			</div>
		</div>
		<div class="overview-grid">
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Request pulse</p>
						<h2>What needs attention?</h2>
						<p>Open work, ordered by the latest report.</p>
					</div>
					<button class="text-link" type="button" onclick={() => (view = 'requests')}
						>View all →</button
					>
				</div>
				{#if openRequests.length === 0}<div class="empty compact">
						<strong>Your maintenance board is clear.</strong>
						<p>New client requests and inspections will appear here.</p>
					</div>{:else}<div class="pulse-list">
						{#each openRequests.slice(0, 5) as request (request.id)}<div class="pulse-row">
								<span class="priority-dot {request.priority}"></span>
								<div class="pulse-main">
									<strong>{request.title}</strong><small
										>{propertyName(request.property_id)} · {spaceName(request.space_id)} · {dateLabel(
											request.reported_at ?? request.created_at
										)}</small
									>
								</div>
								<span class="tag category">{label(categories, request.category)}</span><span
									class="tag priority {request.priority}"
									>{label(priorityLabels, request.priority)}</span
								>
							</div>{/each}
					</div>{/if}
			</section>
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Work mix</p>
						<h2>Issues by category</h2>
						<p>Use patterns to plan recurring work.</p>
					</div>
				</div>
				{#if categoryCounts.length === 0}<div class="empty compact">
						<strong>No categories yet.</strong>
						<p>Every request will be grouped here.</p>
					</div>{:else}<div class="category-list">
						{#each categoryCounts as item (item.key)}<div class="category-line">
								<div><span>{item.label}</span><strong>{item.count}</strong></div>
								<div class="bar">
									<i style={`width: ${(item.count / Math.max(data.maintenance.length, 1)) * 100}%`}
									></i>
								</div>
							</div>{/each}
					</div>{/if}
			</section>
		</div>
		<section class="panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Live tracker</p>
					<h2>Recent work orders</h2>
					<p>Each request moves through a visible operational path.</p>
				</div>
				<button class="secondary" type="button" onclick={() => (view = 'requests')}
					>Open request board <span>→</span></button
				>
			</div>
			{#if data.maintenance.length === 0}<div class="empty">
					<strong>No maintenance requests yet.</strong>
					<p>Log the first issue to start the operating record.</p>
				</div>{:else}<div class="tracker-table">
					<div class="tracker-head">
						<span>Request</span><span>Location</span><span>Progress</span><span>Priority</span><span
							>Reported</span
						>
					</div>
					{#each data.maintenance.slice(0, 6) as request (request.id)}<div class="tracker-row">
							<div>
								<strong>{request.title}</strong><small
									>{shortId(request.id)} · {label(categories, request.category)}</small
								>
							</div>
							<div>
								<strong>{propertyName(request.property_id)}</strong><small
									>{spaceName(request.space_id)}</small
								>
							</div>
							<div class="mini-progress">
								<div>
									{#each ['reported', 'triage', 'assigned', 'in_progress', 'completed'] as step, i (step)}<span
											class:done={i <= statusIndex(request.status)}
											class:current={i === statusIndex(request.status)}
											title={statusLabels[step]}
										></span>{/each}
								</div>
								<small>{label(statusLabels, request.status)}</small>
							</div>
							<span class="tag priority {request.priority}"
								>{label(priorityLabels, request.priority)}</span
							><small>{dateLabel(request.reported_at ?? request.created_at)}</small>
						</div>{/each}
				</div>{/if}
		</section>
	{:else if view === 'requests'}
		<div class="maintenance-grid requests-layout">
			{#if false}<section class="panel form-panel request-intake-panel" aria-hidden="true">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">New request</p>
						<h2>Log a maintenance issue</h2>
						<p>Capture what was reported. Planning and assignment happen separately in Planned work.</p>
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
								>Category<select name="category"
									><option value="general">General</option
									>{#each Object.entries(categories) as item (item[0])}<option value={item[0]}
											>{item[1]}</option
										>{/each}</select
								></label
							>
						</div>
						<div class="form-grid three">
							<label
								>Priority<select name="priority"
									><option value="normal">Normal</option><option value="low">Low</option><option
										value="high">High</option
									><option value="urgent">Urgent</option></select
								></label
							><label
								>Reported by<select name="reporter_person_id"
									><option value="">Not linked</option
									>{#each data.people as person (person.id)}<option value={person.id}
											>{person.first_name} {person.last_name}</option
										>{/each}</select
								></label
							><label
								>Source<select name="source"
									><option value="client">Client</option><option value="staff">Staff</option><option
										value="inspection">Inspection</option
									><option value="preventive">Preventive</option></select
								></label
							>
						</div>
						<label
							>Description<textarea
								name="description"
								rows="4"
								placeholder="What happened, when it was noticed, access notes, and any safety concern"
							></textarea></label
						>
						<div class="form-grid two schedule-fields">
							<label>Service target <small>Optional</small><input name="sla_due_at" type="datetime-local" /></label><label
								>Estimated cost ({data.organization.currency_code})<input
									name="estimated_cost"
									type="number"
									min="0"
									step="0.01"
								/></label
							>
						</div>
						<button class="primary" type="submit">Log maintenance request <span>→</span></button>
					</form>{/if}
			</section>{/if}
			<section class="panel board-panel request-board-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Request board</p>
						<h2>Reported issues</h2>
						<p>Tenant and inspection reports arrive here as an intake register. Assignment, scheduling, and progress are managed in Planned work.</p>
					</div>
					<span class="count">{requestBoardRequests.length} open</span>
				</div>
				<div class="filters">
					<input
						aria-label="Search requests"
						placeholder="Search requests"
						bind:value={search}
					/><select aria-label="Filter category" bind:value={categoryFilter}
						><option value="all">All categories</option
						>{#each Object.entries(categories) as item (item[0])}<option value={item[0]}
								>{item[1]}</option
							>{/each}</select
					><select aria-label="Filter priority" bind:value={priorityFilter}
						><option value="all">All priorities</option
						>{#each Object.entries(priorityLabels) as item (item[0])}<option value={item[0]}
								>{item[1]}</option
							>{/each}</select
					>
				</div>
				{#if requestBoardRequests.length > 0}<div class="request-table-wrap">
					<table class="system-table request-table">
						<thead><tr><th>Request</th><th>Location</th><th>Reported by</th><th>Reported</th><th>Category</th><th>Priority</th><th>Evidence</th></tr></thead>
						<tbody>{#each requestBoardRequests as request (request.id)}<tr>
							<td><strong>{request.title}</strong><small>{shortId(request.id)}</small>{#if request.description}<p>{request.description}</p>{/if}</td>
							<td><strong>{propertyName(request.property_id)}</strong><small>{spaceName(request.space_id)}</small></td>
							<td><strong>{request.reporter_person_id ? personName(request.reporter_person_id) : 'Not linked'}</strong><small>{label(sourceLabels, request.source)}</small></td>
							<td>{dateLabel(request.reported_at ?? request.created_at)}</td>
							<td><span class="tag category">{label(categories, request.category)}</span></td>
							<td><span class="tag priority {request.priority}">{label(priorityLabels, request.priority)}</span></td>
							<td>{attachmentsFor(request.id).length} file{attachmentsFor(request.id).length === 1 ? '' : 's'}</td>
						</tr>{/each}</tbody>
					</table>
				</div>{/if}
				{#if requestBoardRequests.length === 0}<div class="empty compact">
						<strong>No matching requests.</strong>
						<p>Try clearing a filter. New requests are submitted by tenants and inspections.</p>
					</div>{:else if false}<div class="request-list">
						{#each visibleRequests as request (request.id)}<article class="request-card">
								<div class="request-top">
									<div>
										<div class="request-title">
											<span class="priority-dot {request.priority}"></span><strong
												>{request.title}</strong
											>
										</div>
										<small
											>{shortId(request.id)} · {propertyName(request.property_id)} · {spaceName(
												request.space_id
											)}</small
										>
									</div>
									<div class="request-tags">
										<span class="tag category">{label(categories, request.category)}</span><span
											class="tag priority {request.priority}"
											>{label(priorityLabels, request.priority)}</span
										>
									</div>
								</div>
								<div class="request-meta">
									<span><b>Reported by</b>{request.reporter_person_id ? personName(request.reporter_person_id) : 'Not linked'}</span><span
										><b>Reported</b>{dateLabel(request.reported_at ?? request.created_at)}</span
									><span><b>Assigned</b>{personName(request.assigned_person_id)}</span><span
										><b>Estimate</b>{request.estimated_cost
											? money(request.estimated_cost)
											: 'Not set'}</span
									>
								</div>
								<div class="progress-line">
									<div>
										{#each ['reported', 'triage', 'assigned', 'in_progress', 'completed'] as step, i (step)}<span
												class:done={i <= statusIndex(request.status)}
												class:current={i === statusIndex(request.status)}
											></span>{/each}
									</div>
									<small>{label(statusLabels, request.status)}</small>
								</div>
								<form method="POST" action="?/updateMaintenanceRequest" class="request-edit">
									<input type="hidden" name="request_id" value={request.id} /><select
										name="status"
										aria-label="Request status"
										>{#each statuses as status (status)}<option
												value={status}
												selected={request.status === status}>{statusLabels[status]}</option
											>{/each}</select
									><select name="category" aria-label="Request category"
										>{#each Object.entries(categories) as item (item[0])}<option
												value={item[0]}
												selected={request.category === item[0]}>{item[1]}</option
											>{/each}</select
									><select name="priority" aria-label="Request priority"
										>{#each Object.entries(priorityLabels) as item (item[0])}<option
												value={item[0]}
												selected={request.priority === item[0]}>{item[1]}</option
											>{/each}</select
									><select name="assigned_person_id" aria-label="Assigned person"
										><option value="">Unassigned</option
										>{#each data.people as person (person.id)}<option
												value={person.id}
												selected={request.assigned_person_id === person.id}
												>{person.first_name} {person.last_name}</option
											>{/each}</select
									><select name="vendor_id" aria-label="Vendor"
										><option value="">No contractor</option
										>{#each activeVendors as vendor (vendor.id)}<option
												value={vendor.id}
												selected={request.vendor_id === vendor.id}>{vendor.business_name}</option
											>{/each}</select
									><input
										name="scheduled_for"
										type="date"
										value={request.scheduled_for ?? ''}
										aria-label="Scheduled date"
									/><input
										name="actual_cost"
										type="number"
										min="0"
										step="0.01"
										value={request.actual_cost ?? ''}
										placeholder="Actual cost"
										aria-label="Actual cost"
									/><button class="secondary" type="submit">Save update <span>→</span></button>
								</form>
								{#if request.description}<p class="request-description">
										{request.description}
									</p>{/if}{#if updatesFor(request.id).length > 0}<div class="update-preview">
										<strong>Latest update</strong><span>{updatesFor(request.id)[0].body}</span
										><small>{dateLabel(updatesFor(request.id)[0].created_at)}</small>
									</div>{/if}
								<form method="POST" action="?/addMaintenanceUpdate" class="quick-update">
									<input type="hidden" name="request_id" value={request.id} /><input
										name="body"
										placeholder="Add a progress note or access update…"
									/><button class="text-link" type="submit">Post note →</button>
								</form>
								<div class="attachment-area">
									<div class="attachment-heading">
										<strong>Evidence & documents</strong><small
											>{attachmentsFor(request.id).length} attachment{attachmentsFor(request.id)
												.length === 1
												? ''
												: 's'}</small
										>
									</div>
									{#if attachmentsFor(request.id).length > 0}<div class="attachment-list">
											{#each attachmentsFor(request.id) as attachment (attachment.id)}<div
													class="attachment-row"
												>
													<a href={attachment.url ?? '#'} target="_blank" rel="noreferrer"
														>{attachment.file_name}</a
													><small
														>{Math.max(1, Math.round((attachment.file_size ?? 0) / 1024))} KB</small
													>
													<form method="POST" action="?/deleteMaintenanceAttachment">
														<input
															type="hidden"
															name="attachment_id"
															value={attachment.id}
														/><button class="text-button" type="submit">Remove</button>
													</form>
												</div>{/each}
										</div>{/if}
									<form
										method="POST"
										action="?/uploadMaintenanceAttachment"
										enctype="multipart/form-data"
										class="attachment-upload"
									>
										<input type="hidden" name="request_id" value={request.id} /><input
											name="file"
											type="file"
											accept="image/jpeg,image/png,image/webp,application/pdf"
											required
										/><button class="secondary" type="submit">Attach file <span>→</span></button>
									</form>
								</div>
							</article>{/each}
					</div>{/if}
			</section>
		</div>
	{:else if view === 'planned'}
		<section class="panel full-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Planned work</p>
					<h2>Plan and deliver work</h2>
					<p>Assign an internal resource or external contractor from the vendor directory, set the planned start, then move each task through to completion.</p>
				</div>
				<button class="secondary" type="button" onclick={() => (view = 'requests')}
					>Manage requests <span>→</span></button
				>
			</div>
			{#if workQueue.length === 0}<div class="empty">
					<strong>No open maintenance work.</strong>
					<p>New requests will appear here for internal planning.</p>
				</div>{:else}<div class="planned-list">
					{#each workQueue as request (request.id)}<article class="planned-task"><div class="planned-row">
							<div class="date-block">
								{#if request.scheduled_for}<strong>{new Date(request.scheduled_for).getDate()}</strong><small>{new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(request.scheduled_for))}</small>{:else}<strong>+</strong><small>Plan</small>{/if}
							</div>
							<div>
								<strong>{request.title}</strong><small
									>{propertyName(request.property_id)} · {spaceName(request.space_id)} · {label(
										categories,
										request.category
									)}</small
								>
							</div>
							<span class="tag priority {request.priority}"
								>{label(priorityLabels, request.priority)}</span
							><span class="tag status {request.status}">{label(statusLabels, request.status)}</span
							><span class="muted">{request.vendor_id ? vendorName(request.vendor_id) : 'Unassigned'}</span>
						</div>
						<form method="POST" action="?/scheduleMaintenanceRequest" class="task-plan-form">
							<input type="hidden" name="request_id" value={request.id} />
							<label>Planned start<input name="scheduled_for" type="date" value={request.scheduled_for ?? ''} required /></label>
							<label>Assigned resource<select name="vendor_id"><option value="">Not assigned</option>{#each activeVendors as vendor (vendor.id)}<option value={vendor.id} selected={request.vendor_id === vendor.id}>{vendor.business_name} · {vendor.resource_type === 'internal' ? 'Internal' : 'External'}</option>{/each}</select></label>
							<button class="secondary" type="submit">Save plan</button>
						</form>
						{#if request.status === 'in_progress'}<form method="POST" action="?/finishMaintenanceTask" class="task-complete-form"><input type="hidden" name="request_id" value={request.id} /><input name="resolution_notes" placeholder="Work completed / resolution notes" /><input name="actual_cost" type="number" min="0" step="0.01" placeholder={`Actual cost (${data.organization.currency_code})`} /><button class="primary" type="submit">Finish task <span>→</span></button></form>{:else if request.status !== 'completed' && request.status !== 'closed'}<form method="POST" action="?/startMaintenanceTask" class="task-start-form"><input type="hidden" name="request_id" value={request.id} /><button class="primary" type="submit" disabled={!request.scheduled_for}>Start maintenance task <span>→</span></button>{#if !request.scheduled_for}<small>Set a planned start before starting this task.</small>{/if}</form>{/if}
					</article>{/each}
				</div>{/if}
		</section>
	{:else if view === 'vendors'}
		<div class="maintenance-grid">
			<section class="panel form-panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Maintenance resources</p>
						<h2>Add a vendor or team</h2>
						<p>Keep internal crews and external contractors close to the work they support.</p>
					</div>
					<span class="count">{activeVendors.length} active</span>
				</div>
				<form method="POST" action="?/createMaintenanceVendor" class="form-stack">
					<div class="form-grid two">
						<label
							>Business name<input
								name="business_name"
								required
								placeholder="Moyo Plumbing & Electrical"
							/></label
						><label>Contact person<input name="contact_name" placeholder="Primary contact" /></label
						>
					</div>
					<label>Resource type<select name="resource_type"><option value="internal">Internal maintenance team</option><option value="external" selected>External vendor / contractor</option></select></label>
					<div class="form-grid two">
						<label>Email<input name="email" type="email" placeholder="ops@contractor.com" /></label
						><label>Phone<input name="phone" placeholder="+263 7…" /></label>
					</div>
					<fieldset class="vendor-specialty-fieldset"><legend>Specialties</legend><div class="vendor-category-grid">{#each Object.entries(categories) as [key, label] (key)}<label class="checkbox-label"><input name="specialties" type="checkbox" value={key} /> {label}</label>{/each}</div></fieldset>
					<div class="form-grid two">
						<label
							>Hourly rate ({data.organization.currency_code})<input
								name="hourly_rate"
								type="number"
								min="0"
								step="0.01"
							/></label
						><label class="checkbox-label"
							><input name="emergency_available" type="checkbox" /> Available for emergency call-outs</label
						>
					</div>
					<label
						>Notes<textarea
							name="notes"
							rows="3"
							placeholder="Access instructions, warranty terms, preferred payment process"
						></textarea></label
					>
					<button class="primary" type="submit">Add maintenance resource <span>→</span></button>
				</form>
			</section>
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Resource directory</p>
						<h2>Vendors and internal team</h2>
						<p>Assign an active maintenance resource from Planned work.</p>
					</div>
				</div>
				<div class="filters vendor-filters">
					<input aria-label="Search maintenance resources" placeholder="Search resources" bind:value={vendorSearch} oninput={() => (vendorPage = 1)} />
					<select aria-label="Filter resource type" bind:value={vendorFilter} onchange={() => (vendorPage = 1)}><option value="all">All resources</option><option value="internal">Internal team</option><option value="external">External vendors</option></select>
					<select aria-label="Filter resource status" bind:value={vendorStatusFilter} onchange={() => (vendorPage = 1)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
					<select aria-label="Filter specialty" bind:value={vendorSpecialtyFilter} onchange={() => (vendorPage = 1)}><option value="all">All specialties</option>{#each specialtyOptions as specialty (specialty)}<option value={specialty}>{specialty}</option>{/each}</select>
				</div>
				{#if visibleVendors.length > 0}<div class="vendor-table-wrap">
					<table class="system-table vendor-table">
						<thead><tr><th>Resource</th><th>Type</th><th>Specialties</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead>
						<tbody>{#each pagedVendors as vendor (vendor.id)}<tr>
							<td><strong>{vendor.business_name}</strong><small>{vendor.contact_name || 'No contact name'}</small></td>
							<td><span class="tag resource-type">{vendor.resource_type === 'internal' ? 'Internal team' : 'External vendor'}</span></td>
							<td>{(vendor.specialties ?? []).join(', ') || 'General maintenance'}</td>
							<td>{vendor.phone || vendor.email || 'No contact details'}</td>
							<td><span class="tag status">{vendor.status === 'active' ? 'Active' : 'Inactive'}</span>{#if vendor.emergency_available}<small class="table-note">Emergency ready</small>{/if}</td>
							<td><form method="POST" action="?/updateMaintenanceVendor" class="vendor-status-form"><input type="hidden" name="vendor_id" value={vendor.id} /><select name="status" aria-label={`Status for ${vendor.business_name}`}><option value="active" selected={vendor.status === 'active'}>Active</option><option value="inactive" selected={vendor.status === 'inactive'}>Inactive</option></select><button class="text-link" type="submit">Save</button></form></td>
						</tr>{/each}</tbody>
					</table>
					<div class="pagination"><small>Showing {(effectiveVendorPage - 1) * 10 + 1}–{Math.min(effectiveVendorPage * 10, visibleVendors.length)} of {visibleVendors.length}</small><div><button class="secondary" type="button" disabled={effectiveVendorPage === 1} onclick={() => (vendorPage = Math.max(1, effectiveVendorPage - 1))}>Previous</button><span>Page {effectiveVendorPage} of {vendorPageCount}</span><button class="secondary" type="button" disabled={effectiveVendorPage === vendorPageCount} onclick={() => (vendorPage = Math.min(vendorPageCount, effectiveVendorPage + 1))}>Next</button></div></div>
				</div>{/if}
				{#if visibleVendors.length === 0}<div class="empty compact">
						<strong>{data.maintenanceVendors.length === 0 ? 'No maintenance resources yet.' : 'No resources match these filters.'}</strong>
						<p>{data.maintenanceVendors.length === 0 ? 'Add an internal team or external contractor to make assignment easier.' : 'Try clearing a filter or searching for another resource.'}</p>
					</div>{:else}<div class="vendor-list resource-directory-old">
						{#each visibleVendors as vendor (vendor.id)}<article class="vendor-row">
								<div class="vendor-mark">{vendor.business_name.slice(0, 1).toUpperCase()}</div>
								<div>
									<strong>{vendor.business_name}</strong><small
										>{vendor.contact_name || 'No contact name'} · {vendor.phone ||
											vendor.email ||
											'No contact details'}</small
									>
									<div class="specialty-list">
										{#each vendor.specialties ?? [] as specialty (specialty)}<span>{specialty}</span
											>{/each}
									</div>
								</div>
								<div class="vendor-side">
									<span class="tag resource-type">{vendor.resource_type === 'internal' ? 'Internal team' : 'External vendor'}</span>
									{#if vendor.emergency_available}<span class="tag status">Emergency ready</span
										>{/if}
									<form method="POST" action="?/updateMaintenanceVendor">
										<input type="hidden" name="vendor_id" value={vendor.id} /><select
											name="status"
											aria-label="Vendor status"
											><option value="active" selected={vendor.status === 'active'}>Active</option
											><option value="inactive" selected={vendor.status === 'inactive'}
												>Inactive</option
											></select
										><button class="text-link" type="submit">Save</button>
									</form>
								</div>
							</article>{/each}
					</div>{/if}
			</section>
		</div>
	{:else if view === 'preventive'}
		<section class="panel full-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Preventive care</p>
					<h2>Keep assets ahead of failure</h2>
					<p>
						Set a recurring plan once, then generate a traceable work order when it becomes due.
					</p>
				</div>
				<form method="POST" action="?/generatePreventiveWork">
					<button class="primary" type="submit"
						>Generate due work ({duePlans.length}) <span>→</span></button
					>
				</form>
			</div>
			<div class="maintenance-grid">
				<form method="POST" action="?/createMaintenancePlan" class="form-stack">
					<div class="form-grid two">
						<label
							>Plan title<input
								name="title"
								required
								placeholder="Quarterly air-conditioner service"
							/></label
						><label
							>Property<select name="property_id" required
								><option value="">Choose property</option
								>{#each data.properties as property (property.id)}<option value={property.id}
										>{property.name}</option
									>{/each}</select
							></label
						>
					</div>
					<div class="form-grid two">
						<label
							>Space <small>Optional</small><select name="space_id"
								><option value="">Whole property</option
								>{#each data.spaces as space (space.id)}<option value={space.id}
										>{space.name} · {propertyName(space.property_id)}</option
									>{/each}</select
							></label
						><label
							>Contractor<select name="vendor_id"
								><option value="">No contractor</option
								>{#each activeVendors as vendor (vendor.id)}<option value={vendor.id}
										>{vendor.business_name}</option
									>{/each}</select
							></label
						>
					</div>
					<div class="form-grid three">
						<label
							>Category<select name="category"
								>{#each Object.entries(categories) as item (item[0])}<option value={item[0]}
										>{item[1]}</option
									>{/each}</select
							></label
						><label
							>Frequency<select name="frequency_unit"
								>{#each Object.entries(frequencyLabels) as item (item[0])}<option value={item[0]}
										>{item[1]}</option
									>{/each}</select
							></label
						><label
							>Every <small>Number of periods</small><input
								name="interval_count"
								type="number"
								min="1"
								value="1"
							/></label
						>
					</div>
					<div class="form-grid three">
						<label>First due date<input name="next_due_on" type="date" required /></label><label
							>Priority<select name="priority"
								>{#each Object.entries(priorityLabels) as item (item[0])}<option value={item[0]}
										>{item[1]}</option
									>{/each}</select
							></label
						><label
							>Estimated cost ({data.organization.currency_code})<input
								name="estimated_cost"
								type="number"
								min="0"
								step="0.01"
							/></label
						>
					</div>
					<label
						>Work scope<textarea
							name="description"
							rows="3"
							placeholder="What should be checked, serviced or replaced?"></textarea></label
					><button class="secondary" type="submit">Save preventive plan <span>→</span></button>
				</form>
				<div class="plan-list">
					{#if data.maintenancePlans.length === 0}<div class="empty compact">
							<strong>No preventive plans yet.</strong>
							<p>Start with a regular inspection or service schedule.</p>
						</div>{:else}{#each data.maintenancePlans as plan (plan.id)}<article class="plan-row">
								<div>
									<div class="request-title">
										<span class="priority-dot {plan.priority}"></span><strong>{plan.title}</strong>
									</div>
									<small
										>{propertyName(plan.property_id)} · {label(categories, plan.category)} · {label(
											frequencyLabels,
											plan.frequency_unit
										)}</small
									><small
										>Next due {dateLabel(plan.next_due_on)} · {vendorName(plan.vendor_id)}</small
									>
								</div>
								<span
									class:overdue={plan.next_due_on <= new Date().toISOString().slice(0, 10)}
									class="due-label">{plan.active ? dateLabel(plan.next_due_on) : 'Paused'}</span
								>
								<form method="POST" action="?/generatePreventiveWork">
									<input type="hidden" name="plan_id" value={plan.id} /><button
										class="text-link"
										type="submit">Generate →</button
									>
								</form>
							</article>{/each}{/if}
				</div>
			</div>
		</section>
	{:else if view === 'sla'}
		<section class="panel full-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Service levels</p>
					<h2>SLA watch</h2>
					<p>
						Requests with a service target are checked for due-soon and overdue reminders. The check
						is safe to run repeatedly.
					</p>
				</div>
				<form method="POST" action="?/runMaintenanceSlaCheck">
					<button class="primary" type="submit">Run SLA check <span>→</span></button>
				</form>
			</div>
			<div class="metric-row">
				<div class="metric-card dark">
					<span>Open reminders</span><strong>{openReminders.length}</strong><small
						>Requires acknowledgement</small
					>
				</div>
				<div class="metric-card">
					<span>Overdue</span><strong
						>{openReminders.filter(
							(item: { reminder_type: string }) => item.reminder_type === 'overdue'
						).length}</strong
					><small>Past service target</small>
				</div>
				<div class="metric-card">
					<span>Due soon</span><strong
						>{openReminders.filter(
							(item: { reminder_type: string }) => item.reminder_type === 'due_soon'
						).length}</strong
					><small>Next 24 hours</small>
				</div>
				<div class="metric-card">
					<span>Configured targets</span><strong
						>{data.maintenance.filter((item: { sla_due_at?: string | null }) =>
							Boolean(item.sla_due_at)
						).length}</strong
					><small>Requests with an SLA</small>
				</div>
			</div>
			{#if openReminders.length === 0}<div class="empty">
					<strong>No open SLA reminders.</strong>
					<p>Run a check after adding service targets to maintenance requests.</p>
				</div>{:else}<div class="reminder-list">
					{#each openReminders as reminder (reminder.id)}{@const request = reminderRequest(
							reminder.request_id
						)}
						<article class="reminder-row">
							<span class="reminder-icon {reminder.reminder_type}">!</span>
							<div>
								<strong>{request?.title ?? 'Maintenance request'}</strong><small
									>{request
										? `${propertyName(request.property_id)} · ${spaceName(request.space_id)}`
										: 'Request unavailable'}</small
								>
							</div>
							<span class="tag priority {reminder.reminder_type === 'overdue' ? 'urgent' : 'high'}"
								>{reminderLabel(reminder.reminder_type)}</span
							><span class="muted">Target {dateLabel(reminder.due_at)}</span>
							<form method="POST" action="?/acknowledgeMaintenanceReminder">
								<input type="hidden" name="reminder_id" value={reminder.id} /><button
									class="text-link"
									type="submit">Acknowledge</button
								>
							</form>
						</article>{/each}
				</div>{/if}
		</section>
	{:else}
		<section class="panel full-panel">
			<div class="panel-heading">
				<div>
					<p class="eyebrow">Maintenance history</p>
					<h2>Completed work</h2>
					<p>A durable record of what was fixed, when, and at what cost.</p>
				</div>
				<button class="secondary" type="button" onclick={() => (view = 'requests')}
					>Back to board <span>→</span></button
				>
			</div>
			{#if historyRequests.length === 0}<div class="empty">
					<strong>No completed requests yet.</strong>
					<p>Completed and closed work orders will be retained here.</p>
				</div>{:else}<div class="history-list">
					{#each historyRequests as request (request.id)}<article class="history-row">
							<div>
								<div class="request-title">
									<span class="priority-dot {request.priority}"></span><strong
										>{request.title}</strong
									>
								</div>
								<small
									>{shortId(request.id)} · {propertyName(request.property_id)} · {label(
										categories,
										request.category
									)}</small
								>
							</div>
							<div>
								<b>Completed</b><span
									>{dateLabel(
										request.completed_at ?? request.updated_at ?? request.created_at
									)}</span
								>
							</div>
							<div>
								<b>Actual cost</b><span
									>{request.actual_cost ? money(request.actual_cost) : 'Not recorded'}</span
								>
							</div>
							<span class="tag status {request.status}">{label(statusLabels, request.status)}</span>
						</article>
						{#if request.resolution_notes}<p class="resolution">
								<b>Resolution:</b>
								{request.resolution_notes}
							</p>{/if}{/each}
				</div>{/if}
		</section>
	{/if}
</div>

<style>
	.maintenance-shell {
		display: grid;
		gap: 18px;
	}
	.maintenance-nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 18px;
		padding: 14px 16px;
		border: 1px solid #dfeae1;
		border-radius: 13px;
		background: #f9fcf7;
	}
	.nav-label,
	.eyebrow {
		display: block;
		color: #6f907d;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.17em;
		text-transform: uppercase;
	}
	.maintenance-nav strong {
		display: block;
		color: #0b4036;
		font-size: 18px;
		letter-spacing: -0.04em;
		margin-top: 4px;
	}
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}
	.tabs button,
	.tabs a {
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: #668579;
		cursor: pointer;
		font: inherit;
		font-size: 12px;
		font-weight: 700;
		padding: 10px 12px;
		text-decoration: none;
	}
	.tabs button.active {
		background: #0c5147;
		color: white;
	}
	.inline-feedback {
		border-radius: 9px;
		background: #edf8df;
		color: #336c4e;
		font-size: 12px;
		padding: 11px 14px;
	}
	.inline-feedback:not(.success) {
		background: #fff0eb;
		color: #a35545;
	}
	.metric-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
	}
	.metric-card {
		min-height: 116px;
		border: 1px solid #dfeae1;
		border-radius: 12px;
		background: white;
		padding: 18px;
	}
	.metric-card.dark {
		background: #074a41;
		border-color: #074a41;
		color: white;
	}
	.metric-card span,
	.metric-card small {
		display: block;
		color: #789287;
		font-size: 11px;
	}
	.metric-card.dark span,
	.metric-card.dark small {
		color: #b9d7c1;
	}
	.metric-card strong {
		display: block;
		color: #0b4036;
		font-size: 28px;
		letter-spacing: -0.06em;
		margin: 14px 0 5px;
	}
	.metric-card.dark strong {
		color: white;
	}
	.overview-grid,
	.maintenance-grid {
		display: grid;
		grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
		gap: 16px;
		align-items: start;
	}
	.panel {
		border: 1px solid #dfeae1;
		border-radius: 13px;
		background: white;
		padding: 21px;
	}
	.panel-heading {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		margin-bottom: 18px;
	}
	.panel-heading h2 {
		color: #0b4036;
		font-size: 23px;
		letter-spacing: -0.05em;
		margin: 6px 0 5px;
	}
	.panel-heading p:not(.eyebrow) {
		color: #759083;
		font-size: 12px;
		line-height: 1.5;
		margin: 0;
	}
	.count {
		border-radius: 999px;
		background: #eef6dd;
		color: #4e8168;
		font-size: 11px;
		font-weight: 800;
		padding: 8px 10px;
		white-space: nowrap;
	}
	.text-link {
		border: 0;
		background: transparent;
		color: #39816b;
		cursor: pointer;
		font: inherit;
		font-size: 12px;
		font-weight: 800;
		padding: 5px 0;
		white-space: nowrap;
	}
	.secondary,
	.primary {
		border: 0;
		border-radius: 8px;
		cursor: pointer;
		font: inherit;
		font-size: 12px;
		font-weight: 800;
		padding: 12px 15px;
	}
	.secondary {
		background: #eef6ed;
		color: #19604f;
	}
	.primary {
		background: #075147;
		color: white;
	}
	.secondary span,
	.primary span {
		color: #c9e64a;
		margin-left: 8px;
	}
	.pulse-list,
	.category-list,
	.planned-list,
	.history-list {
		display: grid;
		gap: 8px;
	}
	.pulse-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 10px;
		border-bottom: 1px solid #edf2ed;
		padding: 10px 0;
	}
	.pulse-row:last-child {
		border-bottom: 0;
	}
	.pulse-main strong,
	.pulse-main small,
	.tracker-row strong,
	.tracker-row small,
	.planned-row strong,
	.planned-row small,
	.history-row b,
	.history-row span {
		display: block;
	}
	.pulse-main strong,
	.tracker-row strong,
	.planned-row strong {
		color: #214e40;
		font-size: 12px;
	}
	.pulse-main small,
	.tracker-row small,
	.planned-row small,
	.history-row span {
		color: #8aa096;
		font-size: 10px;
		margin-top: 4px;
	}
	.priority-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #88a49a;
	}
	.priority-dot.urgent {
		background: #d94d43;
		box-shadow: 0 0 0 4px #fde9e5;
	}
	.priority-dot.high {
		background: #e38b39;
		box-shadow: 0 0 0 4px #fff2e2;
	}
	.priority-dot.normal {
		background: #438e78;
		box-shadow: 0 0 0 4px #e8f5e8;
	}
	.priority-dot.low {
		background: #91a2a1;
		box-shadow: 0 0 0 4px #edf1ef;
	}
	.tag {
		display: inline-block;
		border-radius: 999px;
		font-size: 10px;
		font-weight: 800;
		padding: 6px 8px;
		white-space: nowrap;
	}
	.tag.category {
		background: #f0f6e8;
		color: #557864;
	}
	.tag.priority.urgent {
		background: #fff0ed;
		color: #bd453c;
	}
	.tag.priority.high {
		background: #fff3df;
		color: #ae681d;
	}
	.tag.priority.normal {
		background: #eaf6f0;
		color: #34765e;
	}
	.tag.priority.low {
		background: #eef2f1;
		color: #657d75;
	}
	.tag.status {
		background: #eef6dd;
		color: #55805f;
	}
	.category-line {
		display: grid;
		gap: 7px;
	}
	.category-line > div:first-child {
		display: flex;
		justify-content: space-between;
		color: #638073;
		font-size: 12px;
	}
	.category-line strong {
		color: #285d4b;
	}
	.bar {
		height: 7px;
		border-radius: 99px;
		background: #eff4ef;
		overflow: hidden;
	}
	.bar i {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: #9ac947;
	}
	.tracker-table {
		display: grid;
		overflow-x: auto;
	}
	.tracker-head,
	.tracker-row {
		display: grid;
		grid-template-columns: 1.3fr 1fr 1.1fr 0.65fr 0.7fr;
		gap: 14px;
		align-items: center;
		min-width: 700px;
	}
	.tracker-head {
		color: #90a197;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.08em;
		padding: 0 0 9px;
		text-transform: uppercase;
	}
	.tracker-row {
		border-top: 1px solid #edf2ed;
		padding: 13px 0;
	}
	.mini-progress,
	.progress-line {
		min-width: 118px;
	}
	.mini-progress > div,
	.progress-line > div {
		display: flex;
		align-items: center;
		gap: 3px;
	}
	.mini-progress span,
	.progress-line span {
		display: block;
		height: 6px;
		flex: 1;
		min-width: 15px;
		border-radius: 9px;
		background: #e8eeea;
	}
	.mini-progress span.done,
	.progress-line span.done {
		background: #94c749;
	}
	.mini-progress span.current,
	.progress-line span.current {
		box-shadow: 0 0 0 3px #eaf4d8;
	}
	.mini-progress small,
	.progress-line small {
		display: block;
		color: #779187;
		font-size: 10px;
		margin-top: 5px;
	}
	.form-stack {
		display: grid;
		gap: 12px;
	}
	.form-grid {
		display: grid;
		gap: 10px;
	}
	.form-grid.two {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.form-grid.three {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	.schedule-fields > label {
		min-width: 0;
	}
	.schedule-fields input {
		min-width: 0;
		max-width: 100%;
	}
	.schedule-fields input[type='datetime-local'] {
		font-size: 11px;
		padding-left: 8px;
		padding-right: 8px;
	}
	label {
		display: grid;
		gap: 6px;
		color: #456b5c;
		font-size: 11px;
		font-weight: 800;
	}
	label small {
		color: #99aaa1;
		font-size: 10px;
		font-weight: 500;
	}
	input,
	select,
	textarea {
		box-sizing: border-box;
		width: 100%;
		border: 1px solid #dce9df;
		border-radius: 7px;
		background: #fbfdfb;
		color: #244a3b;
		font: inherit;
		font-size: 12px;
		padding: 11px 12px;
	}
	textarea {
		min-height: 88px;
		resize: vertical;
	}
	.filters {
		display: grid;
		grid-template-columns: 1.5fr 1fr 1fr;
		gap: 8px;
		margin-bottom: 13px;
	}
	.vendor-filters {
		grid-template-columns: minmax(180px, 1.4fr) repeat(3, minmax(130px, 0.8fr));
	}
	.vendor-table-wrap {
		overflow-x: auto;
		border: 1px solid #e3ede4;
		border-radius: 11px;
	}
	.vendor-table {
		width: 100%;
		min-width: 780px;
		border-collapse: collapse;
		text-align: left;
	}
	.vendor-table th {
		background: #f6faf4;
		color: #789287;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.08em;
		padding: 12px 14px;
		text-transform: uppercase;
	}
	.vendor-table td {
		border-top: 1px solid #edf2ed;
		color: #567768;
		font-size: 11px;
		padding: 12px 14px;
		vertical-align: middle;
	}
	.vendor-table td strong,
	.vendor-table td small {
		display: block;
	}
	.vendor-table td strong {
		color: #245442;
		font-size: 12px;
	}
	.vendor-table td small {
		color: #92a59b;
		font-size: 10px;
		margin-top: 3px;
	}
	.table-note {
		color: #789287 !important;
		font-size: 9px !important;
	}
	.vendor-status-form {
		display: flex;
		align-items: center;
		gap: 7px;
	}
	.vendor-status-form select {
		min-width: 90px;
		padding: 7px 8px;
	}
	.pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 12px;
	}
	.pagination > small {
		color: #8a9f94;
		font-size: 10px;
	}
	.pagination > div {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.pagination span {
		color: #587868;
		font-size: 10px;
		white-space: nowrap;
	}
	.pagination button {
		padding: 7px 10px;
	}
	.resource-directory-old {
		display: none;
	}
	.tag.resource-type {
		background: #edf5e4;
		color: #4b765c;
	}
	.request-list {
		display: grid;
		gap: 10px;
	}
	.requests-layout {
		display: block;
	}
	.request-intake-panel,
	.request-board-panel .request-list {
		display: none;
	}
	.request-table-wrap {
		overflow-x: auto;
		border: 1px solid #e3ede4;
		border-radius: 11px;
	}
	.request-table {
		width: 100%;
		min-width: 860px;
		border-collapse: collapse;
		text-align: left;
	}
	.request-table th {
		background: #f6faf4;
		color: #789287;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.08em;
		padding: 12px 14px;
		text-transform: uppercase;
	}
	.request-table td {
		border-top: 1px solid #edf2ed;
		color: #567768;
		font-size: 12px;
		padding: 13px 14px;
		vertical-align: top;
	}
	.request-table td strong,
	.request-table td small {
		display: block;
	}
	.request-table td strong {
		color: #245442;
		font-size: 12px;
	}
	.request-table td small {
		color: #92a59b;
		font-size: 10px;
		margin-top: 4px;
	}
	.request-table td p {
		color: #789287;
		font-size: 11px;
		line-height: 1.45;
		margin: 7px 0 0;
		max-width: 260px;
	}
	.request-card {
		border: 1px solid #e3ede4;
		border-radius: 10px;
		padding: 14px;
	}
	.request-top,
	.request-meta,
	.request-edit,
	.quick-update {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.request-top {
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
	}
	.request-title {
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.request-title strong {
		color: #1e4d3e;
		font-size: 14px;
	}
	.request-top small,
	.request-description {
		color: #8b9f95;
		font-size: 11px;
		line-height: 1.5;
	}
	.request-tags {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 5px;
	}
	.request-meta {
		flex-wrap: wrap;
		border-top: 1px solid #edf2ed;
		border-bottom: 1px solid #edf2ed;
		margin: 12px 0;
		padding: 10px 0;
	}
	.request-meta span {
		min-width: 90px;
		color: #6f8a7e;
		font-size: 10px;
	}
	.request-meta b,
	.history-row b {
		display: block;
		color: #a0aea7;
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 0.08em;
		margin-bottom: 4px;
		text-transform: uppercase;
	}
	/* The request board is an intake record. Internal workflow controls belong in Planned work. */
	.board-panel .request-meta span:nth-child(n + 3),
	.board-panel .progress-line,
	.board-panel .request-edit,
	.board-panel .quick-update,
	.board-panel .attachment-upload,
	.board-panel .attachment-row form {
		display: none;
	}
	.request-edit {
		flex-wrap: wrap;
		align-items: stretch;
	}
	.request-edit select,
	.request-edit input {
		flex: 1 1 105px;
		min-width: 0;
		padding: 9px;
	}
	.request-edit button {
		flex: 0 0 auto;
	}
	.request-description {
		margin: 11px 0 0;
	}
	.update-preview {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 7px;
		align-items: center;
		border-radius: 7px;
		background: #f4f8ef;
		color: #648275;
		font-size: 11px;
		margin-top: 10px;
		padding: 9px;
	}
	.update-preview strong {
		color: #456e5b;
		font-size: 10px;
	}
	.update-preview small {
		color: #93a299;
		font-size: 9px;
	}
	.quick-update {
		margin-top: 10px;
	}
	.quick-update input {
		padding: 9px;
	}
	.quick-update .text-link {
		font-size: 10px;
	}
	.planned-row,
	.history-row {
		display: grid;
		grid-template-columns: 56px minmax(0, 1.5fr) auto auto minmax(100px, 0.6fr);
		gap: 14px;
		align-items: center;
		border-bottom: 1px solid #edf2ed;
		padding: 12px 0;
	}
	.planned-task {
		border: 1px solid #e3ede4;
		border-radius: 11px;
		padding: 0 14px 14px;
	}
	.planned-task .planned-row {
		border-bottom: 1px solid #edf2ed;
	}
	.task-plan-form,
	.task-complete-form,
	.task-start-form {
		display: grid;
		gap: 9px;
		margin-top: 12px;
	}
	.task-plan-form {
		grid-template-columns: minmax(130px, 0.9fr) minmax(150px, 1fr) minmax(150px, 1fr) auto;
		align-items: end;
	}
	.task-plan-form .secondary,
	.task-complete-form .primary,
	.task-start-form .primary {
		align-self: end;
		white-space: nowrap;
	}
	.task-complete-form {
		grid-template-columns: minmax(220px, 1fr) minmax(130px, 0.4fr) auto;
		align-items: end;
	}
	.task-start-form {
		grid-template-columns: auto 1fr;
		align-items: center;
	}
	.task-start-form small {
		color: #8a9f94;
		font-size: 10px;
	}
	.primary:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}
	.planned-row:last-child,
	.history-row:last-child {
		border-bottom: 0;
	}
	.date-block {
		display: grid;
		place-content: center;
		width: 48px;
		height: 48px;
		border-radius: 9px;
		background: #edf6df;
		text-align: center;
	}
	.date-block strong {
		color: #2d654e;
		font-size: 18px;
		line-height: 1;
	}
	.date-block small {
		color: #73927e;
		font-size: 9px;
		margin: 3px 0 0;
		text-transform: uppercase;
	}
	.history-row {
		grid-template-columns: minmax(0, 1.5fr) auto auto auto;
	}
	.history-row > div:not(:first-child) {
		min-width: 100px;
	}
	.resolution {
		border-radius: 7px;
		background: #f8faf7;
		color: #6c8678;
		font-size: 11px;
		margin: -2px 0 8px;
		padding: 9px;
	}
	.resolution b {
		color: #456e5b;
	}
	.empty {
		display: grid;
		place-content: center;
		min-height: 170px;
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
		color: #8a9c93;
		font-size: 11px;
	}
	.attachment-area {
		border-top: 1px solid #edf2ed;
		margin-top: 13px;
		padding-top: 12px;
	}
	.attachment-heading,
	.attachment-row,
	.attachment-upload,
	.vendor-row,
	.plan-row,
	.reminder-row {
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.attachment-heading {
		justify-content: space-between;
		color: #456e5b;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.attachment-heading small {
		color: #93a299;
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0;
		text-transform: none;
	}
	.attachment-list {
		display: grid;
		gap: 5px;
		margin: 9px 0;
	}
	.attachment-row {
		justify-content: space-between;
		border: 1px solid #edf2ed;
		border-radius: 7px;
		padding: 7px 9px;
	}
	.attachment-row a {
		overflow: hidden;
		color: #3f765f;
		font-size: 11px;
		font-weight: 700;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.attachment-row small {
		color: #9aa9a1;
		font-size: 9px;
		white-space: nowrap;
	}
	.attachment-upload {
		align-items: stretch;
	}
	.attachment-upload input {
		flex: 1;
		padding: 8px;
	}
	.attachment-upload button {
		padding: 9px 11px;
		white-space: nowrap;
	}
	.checkbox-label {
		display: flex;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 8px;
		padding-top: 22px;
	}
	.vendor-specialty-fieldset {
		border: 1px solid #dce9df;
		border-radius: 8px;
		padding: 12px;
	}
	.vendor-specialty-fieldset legend {
		color: #456b5c;
		font-size: 11px;
		font-weight: 800;
		padding: 0 5px;
	}
	.vendor-category-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 7px;
	}
	.vendor-category-grid .checkbox-label {
		padding-top: 0;
	}
	.checkbox-label input {
		width: 16px;
		height: 16px;
		accent-color: #075147;
	}
	.vendor-list,
	.plan-list,
	.reminder-list {
		display: grid;
		gap: 8px;
	}
	.vendor-row,
	.plan-row,
	.reminder-row {
		align-items: flex-start;
		border: 1px solid #e3ede4;
		border-radius: 10px;
		padding: 12px;
	}
	.vendor-mark {
		display: grid;
		place-content: center;
		flex: 0 0 35px;
		height: 35px;
		border-radius: 9px;
		background: #edf6df;
		color: #326b51;
		font-size: 15px;
		font-weight: 800;
	}
	.vendor-row > div:nth-child(2),
	.plan-row > div,
	.reminder-row > div {
		flex: 1;
		min-width: 0;
	}
	.vendor-row strong,
	.plan-row strong,
	.reminder-row strong {
		color: #214e40;
		font-size: 12px;
	}
	.vendor-row small,
	.plan-row small,
	.reminder-row small {
		display: block;
		color: #8a9f94;
		font-size: 10px;
		line-height: 1.45;
		margin-top: 4px;
	}
	.vendor-side {
		display: grid;
		justify-items: end;
		gap: 7px;
	}
	.vendor-side form {
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.vendor-side select {
		width: auto;
		padding: 7px;
		font-size: 10px;
	}
	.specialty-list {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 6px;
	}
	.specialty-list span {
		border-radius: 99px;
		background: #f1f6ee;
		color: #6d8b7c;
		font-size: 9px;
		padding: 4px 6px;
	}
	.plan-row {
		align-items: center;
	}
	.plan-row form {
		flex: 0 0 auto;
	}
	.due-label {
		color: #4d7e61;
		font-size: 10px;
		font-weight: 800;
		white-space: nowrap;
	}
	.due-label.overdue {
		color: #bb5744;
	}
	.reminder-icon {
		display: grid;
		place-content: center;
		flex: 0 0 28px;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: #fff1df;
		color: #c06b21;
		font-weight: 900;
	}
	.reminder-icon.overdue {
		background: #ffebe8;
		color: #c6443d;
	}
	.reminder-row form {
		flex: 0 0 auto;
	}
	@media (max-width: 1050px) {
		.metric-row {
			grid-template-columns: repeat(2, 1fr);
		}
		.overview-grid,
		.maintenance-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 700px) {
		.maintenance-nav {
			align-items: flex-start;
			flex-direction: column;
		}
		.tabs {
			width: 100%;
		}
		.tabs button {
			flex: 1;
		}
		.form-grid.two,
		.form-grid.three,
		.filters {
			grid-template-columns: 1fr;
		}
		.panel {
			padding: 16px;
		}
		.request-top,
		.request-meta,
		.quick-update {
			align-items: flex-start;
			flex-direction: column;
		}
		.request-tags {
			justify-content: flex-start;
		}
		.attachment-upload,
		.vendor-row,
		.plan-row,
		.reminder-row {
			align-items: flex-start;
			flex-direction: column;
		}
		.vendor-side {
			align-items: start;
			justify-items: start;
		}
		.vendor-side form {
			width: 100%;
		}
		.vendor-side select {
			flex: 1;
			width: 100%;
		}
		.request-edit {
			display: grid;
			grid-template-columns: 1fr 1fr;
		}
		.request-edit button {
			width: 100%;
		}
		.planned-row,
		.history-row {
			align-items: start;
			grid-template-columns: 48px minmax(0, 1fr);
		}
		.planned-row > .tag,
		.planned-row > .muted,
		.history-row > .tag,
		.history-row > div:not(:first-child) {
			grid-column: 2;
		}
		.history-row {
			gap: 8px 12px;
		}
		.task-plan-form,
		.task-complete-form,
		.task-start-form {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 480px) {
		.metric-row {
			grid-template-columns: 1fr;
		}
		.request-edit {
			grid-template-columns: 1fr;
		}
		.request-edit > * {
			min-width: 0;
			width: 100%;
		}
		.update-preview {
			align-items: start;
			grid-template-columns: 1fr;
		}
	}
</style>
