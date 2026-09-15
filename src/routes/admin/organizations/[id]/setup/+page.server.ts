import { getPlatformMember, writeAuditLog } from '$lib/server/platform';
import { error, fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals, params, url }) => {
	const access = await getPlatformMember(locals, ['super_admin']);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		return { access: 'denied' as const };
	}

	const { data: organization } = await locals.supabase
		.from('organizations')
		.select('id, name, status, currency_code, timezone, support_notes, handoff_at')
		.eq('id', params.id)
		.maybeSingle();
	if (!organization) throw error(404, 'Organization not found');
	const [properties, spaces, people, tenancies] = await Promise.all([
		locals.supabase
			.from('properties')
			.select('id, name, code, city, status, created_at')
			.eq('organization_id', params.id)
			.order('created_at'),
		locals.supabase
			.from('spaces')
			.select('id, property_id, name, kind, status, monthly_rent')
			.eq('organization_id', params.id)
			.order('created_at'),
		locals.supabase
			.from('people')
			.select('id, first_name, last_name, person_type, email, phone')
			.eq('organization_id', params.id)
			.order('created_at'),
		locals.supabase
			.from('tenancies')
			.select('id, space_id, status, rent_amount, start_date, end_date')
			.eq('organization_id', params.id)
			.order('created_at')
	]);

	return {
		access: 'granted' as const,
		organization,
		properties: properties.data ?? [],
		spaces: spaces.data ?? [],
		people: people.data ?? [],
		tenancies: tenancies.data ?? [],
		defaultTab: ['properties', 'spaces', 'people', 'review'].includes(
			url.searchParams.get('tab') ?? ''
		)
			? url.searchParams.get('tab')
			: 'properties'
	};
};

export const actions = {
	addProperty: async ({ request, locals, params }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Only superadmins can configure client workspaces.' });
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { message: 'Property name is required.' });
		const { error: insertError } = await locals.supabase.from('properties').insert({
			organization_id: params.id,
			name,
			code: String(form.get('code') ?? '').trim() || null,
			city: String(form.get('city') ?? '').trim() || null,
			country: String(form.get('country') ?? '').trim() || null
		});
		if (insertError) return fail(400, { message: insertError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'property_added',
			entityType: 'property',
			metadata: { name }
		});
		return { success: true, message: 'Property added.' };
	},
	addSpace: async ({ request, locals, params }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Only superadmins can configure client workspaces.' });
		const form = await request.formData();
		const propertyId = String(form.get('property_id') ?? '');
		const name = String(form.get('name') ?? '').trim();
		if (!propertyId || !name)
			return fail(400, { message: 'Choose a property and enter a unit name.' });
		const monthlyRent = Number(form.get('monthly_rent') ?? 0);
		const { error: insertError } = await locals.supabase.from('spaces').insert({
			organization_id: params.id,
			property_id: propertyId,
			name,
			kind: 'unit',
			monthly_rent: Number.isFinite(monthlyRent) && monthlyRent > 0 ? monthlyRent : null
		});
		if (insertError) return fail(400, { message: insertError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'space_added',
			entityType: 'space',
			metadata: { name, property_id: propertyId }
		});
		return { success: true, message: 'Unit added.' };
	}
};
