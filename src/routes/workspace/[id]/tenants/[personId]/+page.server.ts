import { getWorkspaceAccess } from '$lib/server/workspace';
import { error, redirect } from '@sveltejs/kit';

export const load = async ({ locals, params }) => {
	const access = await getWorkspaceAccess(locals, params.id);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		throw redirect(303, `/workspace/${params.id}/tenants`);
	}
	const [{ data: person }, { data: documents }, { data: tenancies }] = await Promise.all([
		locals.supabase.from('people').select('id, first_name, last_name, email, phone, id_number, city, country, notes').eq('id', params.personId).eq('organization_id', params.id).eq('person_type', 'tenant').maybeSingle(),
		locals.supabase.from('documents').select('id, person_id, tenancy_id, document_type, file_name, storage_path, mime_type, file_size, expires_on, approval_status, created_at').eq('organization_id', params.id).eq('person_id', params.personId).order('created_at', { ascending: false }),
		locals.supabase.from('tenancy_parties').select('tenancies(id, lease_reference, status, start_date, end_date, rent_amount, billing_frequency, spaces(name, properties(name)))').eq('person_id', params.personId).eq('role', 'primary')
	]);
	if (!person) throw error(404, 'Tenant not found');
	const rows = documents ?? [];
	const signed = rows.length ? await locals.supabase.storage.from('tenant-documents').createSignedUrls(rows.map((item) => item.storage_path), 3600) : { data: [] };
	const urls = new Map((signed.data ?? []).map((item) => [item.path, item.signedUrl]));
	return { ...access, person, documents: rows.map((item) => ({ ...item, url: urls.get(item.storage_path) ?? null })), tenancies: tenancies ?? [] };
};
