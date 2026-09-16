import { getWorkspaceAccess } from '$lib/server/workspace';
import { error, redirect } from '@sveltejs/kit';
export const load = async ({ locals, params }) => {
	const access = await getWorkspaceAccess(locals, params.id);
	if (!access) { const { user } = await locals.safeGetSession(); if (!user) throw redirect(303, '/login'); throw redirect(303, `/workspace/${params.id}/properties`); }
	const [{ data: property }, { data: spaces }] = await Promise.all([
		locals.supabase.from('properties').select('id, name, code, address_line_1, city, country, status, rental_mode').eq('id', params.propertyId).eq('organization_id', params.id).maybeSingle(),
		locals.supabase.from('spaces').select('id, name, kind, status, monthly_rent, deposit_amount').eq('organization_id', params.id).eq('property_id', params.propertyId).order('name')
	]);
	if (!property) throw error(404, 'Property not found');
	return { ...access, property, spaces: spaces ?? [] };
};
