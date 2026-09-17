<script lang="ts">
	let { data, form } = $props();
	const categories: Record<string, string> = {
		plumbing: 'Plumbing', electrical: 'Electrical', hvac: 'HVAC & climate', carpentry: 'Carpentry',
		landscaping: 'Landscaping', painting: 'Painting', flooring: 'Flooring', roofing: 'Roofing',
		security: 'Security', appliances: 'Appliances', pest_control: 'Pest control', cleaning: 'Cleaning', general: 'General'
	};
	let search = $state('');
	let typeFilter = $state('all');
	let statusFilter = $state('all');
	let specialtyFilter = $state('all');
	let page = $state(1);
	const specialtyOptions = $derived(Array.from(new Set(data.maintenanceVendors.flatMap((item: { specialties?: string[] }) => item.specialties ?? []))).sort() as string[]);
	const filtered = $derived(data.maintenanceVendors.filter((item: { business_name: string; contact_name?: string | null; email?: string | null; resource_type?: string; status: string; specialties?: string[] }) => {
		const needle = search.trim().toLowerCase();
		const haystack = `${item.business_name} ${item.contact_name ?? ''} ${item.email ?? ''}`.toLowerCase();
		return (!needle || haystack.includes(needle)) &&
			(typeFilter === 'all' || (item.resource_type ?? 'external') === typeFilter) &&
			(statusFilter === 'all' || item.status === statusFilter) &&
			(specialtyFilter === 'all' || (item.specialties ?? []).includes(specialtyFilter));
	}));
	const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / 10)));
	const currentPage = $derived(Math.min(page, pageCount));
	const rows = $derived(filtered.slice((currentPage - 1) * 10, currentPage * 10));
	const resetPage = () => (page = 1);
</script>

<svelte:head><title>Maintenance resources · {data.organization.name} · Musha</title></svelte:head>

<div class="directory-page">
	{#if form?.message}<div class:success={form.success} class="feedback">{form.message}</div>{/if}
	<div class="directory-heading"><div><p class="eyebrow">Maintenance workspace</p><h1>Resource directory<span>.</span></h1><p>Keep internal maintenance teams and external contractors organised in one standardised register.</p></div><a class="back-link" href={`/workspace/${data.organization.id}/maintenance`}>← Back to maintenance</a></div>
	<section class="panel directory-panel">
		<div class="panel-heading"><div><p class="eyebrow">Vendors and internal team</p><h2>Maintenance resources</h2><p>Filter by the work each resource can handle, then activate or pause access to them.</p></div><span class="count">{data.maintenanceVendors.length} total</span></div>
		<div class="filters">
			<input aria-label="Search maintenance resources" placeholder="Search resources" bind:value={search} oninput={resetPage} />
			<select aria-label="Filter resource type" bind:value={typeFilter} onchange={resetPage}><option value="all">All resources</option><option value="internal">Internal team</option><option value="external">External vendors</option></select>
			<select aria-label="Filter resource status" bind:value={statusFilter} onchange={resetPage}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
			<select aria-label="Filter specialty" bind:value={specialtyFilter} onchange={resetPage}><option value="all">All specialties</option>{#each specialtyOptions as specialty (specialty)}<option value={specialty}>{categories[specialty] ?? specialty}</option>{/each}</select>
		</div>
		{#if rows.length === 0}<div class="empty"><strong>{data.maintenanceVendors.length ? 'No resources match these filters.' : 'No maintenance resources yet.'}</strong><p>{data.maintenanceVendors.length ? 'Try clearing a filter or searching for another resource.' : 'Add a resource below to make assignment easier.'}</p></div>{:else}<div class="table-wrap"><table><thead><tr><th>Resource</th><th>Type</th><th>Specialties</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead><tbody>{#each rows as vendor (vendor.id)}<tr><td><strong>{vendor.business_name}</strong><small>{vendor.contact_name || 'No contact name'}</small></td><td><span class="tag resource">{vendor.resource_type === 'internal' ? 'Internal team' : 'External vendor'}</span></td><td>{(vendor.specialties ?? []).map((item: string) => categories[item] ?? item).join(', ') || 'General maintenance'}</td><td>{vendor.phone || vendor.email || 'No contact details'}</td><td><span class="tag status">{vendor.status === 'active' ? 'Active' : 'Inactive'}</span>{#if vendor.emergency_available}<small class="note">Emergency ready</small>{/if}</td><td><form method="POST" action="?/updateMaintenanceVendor" class="status-form"><input type="hidden" name="vendor_id" value={vendor.id} /><select name="status" aria-label={`Status for ${vendor.business_name}`}><option value="active" selected={vendor.status === 'active'}>Active</option><option value="inactive" selected={vendor.status === 'inactive'}>Inactive</option></select><button class="text-link" type="submit">Save</button></form></td></tr>{/each}</tbody></table></div><div class="pagination"><small>Showing {(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, filtered.length)} of {filtered.length}</small><div><button type="button" disabled={currentPage === 1} onclick={() => (page = Math.max(1, currentPage - 1))}>Previous</button><span>Page {currentPage} of {pageCount}</span><button type="button" disabled={currentPage === pageCount} onclick={() => (page = Math.min(pageCount, currentPage + 1))}>Next</button></div></div>{/if}
	</section>
	<section class="panel add-panel"><div class="panel-heading"><div><p class="eyebrow">Add resource</p><h2>Register a vendor or team</h2><p>Use the same maintenance categories to standardise assignments.</p></div></div><form method="POST" action="?/createMaintenanceVendor" class="form-stack"><div class="form-grid two"><label>Business or team name<input name="business_name" required placeholder="Moyo Plumbing & Electrical" /></label><label>Contact person<input name="contact_name" placeholder="Primary contact" /></label></div><label>Resource type<select name="resource_type"><option value="internal">Internal maintenance team</option><option value="external" selected>External vendor / contractor</option></select></label><div class="form-grid two"><label>Email<input name="email" type="email" placeholder="ops@contractor.com" /></label><label>Phone<input name="phone" placeholder="+263 7…" /></label></div><fieldset><legend>Specialties</legend><div class="category-grid">{#each Object.entries(categories) as [key, label] (key)}<label class="check"><input type="checkbox" name="specialties" value={key} />{label}</label>{/each}</div></fieldset><div class="form-grid two"><label>Hourly rate ({data.organization.currency_code})<input name="hourly_rate" type="number" min="0" step="0.01" /></label><label class="check emergency"><input name="emergency_available" type="checkbox" />Available for emergency call-outs</label></div><label>Notes<textarea name="notes" rows="3" placeholder="Access instructions, warranty terms, preferred payment process"></textarea></label><button class="primary" type="submit">Add maintenance resource <span>→</span></button></form></section>
</div>

<style>
	.directory-page { display: grid; gap: 18px; }
	.directory-heading { display:flex; justify-content:space-between; align-items:end; gap:20px; }
	.eyebrow { color:#6f907d; font-size:10px; font-weight:800; letter-spacing:.17em; text-transform:uppercase; }
	h1 { color:#0b4036; font-size:clamp(38px,5vw,64px); letter-spacing:-.07em; margin:8px 0; } h1 span { color:#9ac947; } h2 { color:#0b4036; margin:5px 0 8px; } .directory-heading p, .panel-heading p { color:#779187; margin:0; }
	.back-link { color:#33765b; font-size:12px; font-weight:700; text-decoration:none; white-space:nowrap; }
	.panel { border:1px solid #dfeae1; border-radius:14px; background:#fff; padding:22px; } .panel-heading { display:flex; justify-content:space-between; gap:16px; align-items:start; margin-bottom:18px; } .count { background:#edf6df; border-radius:99px; color:#4c7a5d; font-size:11px; padding:9px 13px; white-space:nowrap; }
	.filters { display:grid; grid-template-columns:1.5fr repeat(3,1fr); gap:9px; margin-bottom:14px; } input, select, textarea { box-sizing:border-box; width:100%; border:1px solid #dce9df; border-radius:8px; background:#fbfdfb; color:#244a3b; font:inherit; font-size:12px; padding:11px 12px; } .table-wrap { overflow-x:auto; border:1px solid #e3ede4; border-radius:11px; } table { width:100%; min-width:780px; border-collapse:collapse; text-align:left; } th { background:#f6faf4; color:#789287; font-size:10px; letter-spacing:.08em; padding:12px 14px; text-transform:uppercase; } td { border-top:1px solid #edf2ed; color:#567768; font-size:11px; padding:12px 14px; vertical-align:middle; } td strong, td small { display:block; } td strong { color:#245442; font-size:12px; } td small { color:#92a59b; margin-top:3px; } .note { color:#789287; font-size:9px; } .tag { display:inline-block; border-radius:99px; background:#edf6df; color:#4b765c; font-size:10px; font-weight:700; padding:7px 9px; white-space:nowrap; } .status-form { display:flex; align-items:center; gap:7px; } .status-form select { min-width:88px; padding:7px 8px; } .pagination { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:12px; } .pagination small, .pagination span { color:#8a9f94; font-size:10px; } .pagination div { display:flex; align-items:center; gap:8px; } .pagination button { border:0; border-radius:8px; background:#edf6df; color:#39715a; cursor:pointer; padding:8px 10px; } .pagination button:disabled { cursor:not-allowed; opacity:.45; }
	.form-stack { display:grid; gap:13px; } .form-grid { display:grid; gap:10px; } .form-grid.two { grid-template-columns:repeat(2,minmax(0,1fr)); } label { display:grid; gap:6px; color:#456b5c; font-size:11px; font-weight:800; } fieldset { border:1px solid #dce9df; border-radius:8px; padding:12px; } legend { color:#456b5c; font-size:11px; font-weight:800; padding:0 5px; } .category-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; } label.check { display:flex; grid-template-columns:none; align-items:center; gap:7px; color:#567768; font-weight:600; } label.check input { width:15px; height:15px; accent-color:#0c5147; } .emergency { padding-top:22px; } .primary { border:0; border-radius:8px; background:#075147; color:#fff; cursor:pointer; font:inherit; font-weight:700; padding:12px 15px; } .empty { display:grid; place-content:center; min-height:150px; border:1px dashed #d9e7dc; border-radius:9px; color:#789185; text-align:center; } .empty strong { color:#486b5b; } .empty p { font-size:12px; margin:5px 0 0; }
	.feedback { border-radius:9px; background:#edf8df; color:#336c4e; padding:11px 14px; font-size:12px; } .feedback:not(.success) { background:#fff0eb; color:#a35545; }
	@media (max-width:800px) { .directory-heading { display:grid; } .filters { grid-template-columns:1fr 1fr; } .category-grid { grid-template-columns:1fr 1fr; } .form-grid.two { grid-template-columns:1fr; } .panel { padding:16px; } }
</style>
