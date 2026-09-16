import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';

/* eslint-disable @typescript-eslint/no-explicit-any */

const value = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const safeFileName = (name: string) =>
	name
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 100) || 'photo';
const categories = [
	'plumbing',
	'electrical',
	'hvac',
	'carpentry',
	'landscaping',
	'painting',
	'flooring',
	'roofing',
	'security',
	'appliances',
	'pest_control',
	'cleaning',
	'general'
];
const priorities = ['low', 'normal', 'high', 'urgent'];

export const load = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');
	const { data: person } = await locals.supabase
		.from('people')
		.select(
			'id, organization_id, first_name, last_name, email, phone, id_number, city, country, notes'
		)
		.eq('user_id', user.id)
		.eq('person_type', 'tenant')
		.maybeSingle();
	if (!person) throw redirect(303, '/login');
	const [{ data: organization }, { data: parties }, { data: settings }] = await Promise.all([
		locals.supabase
			.from('organizations')
			.select('id, name, currency_code, timezone')
			.eq('id', person.organization_id)
			.maybeSingle(),
		locals.supabase.from('tenancy_parties').select('tenancy_id, role').eq('person_id', person.id),
		locals.supabase
			.from('organization_workspace_settings')
			.select('contact_email, contact_phone, payment_instructions')
			.eq('organization_id', person.organization_id)
			.maybeSingle()
	]);
	if (!organization) throw redirect(303, '/login');
	const tenancyIds = (parties ?? []).map((party) => party.tenancy_id);
	const { data: tenancies } = tenancyIds.length
		? await locals.supabase
				.from('tenancies')
				.select(
					'id, space_id, lease_reference, status, start_date, end_date, rent_amount, deposit_amount, billing_frequency, rent_due_day, notes'
				)
				.in('id', tenancyIds)
				.order('start_date', { ascending: false })
		: { data: [] };
	const spaceIds = (tenancies ?? []).map((tenancy) => tenancy.space_id);
	const { data: spaces } = spaceIds.length
		? await locals.supabase
				.from('spaces')
				.select('id, property_id, name, code, kind, status, monthly_rent')
				.in('id', spaceIds)
		: { data: [] };
	const propertyIds = [...new Set((spaces ?? []).map((space) => space.property_id))];
	const { data: properties } = propertyIds.length
		? await locals.supabase
				.from('properties')
				.select('id, name, code, address_line_1, city, country')
				.in('id', propertyIds)
		: { data: [] };
	const [
		{ data: charges },
		{ data: payments },
		{ data: paymentAllocations },
		{ data: maintenance },
		{ data: documentsByPerson }
	] = await Promise.all([
		tenancyIds.length
			? locals.supabase
					.from('charges')
					.select('id, tenancy_id, charge_type, description, amount, due_on')
					.in('tenancy_id', tenancyIds)
					.order('due_on', { ascending: false })
			: Promise.resolve({ data: [] }),
		tenancyIds.length
			? locals.supabase
					.from('payments')
					.select('id, tenancy_id, amount, payment_date, method, reference')
					.in('tenancy_id', tenancyIds)
					.order('payment_date', { ascending: false })
			: Promise.resolve({ data: [] }),
		locals.supabase.from('payment_allocations').select('payment_id, charge_id, amount'),
		locals.supabase
			.from('maintenance_requests')
			.select(
				'id, property_id, space_id, title, description, category, priority, status, reported_at, scheduled_for, completed_at, created_at, updated_at'
			)
			.eq('reporter_person_id', person.id)
			.order('created_at', { ascending: false }),
		locals.supabase
			.from('documents')
			.select(
				'id, tenancy_id, person_id, document_type, file_name, storage_path, mime_type, expires_on, created_at'
			)
			.eq('person_id', person.id)
			.order('created_at', { ascending: false })
	]);
	const { data: documentsByTenancy } = tenancyIds.length
		? await locals.supabase
				.from('documents')
				.select(
					'id, tenancy_id, person_id, document_type, file_name, storage_path, mime_type, expires_on, created_at'
				)
				.in('tenancy_id', tenancyIds)
				.order('created_at', { ascending: false })
		: { data: [] };
	const documents = [
		...new Map(
			[...(documentsByPerson ?? []), ...(documentsByTenancy ?? [])].map((doc) => [doc.id, doc])
		).values()
	];
	const signed = documents.length
		? await locals.supabase.storage.from('tenant-documents').createSignedUrls(
				documents.map((doc) => doc.storage_path),
				3600
			)
		: { data: [] };
	const signedByPath = new Map((signed.data ?? []).map((item) => [item.path, item.signedUrl]));
	const { data: billingDocuments } = await locals.supabase
		.from('billing_documents')
		.select(
			'id, document_type, document_number, issue_date, due_date, status, currency_code, total_amount, line_items, notes'
		)
		.eq('organization_id', person.organization_id)
		.or(
			tenancyIds.length
				? `person_id.eq.${person.id},tenancy_id.in.(${tenancyIds.join(',')})`
				: `person_id.eq.${person.id}`
		)
		.order('issue_date', { ascending: false });
	const requestIds = (maintenance ?? []).map((item) => item.id);
	const { data: updates } = requestIds.length
		? await locals.supabase
				.from('maintenance_updates')
				.select('id, request_id, body, status, created_at')
				.in('request_id', requestIds)
				.order('created_at', { ascending: false })
		: { data: [] };
	const { data: attachments } = requestIds.length
		? await locals.supabase
				.from('maintenance_attachments')
				.select('id, request_id, file_name, storage_path, mime_type, created_at')
				.in('request_id', requestIds)
				.order('created_at', { ascending: false })
		: { data: [] };
	return {
		user,
		person,
		organization,
		settings,
		parties: parties ?? [],
		tenancies: tenancies ?? [],
		spaces: spaces ?? [],
		properties: properties ?? [],
		charges: charges ?? [],
		payments: payments ?? [],
		paymentAllocations: paymentAllocations ?? [],
		maintenance: maintenance ?? [],
		updates: updates ?? [],
		attachments: (attachments ?? []).map((item) => ({ ...item, url: null })),
		documents: documents.map((doc) => ({
			...doc,
			url: signedByPath.get(doc.storage_path) ?? null
		})),
		billingDocuments: billingDocuments ?? []
	};
};

export const actions = {
	updateProfile: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { message: 'Please sign in again.' });
		const form = await request.formData();
		const { error } = await locals.supabase
			.from('people')
			.update({
				email: value(form, 'email') || null,
				phone: value(form, 'phone') || null,
				city: value(form, 'city') || null,
				country: value(form, 'country') || null,
				notes: value(form, 'notes') || null
			})
			.eq('user_id', user.id);
		if (error) return fail(400, { message: error.message });
		return { success: true, message: 'Your profile was updated.' };
	},
	createMaintenance: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { message: 'Please sign in again.' });
		const form = await request.formData();
		const { data: person } = await locals.supabase
			.from('people')
			.select('id, organization_id')
			.eq('user_id', user.id)
			.eq('person_type', 'tenant')
			.maybeSingle();
		if (!person) return fail(403, { message: 'Tenant access is required.' });
		const propertyId = value(form, 'property_id');
		const spaceId = value(form, 'space_id');
		const title = value(form, 'title');
		const category = value(form, 'category') || 'general';
		const priority = value(form, 'priority') || 'normal';
		if (!propertyId || !title || !categories.includes(category) || !priorities.includes(priority))
			return fail(400, { message: 'Choose a location, title, category and priority.' });
		const { data: allowed } = await locals.supabase
			.from('tenancy_parties')
			.select('tenancy_id, tenancies!inner(space_id)')
			.eq('person_id', person.id);
		const allowedSpaceIds = (allowed ?? [])
			.map((row: any) => row.tenancies?.space_id)
			.filter(Boolean);
		const { data: property } = await locals.supabase
			.from('properties')
			.select('id')
			.eq('id', propertyId)
			.maybeSingle();
		if (!property || (spaceId && !allowedSpaceIds.includes(spaceId)))
			return fail(403, { message: 'That property or space is not part of your tenancy.' });
		const created = await locals.supabase
			.from('maintenance_requests')
			.insert({
				organization_id: person.organization_id,
				property_id: propertyId,
				space_id: spaceId || null,
				reporter_person_id: person.id,
				title,
				description: value(form, 'description') || null,
				category,
				priority,
				source: 'client',
				reported_at: new Date().toISOString()
			})
			.select('id')
			.single();
		if (created.error || !created.data)
			return fail(400, { message: created.error?.message ?? 'Could not create the request.' });
		const file = form.get('photo');
		if (file instanceof File && file.size > 0) {
			if (
				file.size > 10 * 1024 * 1024 ||
				!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
			)
				return fail(400, { message: 'Photos must be JPG, PNG or WebP files up to 10 MB.' });
			const storagePath = `${person.organization_id}/${created.data.id}/${randomUUID()}-${safeFileName(file.name)}`;
			const upload = await locals.supabase.storage
				.from('maintenance-attachments')
				.upload(storagePath, file, { contentType: file.type, upsert: false });
			if (upload.error) return fail(400, { message: upload.error.message });
			const attachment = await locals.supabase.from('maintenance_attachments').insert({
				organization_id: person.organization_id,
				request_id: created.data.id,
				uploaded_by: user.id,
				file_name: file.name,
				storage_path: storagePath,
				mime_type: file.type,
				file_size: file.size
			});
			if (attachment.error) {
				await locals.supabase.storage.from('maintenance-attachments').remove([storagePath]);
				return fail(400, { message: attachment.error.message });
			}
		}
		return { success: true, message: 'Maintenance request submitted.' };
	},
	addMaintenanceUpdate: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { message: 'Please sign in again.' });
		const form = await request.formData();
		const requestId = value(form, 'request_id');
		const body = value(form, 'body');
		if (!requestId || body.length < 2) return fail(400, { message: 'Write a short update first.' });
		const { error } = await locals.supabase
			.from('maintenance_updates')
			.insert({ request_id: requestId, author_user_id: user.id, body });
		if (error) return fail(400, { message: error.message });
		return { success: true, message: 'Update added to the request.' };
	}
};
