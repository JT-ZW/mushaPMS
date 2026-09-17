import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { writeAuditLog } from '$lib/server/platform';
import { getWorkspaceAccess } from '$lib/server/workspace';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { error, fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals, params }) => {
	const access = await getWorkspaceAccess(locals, params.id);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		throw redirect(303, `/workspace/${params.id}/tenants`);
	}
	const [{ data: person }, { data: documents }, { data: partyRows }] = await Promise.all([
		locals.supabase.from('people').select('id, first_name, last_name, email, phone, id_number, date_of_birth, address_line_1, city, country, notes, user_id, created_at, updated_at').eq('id', params.personId).eq('organization_id', params.id).eq('person_type', 'tenant').maybeSingle(),
		locals.supabase.from('documents').select('id, person_id, tenancy_id, document_type, file_name, storage_path, mime_type, file_size, expires_on, approval_status, created_at').eq('organization_id', params.id).eq('person_id', params.personId).order('created_at', { ascending: false }),
		locals.supabase.from('tenancy_parties').select('tenancy_id, person_id, role').eq('person_id', params.personId)
	]);
	if (!person) throw error(404, 'Tenant not found');

	const tenancyIds = [...new Set((partyRows ?? []).map((row) => row.tenancy_id).filter(Boolean))];
	const [{ data: tenancyRows }, { data: emergencyPartyRows }] = await Promise.all([
		tenancyIds.length ? locals.supabase.from('tenancies').select('id, space_id, lease_reference, status, start_date, end_date, rent_amount, deposit_amount, billing_frequency, rent_due_day, notice_period_days, move_in_at, move_out_at, notes').eq('organization_id', params.id).in('id', tenancyIds) : Promise.resolve({ data: [] }),
		tenancyIds.length ? locals.supabase.from('tenancy_parties').select('tenancy_id, person_id, role').in('tenancy_id', tenancyIds).eq('role', 'emergency_contact') : Promise.resolve({ data: [] })
	]);
	const spaceIds = [...new Set((tenancyRows ?? []).map((row) => row.space_id).filter(Boolean))];
	const emergencyPersonIds = [...new Set((emergencyPartyRows ?? []).map((row) => row.person_id).filter(Boolean))];
	const [{ data: spaces }, { data: emergencyPeople }, { data: charges }, { data: payments }, { data: maintenance }] = await Promise.all([
		spaceIds.length ? locals.supabase.from('spaces').select('id, name, property_id, bedrooms, monthly_rent').in('id', spaceIds) : Promise.resolve({ data: [] }),
		emergencyPersonIds.length ? locals.supabase.from('people').select('id, first_name, last_name, email, phone, city, country, notes').eq('organization_id', params.id).in('id', emergencyPersonIds) : Promise.resolve({ data: [] }),
		tenancyIds.length ? locals.supabase.from('charges').select('id, tenancy_id, charge_type, description, amount, due_on, status, billing_period_start, billing_period_end').eq('organization_id', params.id).in('tenancy_id', tenancyIds).order('due_on', { ascending: false }).limit(30) : Promise.resolve({ data: [] }),
		tenancyIds.length ? locals.supabase.from('payments').select('id, tenancy_id, amount, payment_date, method, reference, notes').eq('organization_id', params.id).in('tenancy_id', tenancyIds).order('payment_date', { ascending: false }).limit(30) : Promise.resolve({ data: [] }),
		locals.supabase.from('maintenance_requests').select('id, property_id, space_id, title, category, priority, status, reported_at, completed_at, created_at').eq('organization_id', params.id).eq('reporter_person_id', params.personId).order('created_at', { ascending: false }).limit(20)
	]);
	const propertyIds = [...new Set((spaces ?? []).map((space) => space.property_id).filter(Boolean))];
	const { data: properties } = propertyIds.length ? await locals.supabase.from('properties').select('id, name, address_line_1, city, country').in('id', propertyIds) : { data: [] };
	const rows = documents ?? [];
	const signed = rows.length ? await locals.supabase.storage.from('tenant-documents').createSignedUrls(rows.map((item) => item.storage_path), 3600) : { data: [] };
	const urls = new Map((signed.data ?? []).map((item) => [item.path, item.signedUrl]));
	const spaceById = new Map((spaces ?? []).map((space) => [space.id, space]));
	const propertyById = new Map((properties ?? []).map((property) => [property.id, property]));
	const emergencyById = new Map((emergencyPeople ?? []).map((contact) => [contact.id, contact]));
	const rolesByTenancy = new Map<string, string>();
	for (const row of partyRows ?? []) rolesByTenancy.set(row.tenancy_id, row.role);
	return {
		...access,
		person,
		documents: rows.map((item) => ({ ...item, url: urls.get(item.storage_path) ?? null })),
		tenancies: (tenancyRows ?? []).map((tenancy) => {
			const space = spaceById.get(tenancy.space_id);
			return { ...tenancy, party_role: rolesByTenancy.get(tenancy.id) ?? 'primary', space, property: space ? propertyById.get(space.property_id) : null };
		}),
		emergencyContacts: (emergencyPartyRows ?? []).map((row) => ({ ...row, person: emergencyById.get(row.person_id) })).filter((row) => row.person),
		charges: charges ?? [],
		payments: payments ?? [],
		maintenance: maintenance ?? []
	};
};

const value = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

export const actions = {
	updateTenant: async ({ request, locals, params }) => {
		const access = await getWorkspaceAccess(locals, params.id);
		if (!access || !['owner', 'admin', 'manager'].includes(access.membership.role))
			return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const firstName = value(form, 'first_name');
		const lastName = value(form, 'last_name');
		const email = value(form, 'email').toLowerCase();
		if (!firstName || !lastName) return fail(400, { message: 'First and last name are required.' });
		if (email && !/^\S+@\S+\.\S+$/.test(email)) return fail(400, { message: 'Enter a valid email address.' });
		const { error: updateError } = await locals.supabase
			.from('people')
			.update({
				first_name: firstName,
				last_name: lastName,
				email: email || null,
				phone: value(form, 'phone') || null,
				id_number: value(form, 'id_number') || null,
				date_of_birth: value(form, 'date_of_birth') || null,
				address_line_1: value(form, 'address_line_1') || null,
				city: value(form, 'city') || null,
				country: value(form, 'country') || null,
				notes: value(form, 'notes') || null
			})
			.eq('id', params.personId)
			.eq('organization_id', params.id)
			.eq('person_type', 'tenant');
		if (updateError) return fail(400, { message: updateError.message });
		await writeAuditLog(locals, { actorUserId: access.user.id, organizationId: params.id, action: 'tenant_profile_updated', entityType: 'person', entityId: params.personId, metadata: { fields: ['identity', 'contact', 'address', 'notes'] } });
		return { success: true, message: 'Tenant information updated.' };
	},
	addEmergencyContact: async ({ request, locals, params }) => {
		const access = await getWorkspaceAccess(locals, params.id);
		if (!access || !['owner', 'admin', 'manager'].includes(access.membership.role))
			return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const tenancyId = value(form, 'tenancy_id');
		const firstName = value(form, 'first_name');
		const lastName = value(form, 'last_name');
		if (!tenancyId || !firstName || !lastName) return fail(400, { message: 'Choose a tenancy and enter the contact name.' });
		const { data: tenancy } = await locals.supabase.from('tenancy_parties').select('tenancy_id').eq('tenancy_id', tenancyId).eq('person_id', params.personId).eq('role', 'primary').maybeSingle();
		if (!tenancy) return fail(404, { message: 'The selected tenancy is not linked to this tenant.' });
		const { data: contact, error: personError } = await locals.supabase.from('people').insert({ organization_id: params.id, person_type: 'contact', first_name: firstName, last_name: lastName, email: value(form, 'email') || null, phone: value(form, 'phone') || null, notes: value(form, 'relationship') ? `Relationship: ${value(form, 'relationship')}` : null }).select('id').single();
		if (personError || !contact) return fail(400, { message: personError?.message ?? 'The emergency contact could not be created.' });
		const { error: linkError } = await locals.supabase.from('tenancy_parties').insert({ tenancy_id: tenancyId, person_id: contact.id, role: 'emergency_contact' });
		if (linkError) return fail(400, { message: linkError.message });
		await writeAuditLog(locals, { actorUserId: access.user.id, organizationId: params.id, action: 'tenant_emergency_contact_added', entityType: 'person', entityId: params.personId, metadata: { contact_id: contact.id, tenancy_id: tenancyId } });
		return { success: true, message: 'Emergency contact added.' };
	},
	removeEmergencyContact: async ({ request, locals, params }) => {
		const access = await getWorkspaceAccess(locals, params.id);
		if (!access || !['owner', 'admin', 'manager'].includes(access.membership.role)) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const tenancyId = value(form, 'tenancy_id');
		const contactId = value(form, 'contact_id');
		const [{ data: tenantLink }, { data: contactLink }] = await Promise.all([
			locals.supabase.from('tenancy_parties').select('tenancy_id').eq('tenancy_id', tenancyId).eq('person_id', params.personId).eq('role', 'primary').maybeSingle(),
			locals.supabase.from('tenancy_parties').select('tenancy_id').eq('tenancy_id', tenancyId).eq('person_id', contactId).eq('role', 'emergency_contact').maybeSingle()
		]);
		if (!tenantLink || !contactLink) return fail(404, { message: 'That emergency contact is not linked to this tenant.' });
		const { error: deleteError } = await locals.supabase.from('tenancy_parties').delete().eq('tenancy_id', tenancyId).eq('person_id', contactId).eq('role', 'emergency_contact');
		if (deleteError) return fail(400, { message: deleteError.message });
		await writeAuditLog(locals, { actorUserId: access.user.id, organizationId: params.id, action: 'tenant_emergency_contact_removed', entityType: 'person', entityId: params.personId, metadata: { contact_id: contactId, tenancy_id: tenancyId } });
		return { success: true, message: 'Emergency contact removed.' };
	},
	uploadTenantDocument: async ({ request, locals, params }) => {
		const access = await getWorkspaceAccess(locals, params.id);
		if (!access || !['owner', 'admin', 'manager'].includes(access.membership.role)) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File) || file.size === 0) return fail(400, { message: 'Choose a document to upload.' });
		if (file.size > 10 * 1024 * 1024) return fail(400, { message: 'Documents must be 10 MB or smaller.' });
		if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return fail(400, { message: 'Only PDF, JPG, PNG, and WebP documents are supported.' });
		const tenancyId = value(form, 'tenancy_id');
		const documentType = value(form, 'document_type') || 'other';
		const expiresOn = value(form, 'expires_on');
		if (!['id', 'lease', 'notice', 'other'].includes(documentType)) return fail(400, { message: 'Choose a valid document type.' });
		if (expiresOn && !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) return fail(400, { message: 'Expiry date must be a valid date or left blank.' });
		if (tenancyId) {
			const { data: party } = await locals.supabase.from('tenancy_parties').select('tenancy_id').eq('tenancy_id', tenancyId).eq('person_id', params.personId).eq('role', 'primary').maybeSingle();
			if (!party) return fail(404, { message: 'The selected tenancy is not linked to this tenant.' });
		}
		const storagePath = `${params.id}/${params.personId}/${randomUUID()}-${safeFileName(file.name)}`;
		const upload = await locals.supabase.storage.from('tenant-documents').upload(storagePath, file, { contentType: file.type, upsert: false });
		if (upload.error) return fail(400, { message: upload.error.message });
		const { data: document, error: insertError } = await locals.supabase.from('documents').insert({ organization_id: params.id, person_id: params.personId, tenancy_id: tenancyId || null, document_type: documentType, file_name: file.name, storage_path: storagePath, mime_type: file.type, file_size: file.size, expires_on: expiresOn || null, approval_status: 'approved', approved_by: access.user.id, approved_at: new Date().toISOString(), uploaded_by: access.user.id }).select('id').single();
		if (insertError || !document) { await locals.supabase.storage.from('tenant-documents').remove([storagePath]); return fail(400, { message: insertError?.message ?? 'The document could not be saved.' }); }
		await writeAuditLog(locals, { actorUserId: access.user.id, organizationId: params.id, action: 'tenant_document_uploaded', entityType: 'document', entityId: document.id, metadata: { person_id: params.personId, document_type: documentType } });
		return { success: true, message: `${file.name} was added to the tenant document register.` };
	},
	updateTenantDocument: async ({ request, locals, params }) => {
		const access = await getWorkspaceAccess(locals, params.id);
		if (!access || !['owner', 'admin', 'manager'].includes(access.membership.role)) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const documentId = value(form, 'document_id');
		const documentType = value(form, 'document_type') || 'other';
		const expiresOn = value(form, 'expires_on');
		if (!['id', 'lease', 'notice', 'other'].includes(documentType)) return fail(400, { message: 'Choose a valid document type.' });
		if (expiresOn && !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) return fail(400, { message: 'Expiry date must be a valid date or left blank.' });
		const { error: updateError } = await locals.supabase.from('documents').update({ document_type: documentType, expires_on: expiresOn || null }).eq('id', documentId).eq('organization_id', params.id).eq('person_id', params.personId);
		if (updateError) return fail(400, { message: updateError.message });
		await writeAuditLog(locals, { actorUserId: access.user.id, organizationId: params.id, action: 'tenant_document_updated', entityType: 'document', entityId: documentId, metadata: { person_id: params.personId, document_type: documentType } });
		return { success: true, message: 'Tenant document details updated.' };
	},
	deleteTenantDocument: async ({ request, locals, params }) => {
		const access = await getWorkspaceAccess(locals, params.id);
		if (!access || !['owner', 'admin', 'manager'].includes(access.membership.role)) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const documentId = value(form, 'document_id');
		const { data: document } = await locals.supabase.from('documents').select('id, storage_path').eq('id', documentId).eq('organization_id', params.id).eq('person_id', params.personId).maybeSingle();
		if (!document) return fail(404, { message: 'Tenant document not found.' });
		const { error: deleteError } = await locals.supabase.from('documents').delete().eq('id', documentId).eq('organization_id', params.id);
		if (deleteError) return fail(400, { message: deleteError.message });
		await locals.supabase.storage.from('tenant-documents').remove([document.storage_path]);
		await writeAuditLog(locals, { actorUserId: access.user.id, organizationId: params.id, action: 'tenant_document_deleted', entityType: 'document', entityId: documentId, metadata: { person_id: params.personId } });
		return { success: true, message: 'Tenant document removed.' };
	},
	setTemporaryPassword: async ({ request, locals, params }) => {
		const access = await getWorkspaceAccess(locals, params.id);
		if (!access || !['owner', 'admin', 'manager'].includes(access.membership.role))
			return { success: false, message: 'Workspace manager access is required.' };
		if (!env.SUPABASE_SERVICE_ROLE_KEY)
			return { success: false, message: 'Secure account provisioning is not configured.' };
		const form = await request.formData();
		const password = value(form, 'temporary_password');
		if (password.length < 8)
			return { success: false, message: 'Temporary passwords must contain at least 8 characters.' };
		const { data: person } = await locals.supabase
			.from('people')
			.select('id, email, user_id, first_name, last_name')
			.eq('id', params.personId)
			.eq('organization_id', params.id)
			.eq('person_type', 'tenant')
			.maybeSingle();
		if (!person?.email)
			return { success: false, message: 'Add a valid email address to the tenant before provisioning access.' };
		const adminClient = createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
			auth: { autoRefreshToken: false, persistSession: false }
		});
		let userId = person.user_id;
		if (!userId) {
			const users = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
			const existing = users.data?.users.find((user) => user.email?.toLowerCase() === person.email?.toLowerCase());
			if (existing) userId = existing.id;
		}
		const metadata = { tenant_portal: true, organization_id: params.id, must_change_password: true, password_provisioned_at: new Date().toISOString() };
		let authError: { message: string } | null = null;
		if (userId) {
			const result = await adminClient.auth.admin.updateUserById(userId, { password, email: person.email, user_metadata: metadata });
			authError = result.error;
		} else {
			const result = await adminClient.auth.admin.createUser({ email: person.email, password, email_confirm: true, user_metadata: metadata });
			authError = result.error;
			userId = result.data.user?.id;
		}
		if (authError || !userId)
			return { success: false, message: authError?.message ?? 'The tenant account could not be provisioned.' };
		const { error: linkError } = await locals.supabase
			.from('people')
			.update({ user_id: userId })
			.eq('id', person.id)
			.eq('organization_id', params.id);
		if (linkError) return { success: false, message: linkError.message };
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'tenant_temporary_password_set',
			entityType: 'person',
			entityId: person.id,
			metadata: { email: person.email, user_id: userId }
		});
		return { success: true, message: `Temporary access created for ${person.email}. Share it securely and ask the tenant to change it after signing in.`, temporaryPassword: password };
	},
	changePassword: async ({ request, locals, params }) => {
		const access = await getWorkspaceAccess(locals, params.id);
		if (!access) return { success: false, message: 'Please sign in again.' };
		const form = await request.formData();
		const password = value(form, 'new_password');
		const confirmation = value(form, 'confirm_password');
		if (password.length < 8) return { success: false, message: 'Passwords must contain at least 8 characters.' };
		if (password !== confirmation) return { success: false, message: 'The passwords do not match.' };
		const changedAt = new Date().toISOString();
		const { error: authError } = await locals.supabase.auth.updateUser({ password, data: { ...(access.user.user_metadata ?? {}), must_change_password: false, password_changed_at: changedAt } });
		if (authError) return { success: false, message: authError.message };
		await writeAuditLog(locals, { actorUserId: access.user.id, organizationId: params.id, action: 'workspace_password_changed', entityType: 'auth_user', entityId: access.user.id, metadata: { changed_at: changedAt } });
		return { success: true, message: 'Your password was changed successfully.' };
	}
};
