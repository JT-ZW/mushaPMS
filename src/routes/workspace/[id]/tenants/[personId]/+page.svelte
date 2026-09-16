<script lang="ts">
	import WorkspaceChrome from '$lib/components/WorkspaceChrome.svelte';
	import { resolve } from '$app/paths';
	let { data } = $props();
</script>
<svelte:head><title>{data.person.first_name} {data.person.last_name} · Musha</title></svelte:head>
<WorkspaceChrome organization={data.organization} modules={data.modules} active="people" role={data.membership.role} supportMode={data.supportMode}>
	<a class="back" href={resolve(`/workspace/${data.organization.id}/tenants`)}>← Back to tenant table</a>
	<section class="hero"><p>Tenant profile</p><h1>{data.person.first_name} {data.person.last_name}</h1><span>{data.person.email ?? 'No email'} · {data.person.phone ?? 'No phone'}</span></section>
	<div class="grid"><section class="panel"><p>Contact details</p><strong>{data.person.city ?? 'City not recorded'}{data.person.country ? ` · ${data.person.country}` : ''}</strong><small>{data.person.id_number ?? 'No ID recorded'}</small></section><section class="panel"><p>Tenancies</p>{#each data.tenancies as row}<strong>{row.tenancies?.[0]?.spaces?.[0]?.properties?.[0]?.name ?? 'Property'} · {row.tenancies?.[0]?.spaces?.[0]?.name ?? 'Space'}</strong><small>{row.tenancies?.[0]?.status ?? '—'} · {row.tenancies?.[0]?.lease_reference ?? 'No reference'}</small>{:else}<small>No tenancy linked.</small>{/each}</section></div>
	<section class="panel documents"><div><p>Attached documents</p><h2>Tenant documents</h2></div>{#each data.documents as document (document.id)}<a href={document.url ?? '#'} target="_blank" rel="noreferrer"><strong>{document.file_name}</strong><small>{document.document_type} · {document.approval_status} · {document.expires_on ?? 'No expiry'}</small></a>{:else}<small>No documents are attached to this tenant yet.</small>{/each}</section>
</WorkspaceChrome>
<style>.back{color:#417159;font-size:13px;font-weight:700;text-decoration:none}.hero{margin:42px 0 26px}.hero p,.panel p{color:#719082;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.hero h1{font-size:52px;letter-spacing:-.07em;margin:8px 0}.hero span,.panel small{color:#789287}.grid{display:grid;gap:14px;grid-template-columns:1fr 1fr}.panel{background:#fff;border:1px solid #dce9e0;border-radius:12px;display:grid;gap:9px;margin-top:14px;padding:22px}.panel strong,.panel small{display:block}.documents a{background:#f6faf3;border-radius:8px;color:#315b49;padding:12px;text-decoration:none}@media(max-width:650px){.grid{grid-template-columns:1fr}.hero h1{font-size:38px}}</style>
