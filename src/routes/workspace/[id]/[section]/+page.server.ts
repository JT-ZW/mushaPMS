import {
	canManageFinance,
	canManageMaintenance,
	canManageWorkspace,
	getWorkspaceAccess
} from '$lib/server/workspace';
import { writeAuditLog } from '$lib/server/platform';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { error, fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';

const sections = {
	properties: {
		title: 'Properties',
		eyebrow: 'Portfolio',
		copy: 'See every property, its location, occupancy, and rentable spaces.'
	},
	'new-property': {
		title: 'Add property',
		eyebrow: 'Portfolio setup',
		copy: 'Register a location, choose its rental model, and shape its rentable spaces.'
	},
	people: {
		title: 'People & leases',
		eyebrow: 'Relationships',
		copy: 'Keep tenant, occupier, contact and tenancy records together.'
	},
	tenants: {
		title: 'Tenant profiles',
		eyebrow: 'People register',
		copy: 'Review tenant information, payment performance, documents, and history.'
	},
	'new-tenant': {
		title: 'Add tenant',
		eyebrow: 'Tenant onboarding',
		copy: 'Capture the person, their space, lease terms, and check-in details in one flow.'
	},
	leases: {
		title: 'Leases & occupancy',
		eyebrow: 'Occupancy register',
		copy: 'Monitor active leases, upcoming expiries, rent schedules, and available spaces.'
	},
	documents: {
		title: 'Tenant documents',
		eyebrow: 'Document register',
		copy: 'Keep lease agreements, identity documents, inspections, and approvals together.'
	},
	'move-outs': {
		title: 'Move-outs & history',
		eyebrow: 'Tenancy history',
		copy: 'Close tenancies carefully while preserving the tenant and financial record.'
	},
	finance: {
		title: 'Finance & collections',
		eyebrow: 'Money',
		copy: 'Record what is due, what has been paid, and what needs attention.'
	},
	maintenance: {
		title: 'Maintenance',
		eyebrow: 'Work orders',
		copy: 'Capture issues, assign their progress, and keep a complete record.'
	},
	reports: {
		title: 'Reports',
		eyebrow: 'Clarity',
		copy: 'A live operational picture based on your current records.'
	},
	settings: {
		title: 'Settings',
		eyebrow: 'Workspace',
		copy: 'Keep the organization profile and operating defaults accurate.'
	}
} as const;
const workspaceRoles = ['admin', 'manager', 'finance', 'maintenance', 'viewer'];

const numberOrNull = (entry: FormDataEntryValue | null) => {
	const text = String(entry ?? '').trim();
	const number = Number(text);
	return text && Number.isFinite(number) ? number : null;
};
const value = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const firstRentDueDate = (startDate: string, dueDay: number | null, frequency: string) => {
	if (!dueDay || frequency !== 'monthly') return startDate;
	const start = new Date(`${startDate}T00:00:00Z`);
	if (Number.isNaN(start.getTime())) return startDate;
	const targetMonth = start.getUTCDate() <= dueDay ? start.getUTCMonth() : start.getUTCMonth() + 1;
	const targetYear = start.getUTCFullYear() + Math.floor(targetMonth / 12);
	const month = targetMonth % 12;
	const lastDay = new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate();
	const day = Math.min(dueDay, lastDay);
	return `${targetYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
const maintenanceCategories = [
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
const maintenanceStatuses = [
	'reported',
	'triage',
	'assigned',
	'in_progress',
	'awaiting_approval',
	'completed',
	'closed'
];
const maintenancePriorities = ['low', 'normal', 'high', 'urgent'];
const planFrequencies = ['weekly', 'monthly', 'quarterly', 'biannual', 'annual'];
const addPlanInterval = (date: string, frequency: string, interval: number) => {
	const next = new Date(`${date}T00:00:00Z`);
	if (frequency === 'weekly') next.setUTCDate(next.getUTCDate() + interval * 7);
	if (frequency === 'monthly') next.setUTCMonth(next.getUTCMonth() + interval);
	if (frequency === 'quarterly') next.setUTCMonth(next.getUTCMonth() + interval * 3);
	if (frequency === 'biannual') next.setUTCMonth(next.getUTCMonth() + interval * 6);
	if (frequency === 'annual') next.setUTCFullYear(next.getUTCFullYear() + interval);
	return next.toISOString().slice(0, 10);
};
const safeFileName = (name: string) =>
	name
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 100) || 'attachment';
const newDocumentNumber = (prefix: string, year: number) =>
	`${prefix || 'DOC'}-${year}-${randomUUID().slice(0, 8).toUpperCase()}`;
const getManagedAccess = async (locals: App.Locals, organizationId: string) => {
	const access = await getWorkspaceAccess(locals, organizationId);
	return access && canManageWorkspace(access.membership.role) ? access : null;
};
const getFinanceAccess = async (locals: App.Locals, organizationId: string) => {
	const access = await getWorkspaceAccess(locals, organizationId);
	return access && canManageFinance(access.membership.role) ? access : null;
};
const getMaintenanceAccess = async (locals: App.Locals, organizationId: string) => {
	const access = await getWorkspaceAccess(locals, organizationId);
	return access &&
		(canManageMaintenance(access.membership.role) || access.supportMode?.accessLevel === 'operator')
		? access
		: null;
};

export const load = async ({ locals, params }) => {
	const access = await getWorkspaceAccess(locals, params.id);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		throw redirect(303, `/workspace/${params.id}`);
	}
	const section = sections[params.section as keyof typeof sections];
	if (params.section === 'portfolio') throw redirect(303, `/workspace/${params.id}/properties`);
	if (!section) throw error(404, 'Workspace section not found');

	const [
		properties,
		spaces,
		people,
		tenancies,
		parties,
		charges,
		payments,
		paymentAllocations,
		propertyExpenses,
		maintenance,
		maintenanceUpdates,
		maintenanceVendors,
		maintenancePlans,
		maintenancePlanRuns,
		maintenanceAttachments,
		maintenanceReminders,
		collectionFollowups,
		members,
		workspaceSettings,
		invitations,
		billingDocuments,
		documents
	] = await Promise.all([
		locals.supabase
			.from('properties')
			.select(
				'id, name, code, address_line_1, city, country, latitude, longitude, status, rental_mode'
			)
			.eq('organization_id', params.id)
			.order('name'),
		locals.supabase
			.from('spaces')
			.select(
				'id, property_id, parent_space_id, name, code, kind, status, bedrooms, bathrooms, capacity, floor_label, area_sqm, monthly_rent, deposit_amount'
			)
			.eq('organization_id', params.id)
			.order('created_at'),
		locals.supabase
			.from('people')
			.select(
				'id, user_id, person_type, first_name, last_name, email, phone, id_number, date_of_birth, address_line_1, city, country, notes'
			)
			.eq('organization_id', params.id)
			.order('first_name'),
		locals.supabase
			.from('tenancies')
			.select(
				'id, space_id, lease_reference, status, start_date, end_date, rent_amount, deposit_amount, billing_frequency, rent_due_day, notice_period_days, move_in_at, move_out_at, notes'
			)
			.eq('organization_id', params.id)
			.order('start_date', { ascending: false }),
		locals.supabase.from('tenancy_parties').select('tenancy_id, person_id, role'),
		locals.supabase
			.from('charges')
			.select(
				'id, tenancy_id, charge_type, description, amount, due_on, status, utility_provider, utility_account_reference, billing_period_start, billing_period_end, notes, created_at'
			)
			.eq('organization_id', params.id)
			.order('due_on', { ascending: false }),
		locals.supabase
			.from('payments')
			.select('id, tenancy_id, payer_person_id, amount, payment_date, method, reference, notes')
			.eq('organization_id', params.id)
			.order('payment_date', { ascending: false }),
		locals.supabase
			.from('payment_allocations')
			.select('payment_id, charge_id, amount, created_at')
			.order('created_at', { ascending: false }),
		locals.supabase
			.from('property_expenses')
			.select(
				'id, property_id, space_id, vendor_id, category, description, amount, expense_date, reference, notes, payment_status, approval_status, created_at'
			)
			.eq('organization_id', params.id)
			.order('expense_date', { ascending: false }),
		locals.supabase
			.from('maintenance_requests')
			.select(
				'id, property_id, space_id, title, description, category, source, priority, status, reporter_person_id, assigned_person_id, vendor_id, estimated_cost, actual_cost, reported_at, scheduled_for, sla_due_at, resolution_notes, completed_at, created_at, updated_at'
			)
			.eq('organization_id', params.id)
			.order('created_at', { ascending: false }),
		locals.supabase
			.from('maintenance_updates')
			.select('id, request_id, author_user_id, body, status, created_at')
			.eq('organization_id', params.id)
			.order('created_at', { ascending: false }),
		locals.supabase
			.from('maintenance_vendors')
			.select(
				'id, business_name, contact_name, email, phone, specialties, status, emergency_available, hourly_rate, notes, created_at, updated_at'
			)
			.eq('organization_id', params.id)
			.order('business_name'),
		locals.supabase
			.from('maintenance_plans')
			.select(
				'id, property_id, space_id, vendor_id, title, description, category, frequency_unit, interval_count, next_due_on, last_run_on, priority, estimated_cost, active, created_at, updated_at'
			)
			.eq('organization_id', params.id)
			.order('next_due_on'),
		locals.supabase
			.from('maintenance_plan_runs')
			.select('id, plan_id, request_id, scheduled_for, generated_at')
			.eq('organization_id', params.id)
			.order('generated_at', { ascending: false })
			.limit(30),
		locals.supabase
			.from('maintenance_attachments')
			.select(
				'id, request_id, file_name, storage_path, mime_type, file_size, uploaded_by, created_at'
			)
			.eq('organization_id', params.id)
			.order('created_at', { ascending: false }),
		locals.supabase
			.from('maintenance_sla_reminders')
			.select('id, request_id, reminder_type, due_at, created_at, acknowledged_at')
			.eq('organization_id', params.id)
			.order('due_at'),
		locals.supabase
			.from('collection_followups')
			.select('id, tenancy_id, charge_id, status, next_action_on, notes, created_at, updated_at')
			.eq('organization_id', params.id)
			.order('next_action_on', { ascending: true, nullsFirst: false })
			.order('created_at', { ascending: false }),
		locals.supabase
			.from('organization_members')
			.select('user_id, role, created_at')
			.eq('organization_id', params.id),
		locals.supabase
			.from('organization_workspace_settings')
			.select('*')
			.eq('organization_id', params.id)
			.maybeSingle(),
		locals.supabase
			.from('organization_invitations')
			.select('id, email, role, status, invited_at')
			.eq('organization_id', params.id)
			.order('invited_at', { ascending: false })
			.limit(8),
		locals.supabase
			.from('billing_documents')
			.select(
				'id, document_type, document_number, tenancy_id, person_id, payment_id, charge_id, issue_date, due_date, status, currency_code, total_amount, notes, created_at'
			)
			.eq('organization_id', params.id)
			.order('issue_date', { ascending: false })
			.limit(30),
		locals.supabase
			.from('documents')
			.select(
				'id, property_id, space_id, person_id, tenancy_id, document_type, file_name, storage_path, mime_type, file_size, expires_on, approval_status, created_at'
			)
			.eq('organization_id', params.id)
			.order('created_at', { ascending: false })
			.limit(50)
	]);
	const attachmentRows = maintenanceAttachments.data ?? [];
	const signedAttachments = attachmentRows.length
		? await locals.supabase.storage.from('maintenance-attachments').createSignedUrls(
				attachmentRows.map((attachment) => attachment.storage_path),
				3600
			)
		: { data: [] };
	const signedUrlByPath = new Map(
		(signedAttachments.data ?? []).map((item) => [item.path, item.signedUrl])
	);
	const logo = workspaceSettings.data?.logo_path
		? await locals.supabase.storage
				.from('organization-assets')
				.createSignedUrl(workspaceSettings.data.logo_path, 3600)
		: { data: null };
	const documentRows = documents.data ?? [];
	const signedDocuments = documentRows.length
		? await locals.supabase.storage.from('tenant-documents').createSignedUrls(
				documentRows.map((document) => document.storage_path),
				3600
			)
		: { data: [] };
	const signedDocumentByPath = new Map(
		(signedDocuments.data ?? []).map((item) => [item.path, item.signedUrl])
	);

	return {
		...access,
		sectionKey: params.section,
		section,
		properties: properties.data ?? [],
		spaces: spaces.data ?? [],
		people: people.data ?? [],
		tenancies: tenancies.data ?? [],
		parties: parties.data ?? [],
		charges: charges.data ?? [],
		payments: payments.data ?? [],
		paymentAllocations: paymentAllocations.data ?? [],
		propertyExpenses: propertyExpenses.data ?? [],
		maintenance: maintenance.data ?? [],
		maintenanceUpdates: maintenanceUpdates.data ?? [],
		maintenanceVendors: maintenanceVendors.data ?? [],
		maintenancePlans: maintenancePlans.data ?? [],
		maintenancePlanRuns: maintenancePlanRuns.data ?? [],
		maintenanceAttachments: attachmentRows.map((attachment) => ({
			...attachment,
			url: signedUrlByPath.get(attachment.storage_path) ?? null
		})),
		maintenanceReminders: maintenanceReminders.data ?? [],
		collectionFollowups: collectionFollowups.data ?? [],
		members: members.data ?? [],
		workspaceSettings: workspaceSettings.data,
		brandingLogoUrl: logo.data?.signedUrl ?? null,
		invitations: invitations.data ?? [],
		billingDocuments: billingDocuments.data ?? [],
		documents: documentRows.map((document) => ({
			...document,
			url: signedDocumentByPath.get(document.storage_path) ?? null
		}))
	};
};

export const actions = {
	addProperty: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const name = value(form, 'name');
		if (!name) return fail(400, { message: 'A property name is required.' });
		const { data: insertedProperty, error: insertError } = await locals.supabase
			.from('properties')
			.insert({
				organization_id: params.id,
				name,
				code: value(form, 'code') || null,
				address_line_1: value(form, 'address_line_1') || null,
				city: value(form, 'city') || null,
				country: value(form, 'country') || null,
				postal_code: value(form, 'postal_code') || null,
				latitude: numberOrNull(form.get('latitude')),
				longitude: numberOrNull(form.get('longitude')),
				rental_mode: ['whole_property', 'room_by_room', 'mixed'].includes(
					value(form, 'rental_mode')
				)
					? value(form, 'rental_mode')
					: 'whole_property'
			})
			.select('id')
			.single();
		if (insertError) return fail(400, { message: insertError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'client_property_added',
			entityType: 'property',
			metadata: { name }
		});
		return {
			success: true,
			message: `${name} was added to the portfolio. Choose how it will be rented.`,
			nextStep: 2,
			propertyId: insertedProperty?.id
		};
	},
	updatePropertyRentalMode: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const propertyId = value(form, 'property_id');
		const rentalMode = value(form, 'rental_mode');
		if (!propertyId || !['whole_property', 'room_by_room', 'mixed'].includes(rentalMode))
			return fail(400, { message: 'Choose a valid property and rental model.' });
		const { error: updateError } = await locals.supabase
			.from('properties')
			.update({ rental_mode: rentalMode })
			.eq('id', propertyId)
			.eq('organization_id', params.id);
		if (updateError) return fail(400, { message: updateError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'client_property_rental_mode_updated',
			entityType: 'property',
			entityId: propertyId,
			metadata: { rentalMode }
		});
		return {
			success: true,
			message: 'Rental model saved. Add the spaces people will rent.',
			nextStep: 3,
			propertyId
		};
	},
	updatePropertyStatus: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const status = value(form, 'status');
		if (!['active', 'inactive'].includes(status))
			return fail(400, { message: 'Choose a valid property status.' });
		const { error: updateError } = await locals.supabase
			.from('properties')
			.update({ status })
			.eq('id', value(form, 'property_id'))
			.eq('organization_id', params.id);
		if (updateError) return fail(400, { message: updateError.message });
		return { success: true, message: 'Property status updated.' };
	},
	addSpace: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const propertyId = value(form, 'property_id');
		const name = value(form, 'name');
		const kind = value(form, 'kind') || 'unit';
		if (
			!propertyId ||
			!name ||
			!['unit', 'room', 'bed', 'office', 'shop', 'listing'].includes(kind)
		)
			return fail(400, { message: 'Choose a property, space type, and name.' });
		const { data: parentSpace } = value(form, 'parent_space_id')
			? await locals.supabase
					.from('spaces')
					.select('id, property_id')
					.eq('id', value(form, 'parent_space_id'))
					.eq('organization_id', params.id)
					.maybeSingle()
			: { data: null };
		if (value(form, 'parent_space_id') && (!parentSpace || parentSpace.property_id !== propertyId))
			return fail(400, { message: 'Choose a parent space from the same property.' });
		const { error: insertError } = await locals.supabase.from('spaces').insert({
			organization_id: params.id,
			property_id: propertyId,
			parent_space_id: value(form, 'parent_space_id') || null,
			name,
			kind,
			code: value(form, 'code') || null,
			floor_label: value(form, 'floor_label') || null,
			bedrooms: numberOrNull(form.get('bedrooms')),
			bathrooms: numberOrNull(form.get('bathrooms')),
			capacity: numberOrNull(form.get('capacity')),
			area_sqm: numberOrNull(form.get('area_sqm')),
			monthly_rent: numberOrNull(form.get('monthly_rent')),
			deposit_amount: numberOrNull(form.get('deposit_amount'))
		});
		if (insertError) return fail(400, { message: insertError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'client_space_added',
			entityType: 'space',
			metadata: { name, kind, propertyId }
		});
		return {
			success: true,
			message: `${name} was added to the inventory. Add another space or review the setup.`,
			nextStep: 3,
			propertyId
		};
	},
	addPerson: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const firstName = value(form, 'first_name');
		const lastName = value(form, 'last_name');
		const personType = value(form, 'person_type') || 'tenant';
		if (
			!firstName ||
			!lastName ||
			!['tenant', 'guardian', 'supplier', 'contact'].includes(personType)
		)
			return fail(400, { message: 'Enter a name and choose a valid person type.' });
		const { error: insertError } = await locals.supabase.from('people').insert({
			organization_id: params.id,
			first_name: firstName,
			last_name: lastName,
			person_type: personType,
			email: value(form, 'email') || null,
			phone: value(form, 'phone') || null,
			id_number: value(form, 'id_number') || null,
			date_of_birth: value(form, 'date_of_birth') || null,
			address_line_1: value(form, 'address_line_1') || null,
			city: value(form, 'city') || null,
			country: value(form, 'country') || null,
			notes: value(form, 'notes') || null
		});
		if (insertError) return fail(400, { message: insertError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'client_person_added',
			entityType: 'person',
			metadata: { firstName, lastName, personType }
		});
		return { success: true, message: `${firstName} ${lastName} was added.` };
	},
	createTenant: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const { data: workspaceSettings } = await locals.supabase
			.from('organization_workspace_settings')
			.select(
				'default_rent_due_day, default_notice_period_days, auto_generate_rent_invoices, default_invoice_lead_days'
			)
			.eq('organization_id', params.id)
			.maybeSingle();
		const firstName = value(form, 'first_name');
		const lastName = value(form, 'last_name');
		const spaceId = value(form, 'space_id');
		const startDate = value(form, 'start_date');
		const rent = numberOrNull(form.get('rent_amount'));
		const billingFrequency = value(form, 'billing_frequency') || 'monthly';
		const rentDueDay =
			numberOrNull(form.get('rent_due_day')) ?? workspaceSettings?.default_rent_due_day ?? null;
		const noticePeriodDays =
			numberOrNull(form.get('notice_period_days')) ??
			workspaceSettings?.default_notice_period_days ??
			30;
		const autoInvoice = workspaceSettings?.auto_generate_rent_invoices ?? true;
		const invoiceLeadDays = workspaceSettings?.default_invoice_lead_days ?? 7;
		const status = form.has('checked_in') ? 'active' : 'draft';
		if (!firstName || !lastName || !spaceId || !startDate || rent === null || rent < 0)
			return fail(400, { message: 'Enter the tenant, space, start date, and rent.' });
		if (!['weekly', 'monthly', 'quarterly', 'annual', 'custom'].includes(billingFrequency))
			return fail(400, { message: 'Choose a valid billing frequency.' });
		if (form.has('checked_in') && startDate > new Date().toISOString().slice(0, 10))
			return fail(400, { message: 'A checked-in tenant cannot have a future start date.' });
		const { data: space } = await locals.supabase
			.from('spaces')
			.select('id, property_id, status')
			.eq('id', spaceId)
			.eq('organization_id', params.id)
			.maybeSingle();
		if (!space) return fail(404, { message: 'The selected rentable space was not found.' });
		const { data: existingTenancy } = await locals.supabase
			.from('tenancies')
			.select('id')
			.eq('organization_id', params.id)
			.eq('space_id', spaceId)
			.eq('status', 'active')
			.maybeSingle();
		if (existingTenancy) return fail(409, { message: 'This space already has an active tenancy.' });
		const { data: person, error: personError } = await locals.supabase
			.from('people')
			.insert({
				organization_id: params.id,
				person_type: 'tenant',
				first_name: firstName,
				last_name: lastName,
				email: value(form, 'email') || null,
				phone: value(form, 'phone') || null,
				id_number: value(form, 'id_number') || null,
				date_of_birth: value(form, 'date_of_birth') || null,
				address_line_1: value(form, 'address_line_1') || null,
				city: value(form, 'city') || null,
				country: value(form, 'country') || null,
				notes: value(form, 'person_notes') || null
			})
			.select('id')
			.single();
		if (personError || !person)
			return fail(400, { message: personError?.message ?? 'Could not create the tenant profile.' });
		const { data: tenancy, error: tenancyError } = await locals.supabase
			.from('tenancies')
			.insert({
				organization_id: params.id,
				space_id: spaceId,
				lease_reference: value(form, 'lease_reference') || null,
				start_date: startDate,
				end_date: value(form, 'end_date') || null,
				status,
				rent_amount: rent,
				deposit_amount: numberOrNull(form.get('deposit_amount')) ?? 0,
				billing_frequency: billingFrequency,
				rent_due_day: rentDueDay,
				notice_period_days: noticePeriodDays,
				move_in_at: status === 'active' ? new Date().toISOString() : null,
				notes: value(form, 'lease_notes') || null
			})
			.select('id')
			.single();
		if (tenancyError || !tenancy) {
			await locals.supabase
				.from('people')
				.delete()
				.eq('id', person.id)
				.eq('organization_id', params.id);
			return fail(400, { message: tenancyError?.message ?? 'Could not create the tenancy.' });
		}
		const partyResult = await locals.supabase
			.from('tenancy_parties')
			.insert({ tenancy_id: tenancy.id, person_id: person.id, role: 'primary' });
		const scheduleResult = await locals.supabase.from('charge_schedules').insert({
			organization_id: params.id,
			tenancy_id: tenancy.id,
			description: 'Rent',
			amount: rent,
			frequency: billingFrequency,
			due_day: rentDueDay,
			next_due_on: firstRentDueDate(startDate, rentDueDay, billingFrequency),
			auto_invoice: autoInvoice,
			invoice_lead_days: invoiceLeadDays
		});
		if (partyResult.error || scheduleResult.error) {
			await locals.supabase
				.from('tenancies')
				.delete()
				.eq('id', tenancy.id)
				.eq('organization_id', params.id);
			await locals.supabase
				.from('people')
				.delete()
				.eq('id', person.id)
				.eq('organization_id', params.id);
			return fail(400, {
				message:
					partyResult.error?.message ??
					scheduleResult.error?.message ??
					'Could not create the rent schedule.'
			});
		}
		if (status === 'active')
			await locals.supabase
				.from('spaces')
				.update({ status: 'occupied' })
				.eq('id', spaceId)
				.eq('organization_id', params.id);
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'tenant_onboarded',
			entityType: 'tenancy',
			entityId: tenancy.id,
			metadata: { personId: person.id, spaceId, checkedIn: status === 'active' }
		});
		return {
			success: true,
			message:
				status === 'active'
					? 'Tenant added and checked in.'
					: 'Tenant profile and lease saved as a draft.'
		};
	},
	updatePerson: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const personId = value(form, 'person_id');
		const firstName = value(form, 'first_name');
		const lastName = value(form, 'last_name');
		if (!personId || !firstName || !lastName)
			return fail(400, { message: 'A person and full name are required.' });
		const { error: updateError } = await locals.supabase
			.from('people')
			.update({
				first_name: firstName,
				last_name: lastName,
				email: value(form, 'email') || null,
				phone: value(form, 'phone') || null,
				id_number: value(form, 'id_number') || null,
				address_line_1: value(form, 'address_line_1') || null,
				city: value(form, 'city') || null,
				country: value(form, 'country') || null,
				notes: value(form, 'notes') || null
			})
			.eq('id', personId)
			.eq('organization_id', params.id);
		if (updateError) return fail(400, { message: updateError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'tenant_profile_updated',
			entityType: 'person',
			entityId: personId
		});
		return { success: true, message: 'Tenant profile updated.' };
	},
	updateTenancy: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const tenancyId = value(form, 'tenancy_id');
		const status = value(form, 'status');
		const rent = numberOrNull(form.get('rent_amount'));
		if (
			!tenancyId ||
			rent === null ||
			rent < 0 ||
			!['draft', 'active', 'ending_soon', 'expired', 'terminated', 'completed'].includes(status)
		)
			return fail(400, { message: 'Enter a valid lease status and rent.' });
		const { data: tenancy } = await locals.supabase
			.from('tenancies')
			.select('id, space_id, move_in_at')
			.eq('id', tenancyId)
			.eq('organization_id', params.id)
			.maybeSingle();
		if (!tenancy) return fail(404, { message: 'The selected tenancy was not found.' });
		const moveInAt =
			status === 'active' ? (tenancy.move_in_at ?? new Date().toISOString()) : tenancy.move_in_at;
		const { error: updateError } = await locals.supabase
			.from('tenancies')
			.update({
				status,
				start_date: value(form, 'start_date'),
				end_date: value(form, 'end_date') || null,
				rent_amount: rent,
				deposit_amount: numberOrNull(form.get('deposit_amount')) ?? 0,
				billing_frequency: value(form, 'billing_frequency') || 'monthly',
				rent_due_day: numberOrNull(form.get('rent_due_day')),
				notice_period_days: numberOrNull(form.get('notice_period_days')),
				move_in_at: moveInAt,
				notes: value(form, 'notes') || null
			})
			.eq('id', tenancyId)
			.eq('organization_id', params.id);
		if (updateError) return fail(400, { message: updateError.message });
		await locals.supabase
			.from('charge_schedules')
			.update({
				amount: rent,
				frequency: value(form, 'billing_frequency') || 'monthly',
				due_day: numberOrNull(form.get('rent_due_day')),
				active: status === 'active'
			})
			.eq('tenancy_id', tenancyId)
			.eq('organization_id', params.id)
			.eq('description', 'Rent');
		const { count: activeTenancies } = await locals.supabase
			.from('tenancies')
			.select('id', { count: 'exact', head: true })
			.eq('organization_id', params.id)
			.eq('space_id', tenancy.space_id)
			.eq('status', 'active');
		await locals.supabase
			.from('spaces')
			.update({ status: activeTenancies ? 'occupied' : 'vacant' })
			.eq('id', tenancy.space_id)
			.eq('organization_id', params.id);
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'lease_details_updated',
			entityType: 'tenancy',
			entityId: tenancyId,
			metadata: { status, rent }
		});
		return { success: true, message: 'Lease details updated.' };
	},
	endTenancy: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const tenancyId = value(form, 'tenancy_id');
		const moveOutDate = value(form, 'move_out_date');
		const reason = value(form, 'reason');
		if (!tenancyId || !moveOutDate)
			return fail(400, { message: 'Choose a tenancy and move-out date.' });
		const { data: tenancy } = await locals.supabase
			.from('tenancies')
			.select('id, space_id, notes')
			.eq('id', tenancyId)
			.eq('organization_id', params.id)
			.maybeSingle();
		if (!tenancy) return fail(404, { message: 'The selected tenancy was not found.' });
		const { error: updateError } = await locals.supabase
			.from('tenancies')
			.update({
				status: 'completed',
				end_date: moveOutDate,
				move_out_at: `${moveOutDate}T00:00:00.000Z`,
				notes: [tenancy.notes, reason ? `Move-out: ${reason}` : 'Move-out recorded.']
					.filter(Boolean)
					.join('\\n')
			})
			.eq('id', tenancyId)
			.eq('organization_id', params.id);
		if (updateError) return fail(400, { message: updateError.message });
		const { count } = await locals.supabase
			.from('tenancies')
			.select('id', { count: 'exact', head: true })
			.eq('organization_id', params.id)
			.eq('space_id', tenancy.space_id)
			.eq('status', 'active');
		if (!count)
			await locals.supabase
				.from('spaces')
				.update({ status: 'vacant' })
				.eq('id', tenancy.space_id)
				.eq('organization_id', params.id);
		await locals.supabase
			.from('charge_schedules')
			.update({ active: false })
			.eq('tenancy_id', tenancyId)
			.eq('organization_id', params.id)
			.eq('description', 'Rent');
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'tenancy_completed',
			entityType: 'tenancy',
			entityId: tenancyId,
			metadata: { moveOutDate, reason }
		});
		return { success: true, message: 'Tenancy closed and the space is available for re-letting.' };
	},
	updateDocumentApproval: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const documentId = value(form, 'document_id');
		const approvalStatus = value(form, 'approval_status');
		if (!documentId || !['pending', 'approved', 'rejected'].includes(approvalStatus))
			return fail(400, { message: 'Choose a document and valid approval status.' });
		const { error: updateError } = await locals.supabase
			.from('documents')
			.update({
				approval_status: approvalStatus,
				approved_by: approvalStatus === 'approved' ? access.user.id : null,
				approved_at: approvalStatus === 'approved' ? new Date().toISOString() : null
			})
			.eq('id', documentId)
			.eq('organization_id', params.id);
		if (updateError) return fail(400, { message: updateError.message });
		return { success: true, message: `Document marked ${approvalStatus}.` };
	},
	createTenancy: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const { data: workspaceSettings } = await locals.supabase
			.from('organization_workspace_settings')
			.select(
				'default_rent_due_day, default_notice_period_days, auto_generate_rent_invoices, default_invoice_lead_days'
			)
			.eq('organization_id', params.id)
			.maybeSingle();
		const spaceId = value(form, 'space_id');
		const personId = value(form, 'person_id');
		const startDate = value(form, 'start_date');
		const rent = numberOrNull(form.get('rent_amount'));
		if (!spaceId || !personId || !startDate || rent === null || rent < 0)
			return fail(400, {
				message: 'Choose the tenant and space, then enter a start date and rent.'
			});
		const billingFrequency = value(form, 'billing_frequency') || 'monthly';
		const rentDueDay =
			numberOrNull(form.get('rent_due_day')) ?? workspaceSettings?.default_rent_due_day ?? null;
		const noticePeriodDays =
			numberOrNull(form.get('notice_period_days')) ??
			workspaceSettings?.default_notice_period_days ??
			30;
		const tenancy = await locals.supabase
			.from('tenancies')
			.insert({
				organization_id: params.id,
				space_id: spaceId,
				lease_reference: value(form, 'lease_reference') || null,
				start_date: startDate,
				end_date: value(form, 'end_date') || null,
				status: value(form, 'status') || 'active',
				rent_amount: rent,
				deposit_amount: numberOrNull(form.get('deposit_amount')) ?? 0,
				billing_frequency: billingFrequency,
				rent_due_day: rentDueDay,
				notice_period_days: noticePeriodDays,
				move_in_at: value(form, 'status') === 'draft' ? null : new Date().toISOString(),
				notes: value(form, 'notes') || null
			})
			.select('id')
			.single();
		if (tenancy.error || !tenancy.data)
			return fail(400, { message: tenancy.error?.message ?? 'Could not create the lease.' });
		const partyResult = await locals.supabase
			.from('tenancy_parties')
			.insert({ tenancy_id: tenancy.data.id, person_id: personId, role: 'primary' });
		if (partyResult.error) return fail(400, { message: partyResult.error.message });
		await locals.supabase.from('charge_schedules').insert({
			organization_id: params.id,
			tenancy_id: tenancy.data.id,
			description: 'Rent',
			amount: rent,
			frequency: billingFrequency,
			due_day: rentDueDay,
			next_due_on: firstRentDueDate(startDate, rentDueDay, billingFrequency),
			auto_invoice: workspaceSettings?.auto_generate_rent_invoices ?? true,
			invoice_lead_days: workspaceSettings?.default_invoice_lead_days ?? 7
		});
		if (value(form, 'status') !== 'draft')
			await locals.supabase
				.from('spaces')
				.update({ status: 'occupied' })
				.eq('id', spaceId)
				.eq('organization_id', params.id);
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'client_tenancy_created',
			entityType: 'tenancy',
			entityId: tenancy.data.id,
			metadata: { spaceId, personId, rent }
		});
		return { success: true, message: 'Tenancy and its rent schedule were created.' };
	},
	addCharge: async ({ request, locals, params }) => {
		const access = await getFinanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Finance or manager access is required.' });
		const form = await request.formData();
		const amount = numberOrNull(form.get('amount'));
		const tenancyId = value(form, 'tenancy_id');
		const chargeType = value(form, 'charge_type') || 'rent';
		if (
			!tenancyId ||
			amount === null ||
			amount < 0 ||
			!value(form, 'due_on') ||
			!['rent', 'deposit', 'utility', 'fee', 'other'].includes(chargeType)
		)
			return fail(400, { message: 'Choose a tenancy, amount, and due date.' });
		const { data: tenancy } = await locals.supabase
			.from('tenancies')
			.select('id, organization_id')
			.eq('id', tenancyId)
			.eq('organization_id', params.id)
			.maybeSingle();
		if (!tenancy) return fail(404, { message: 'The selected tenancy was not found.' });
		const { data: charge, error: insertError } = await locals.supabase
			.from('charges')
			.insert({
				organization_id: params.id,
				tenancy_id: tenancyId,
				charge_type: chargeType,
				description: value(form, 'description') || 'Charge',
				amount,
				due_on: value(form, 'due_on'),
				status: form.has('save_draft') ? 'draft' : 'issued',
				utility_provider: value(form, 'utility_provider') || null,
				utility_account_reference: value(form, 'utility_account_reference') || null,
				billing_period_start: value(form, 'billing_period_start') || null,
				billing_period_end: value(form, 'billing_period_end') || null,
				notes: value(form, 'notes') || null
			})
			.select('id, amount, description, due_on')
			.single();
		if (insertError) return fail(400, { message: insertError.message });
		if (form.has('issue_invoice') && charge && !form.has('save_draft')) {
			const [{ data: setting }, { data: party }] = await Promise.all([
				locals.supabase
					.from('organization_workspace_settings')
					.select('invoice_prefix, send_invoice_notifications')
					.eq('organization_id', params.id)
					.maybeSingle(),
				locals.supabase
					.from('tenancy_parties')
					.select('person_id, people(id, email)')
					.eq('tenancy_id', tenancyId)
					.eq('role', 'primary')
					.maybeSingle()
			]);
			const person = Array.isArray(party?.people) ? party.people[0] : party?.people;
			const { error: invoiceError } = await locals.supabase.from('billing_documents').insert({
				organization_id: params.id,
				document_type: 'invoice',
				document_number: newDocumentNumber(
					setting?.invoice_prefix ?? 'INV',
					new Date().getFullYear()
				),
				tenancy_id: tenancyId,
				person_id: person?.id ?? null,
				charge_id: charge.id,
				issue_date: new Date().toISOString().slice(0, 10),
				due_date: charge.due_on,
				currency_code: access.organization.currency_code,
				subtotal: charge.amount,
				total_amount: charge.amount,
				line_items: [{ description: charge.description, quantity: 1, amount: charge.amount }],
				created_by: access.user.id
			});
			if (invoiceError)
				return fail(400, {
					message: `Charge created, but invoice generation failed: ${invoiceError.message}`
				});
			if (setting?.send_invoice_notifications !== false && person?.email)
				await locals.supabase.from('notification_outbox').insert({
					organization_id: params.id,
					recipient_address: person.email,
					channel: 'email',
					event_type: 'invoice_issued',
					payload: { charge_id: charge.id, amount: charge.amount },
					idempotency_key: `invoice:${charge.id}`
				});
		}
		return {
			success: true,
			message: form.has('save_draft')
				? 'Charge saved as a draft.'
				: form.has('issue_invoice')
					? 'Charge issued and invoice created.'
					: 'Charge added to the collection ledger.'
		};
	},
	recordPayment: async ({ request, locals, params }) => {
		const access = await getFinanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Finance or manager access is required.' });
		const form = await request.formData();
		const amount = numberOrNull(form.get('amount'));
		if (amount === null || amount <= 0 || !value(form, 'payment_date'))
			return fail(400, { message: 'Enter a payment amount and date.' });
		const { data: payment, error: insertError } = await locals.supabase
			.from('payments')
			.insert({
				organization_id: params.id,
				tenancy_id: value(form, 'tenancy_id') || null,
				payer_person_id: value(form, 'payer_person_id') || null,
				amount,
				payment_date: value(form, 'payment_date'),
				method: value(form, 'method') || 'manual',
				reference: value(form, 'reference') || null,
				notes: value(form, 'notes') || null
			})
			.select('id, amount, tenancy_id, payer_person_id, payment_date, reference')
			.single();
		if (insertError) return fail(400, { message: insertError.message });
		let allocatedAmount = 0;
		let allocationWarning = '';
		if (payment?.tenancy_id && form.has('auto_allocate')) {
			const allocation = await locals.supabase.rpc('allocate_payment_to_oldest_charges', {
				target_payment_id: payment.id
			});
			if (allocation.error)
				allocationWarning = ` Automatic allocation needs review: ${allocation.error.message}`;
			else allocatedAmount = Number(allocation.data ?? 0);
		}
		if (form.has('generate_receipt') && payment) {
			const [{ data: setting }, { data: person }] = await Promise.all([
				locals.supabase
					.from('organization_workspace_settings')
					.select('receipt_prefix, send_payment_receipts')
					.eq('organization_id', params.id)
					.maybeSingle(),
				payment.payer_person_id
					? locals.supabase
							.from('people')
							.select('id, email')
							.eq('id', payment.payer_person_id)
							.maybeSingle()
					: Promise.resolve({ data: null })
			]);
			const { error: receiptError } = await locals.supabase.from('billing_documents').insert({
				organization_id: params.id,
				document_type: 'receipt',
				document_number: newDocumentNumber(
					setting?.receipt_prefix ?? 'RCT',
					new Date().getFullYear()
				),
				tenancy_id: payment.tenancy_id,
				person_id: person?.id ?? null,
				payment_id: payment.id,
				issue_date: payment.payment_date,
				status: 'paid',
				currency_code: access.organization.currency_code,
				subtotal: payment.amount,
				total_amount: payment.amount,
				line_items: [
					{
						description: payment.reference || 'Rental payment',
						quantity: 1,
						amount: payment.amount
					}
				],
				created_by: access.user.id
			});
			if (receiptError)
				return fail(400, {
					message: `Payment recorded, but receipt generation failed: ${receiptError.message}`
				});
			if (setting?.send_payment_receipts !== false && person?.email)
				await locals.supabase.from('notification_outbox').insert({
					organization_id: params.id,
					recipient_address: person.email,
					channel: 'email',
					event_type: 'payment_receipt_issued',
					payload: { payment_id: payment.id, amount: payment.amount },
					idempotency_key: `receipt:${payment.id}`
				});
		}
		return {
			success: true,
			message: form.has('generate_receipt')
				? `Payment recorded${allocatedAmount ? ` and ${access.organization.currency_code} ${allocatedAmount.toFixed(2)} allocated` : ''} and receipt generated.${allocationWarning}`
				: `Payment recorded${allocatedAmount ? ` and ${access.organization.currency_code} ${allocatedAmount.toFixed(2)} allocated` : ''}.${allocationWarning}`
		};
	},
	addExpense: async ({ request, locals, params }) => {
		const access = await getFinanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Finance or manager access is required.' });
		const form = await request.formData();
		const propertyId = value(form, 'property_id');
		const spaceId = value(form, 'space_id');
		const vendorId = value(form, 'vendor_id');
		const description = value(form, 'description');
		const amount = numberOrNull(form.get('amount'));
		const expenseDate = value(form, 'expense_date');
		const paymentStatus = value(form, 'payment_status') || 'paid';
		const approvalStatus = value(form, 'approval_status') || 'approved';
		const categories = [
			'rates',
			'insurance',
			'utilities',
			'security',
			'cleaning',
			'staff',
			'repairs',
			'contractor',
			'management_fee',
			'other'
		];
		if (
			!propertyId ||
			!description ||
			amount === null ||
			amount < 0 ||
			!expenseDate ||
			!['unpaid', 'partially_paid', 'paid', 'reimbursable'].includes(paymentStatus) ||
			!['pending', 'approved', 'rejected'].includes(approvalStatus) ||
			!categories.includes(value(form, 'category'))
		)
			return fail(400, {
				message: 'Choose a property, category, date, description, and valid amount.'
			});
		const [{ data: property }, { data: space }, { data: vendor }] = await Promise.all([
			locals.supabase
				.from('properties')
				.select('id')
				.eq('id', propertyId)
				.eq('organization_id', params.id)
				.maybeSingle(),
			spaceId
				? locals.supabase
						.from('spaces')
						.select('id, property_id')
						.eq('id', spaceId)
						.eq('organization_id', params.id)
						.maybeSingle()
				: Promise.resolve({ data: null }),
			vendorId
				? locals.supabase
						.from('maintenance_vendors')
						.select('id')
						.eq('id', vendorId)
						.eq('organization_id', params.id)
						.maybeSingle()
				: Promise.resolve({ data: null })
		]);
		if (!property) return fail(404, { message: 'The selected property was not found.' });
		if (spaceId && (!space || space.property_id !== propertyId))
			return fail(400, { message: 'The selected space does not belong to this property.' });
		if (vendorId && !vendor) return fail(404, { message: 'The selected vendor was not found.' });
		const { error: insertError } = await locals.supabase.from('property_expenses').insert({
			organization_id: params.id,
			property_id: propertyId,
			space_id: spaceId || null,
			vendor_id: vendorId || null,
			category: value(form, 'category'),
			description,
			amount,
			expense_date: expenseDate,
			reference: value(form, 'reference') || null,
			notes: value(form, 'notes') || null,
			payment_status: paymentStatus,
			approval_status: approvalStatus,
			created_by: access.user.id
		});
		if (insertError) return fail(400, { message: insertError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'property_expense_added',
			entityType: 'property_expense',
			metadata: { propertyId, category: value(form, 'category'), amount }
		});
		return { success: true, message: 'Operating expense recorded.' };
	},
	allocatePayment: async ({ request, locals, params }) => {
		const access = await getFinanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Finance or manager access is required.' });
		const form = await request.formData();
		const paymentId = value(form, 'payment_id');
		const chargeId = value(form, 'charge_id');
		const amount = numberOrNull(form.get('amount'));
		if (!paymentId || !chargeId || amount === null || amount <= 0)
			return fail(400, {
				message: 'Choose a payment and charge, then enter an allocation amount.'
			});
		const [{ data: payment }, { data: charge }] = await Promise.all([
			locals.supabase
				.from('payments')
				.select('id, amount, organization_id, tenancy_id')
				.eq('id', paymentId)
				.eq('organization_id', params.id)
				.maybeSingle(),
			locals.supabase
				.from('charges')
				.select('id, amount, organization_id, tenancy_id, status')
				.eq('id', chargeId)
				.eq('organization_id', params.id)
				.maybeSingle()
		]);
		if (!payment || !charge)
			return fail(404, { message: 'The selected payment or charge was not found.' });
		if (charge.status === 'void')
			return fail(400, { message: 'Void charges cannot receive allocations.' });
		if (payment.tenancy_id && payment.tenancy_id !== charge.tenancy_id)
			return fail(400, { message: 'The payment and charge belong to different tenancies.' });
		const [{ data: existing }, { data: paymentAllocations }] = await Promise.all([
			locals.supabase
				.from('payment_allocations')
				.select('amount')
				.eq('payment_id', paymentId)
				.eq('charge_id', chargeId)
				.maybeSingle(),
			locals.supabase.from('payment_allocations').select('amount').eq('payment_id', paymentId)
		]);
		const existingPairAmount = Number(existing?.amount ?? 0);
		const paymentAllocatedAmount = (paymentAllocations ?? []).reduce(
			(total, allocation) => total + Number(allocation.amount ?? 0),
			0
		);
		if (paymentAllocatedAmount + amount > Number(payment.amount))
			return fail(400, { message: 'This allocation would exceed the payment amount.' });
		if (existingPairAmount + amount > Number(charge.amount))
			return fail(400, { message: 'This allocation would exceed the charge amount.' });
		const { error: upsertError } = await locals.supabase.from('payment_allocations').upsert(
			{
				payment_id: paymentId,
				charge_id: chargeId,
				amount: existingPairAmount + amount
			},
			{ onConflict: 'payment_id,charge_id' }
		);
		if (upsertError) return fail(400, { message: upsertError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'payment_allocated',
			entityType: 'payment_allocation',
			metadata: { paymentId, chargeId, amount }
		});
		return { success: true, message: 'Payment allocated to the selected charge.' };
	},
	addCollectionFollowup: async ({ request, locals, params }) => {
		const access = await getFinanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Finance or manager access is required.' });
		const form = await request.formData();
		const tenancyId = value(form, 'tenancy_id');
		const chargeId = value(form, 'charge_id');
		const notes = value(form, 'notes');
		const status = value(form, 'status') || 'open';
		if (!tenancyId || !notes || !['open', 'promised', 'resolved', 'written_off'].includes(status))
			return fail(400, { message: 'Choose a tenancy, status, and follow-up note.' });
		const { data: tenancy } = await locals.supabase
			.from('tenancies')
			.select('id')
			.eq('id', tenancyId)
			.eq('organization_id', params.id)
			.maybeSingle();
		if (!tenancy) return fail(404, { message: 'The selected tenancy was not found.' });
		if (chargeId) {
			const { data: charge } = await locals.supabase
				.from('charges')
				.select('id, tenancy_id')
				.eq('id', chargeId)
				.eq('organization_id', params.id)
				.maybeSingle();
			if (!charge || charge.tenancy_id !== tenancyId)
				return fail(400, { message: 'The selected charge does not belong to this tenancy.' });
		}
		const { error: insertError } = await locals.supabase.from('collection_followups').insert({
			organization_id: params.id,
			tenancy_id: tenancyId,
			charge_id: chargeId || null,
			status,
			next_action_on: value(form, 'next_action_on') || null,
			notes,
			created_by: access.user.id
		});
		if (insertError) return fail(400, { message: insertError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'collection_followup_added',
			entityType: 'collection_followup',
			metadata: { tenancyId, status }
		});
		return { success: true, message: 'Collection follow-up saved.' };
	},
	createTenantPortalAccess: async ({ request, locals, params, url }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		if (!env.SUPABASE_SERVICE_ROLE_KEY)
			return fail(500, { message: 'Portal access credentials are not configured.' });
		const form = await request.formData();
		const personId = value(form, 'person_id');
		const { data: person } = await locals.supabase
			.from('people')
			.select('id, email, person_type, first_name, last_name')
			.eq('id', personId)
			.eq('organization_id', params.id)
			.maybeSingle();
		const email = (value(form, 'email') || person?.email || '').toLowerCase();
		if (!person || person.person_type !== 'tenant' || !email.includes('@'))
			return fail(400, { message: 'Choose a tenant with a valid email address.' });
		const adminClient = createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
			auth: { autoRefreshToken: false, persistSession: false }
		});
		const users = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
		const existingUser = users.data?.users.find((user) => user.email?.toLowerCase() === email);
		let userId = existingUser?.id;
		if (!userId) {
			const invite = await adminClient.auth.admin.inviteUserByEmail(email, {
				redirectTo: new URL('/login', url).toString(),
				data: { tenant_portal: true, organization_id: params.id }
			});
			if (invite.error || !invite.data.user)
				return fail(502, {
					message: invite.error?.message ?? 'The tenant invitation could not be sent.'
				});
			userId = invite.data.user.id;
		}
		const { error: updateError } = await adminClient
			.from('people')
			.update({ user_id: userId, email })
			.eq('id', personId)
			.eq('organization_id', params.id);
		if (updateError) return fail(400, { message: updateError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'tenant_portal_access_provisioned',
			entityType: 'person',
			entityId: personId,
			metadata: { email }
		});
		return {
			success: true,
			message: existingUser
				? `${email} now has tenant portal access.`
				: `Portal invitation sent to ${email}.`
		};
	},
	uploadDocument: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const file = form.get('file');
		const personId = value(form, 'person_id');
		if (!(file instanceof File) || file.size === 0 || !personId)
			return fail(400, { message: 'Choose a tenant and a document.' });
		if (file.size > 10 * 1024 * 1024)
			return fail(400, { message: 'Documents must be 10 MB or smaller.' });
		if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type))
			return fail(400, { message: 'Only PDF, JPG, PNG, and WebP documents are supported.' });
		const { data: person } = await locals.supabase
			.from('people')
			.select('id')
			.eq('id', personId)
			.eq('organization_id', params.id)
			.maybeSingle();
		if (!person) return fail(404, { message: 'Tenant record not found.' });
		const storagePath = `${params.id}/${personId}/${randomUUID()}-${safeFileName(file.name)}`;
		const upload = await locals.supabase.storage
			.from('tenant-documents')
			.upload(storagePath, file, { contentType: file.type, upsert: false });
		if (upload.error) return fail(400, { message: upload.error.message });
		const { error: documentError } = await locals.supabase.from('documents').insert({
			organization_id: params.id,
			person_id: personId,
			tenancy_id: value(form, 'tenancy_id') || null,
			document_type: value(form, 'document_type') || 'other',
			file_name: file.name,
			storage_path: storagePath,
			mime_type: file.type,
			file_size: file.size,
			expires_on: value(form, 'expires_on') || null,
			approval_status: 'approved',
			approved_by: access.user.id,
			approved_at: new Date().toISOString(),
			uploaded_by: access.user.id
		});
		if (documentError) {
			await locals.supabase.storage.from('tenant-documents').remove([storagePath]);
			return fail(400, { message: documentError.message });
		}
		return { success: true, message: `${file.name} was added to the tenant document register.` };
	},
	createMaintenance: async ({ request, locals, params }) => {
		const access = await getMaintenanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Maintenance or manager access is required.' });
		const form = await request.formData();
		const propertyId = value(form, 'property_id');
		const title = value(form, 'title');
		const category = value(form, 'category') || 'general';
		const source = value(form, 'source') || 'client';
		const priority = value(form, 'priority') || 'normal';
		const sources = ['client', 'staff', 'inspection', 'preventive'];
		if (!propertyId || !title)
			return fail(400, { message: 'Choose a property and describe the request.' });
		if (
			!maintenanceCategories.includes(category) ||
			!sources.includes(source) ||
			!maintenancePriorities.includes(priority)
		)
			return fail(400, { message: 'Choose a valid maintenance category, source, and priority.' });
		const { error: insertError } = await locals.supabase.from('maintenance_requests').insert({
			organization_id: params.id,
			property_id: propertyId,
			space_id: value(form, 'space_id') || null,
			reporter_person_id: value(form, 'reporter_person_id') || null,
			assigned_person_id: value(form, 'assigned_person_id') || null,
			vendor_id: value(form, 'vendor_id') || null,
			title,
			description: value(form, 'description') || null,
			category,
			source,
			priority,
			reported_at: new Date().toISOString(),
			scheduled_for: value(form, 'scheduled_for') || null,
			sla_due_at: value(form, 'sla_due_at') || null,
			estimated_cost: numberOrNull(form.get('estimated_cost')),
			resolution_notes: value(form, 'resolution_notes') || null
		});
		if (insertError) return fail(400, { message: insertError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'maintenance_request_created',
			entityType: 'maintenance_request',
			metadata: { propertyId, category, source, priority }
		});
		return { success: true, message: 'Maintenance request logged and placed on the board.' };
	},
	updateMaintenanceRequest: async ({ request, locals, params }) => {
		const access = await getMaintenanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Maintenance or manager access is required.' });
		const form = await request.formData();
		const requestId = value(form, 'request_id');
		const status = value(form, 'status');
		const category = value(form, 'category');
		const priority = value(form, 'priority');
		const statuses = maintenanceStatuses;
		if (
			!requestId ||
			!statuses.includes(status) ||
			!maintenanceCategories.includes(category) ||
			!maintenancePriorities.includes(priority)
		)
			return fail(400, { message: 'Choose valid maintenance request details.' });
		const { error: updateError } = await locals.supabase
			.from('maintenance_requests')
			.update({
				status,
				category,
				priority,
				assigned_person_id: value(form, 'assigned_person_id') || null,
				vendor_id: value(form, 'vendor_id') || null,
				scheduled_for: value(form, 'scheduled_for') || null,
				estimated_cost: numberOrNull(form.get('estimated_cost')),
				actual_cost: numberOrNull(form.get('actual_cost')),
				resolution_notes: value(form, 'resolution_notes') || null,
				completed_at: ['completed', 'closed'].includes(status) ? new Date().toISOString() : null
			})
			.eq('id', requestId)
			.eq('organization_id', params.id);
		if (updateError) return fail(400, { message: updateError.message });
		return { success: true, message: 'Maintenance request updated.' };
	},
	addMaintenanceUpdate: async ({ request, locals, params }) => {
		const access = await getMaintenanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Maintenance or manager access is required.' });
		const form = await request.formData();
		const requestId = value(form, 'request_id');
		const body = value(form, 'body');
		if (!requestId || body.length < 3)
			return fail(400, { message: 'Add a short update before posting to the timeline.' });
		const { data: maintenanceRequest } = await locals.supabase
			.from('maintenance_requests')
			.select('id')
			.eq('id', requestId)
			.eq('organization_id', params.id)
			.maybeSingle();
		if (!maintenanceRequest) return fail(404, { message: 'Maintenance request not found.' });
		const { error: insertError } = await locals.supabase.from('maintenance_updates').insert({
			organization_id: params.id,
			request_id: requestId,
			author_user_id: access.user.id,
			body,
			status: value(form, 'status') || null
		});
		if (insertError) return fail(400, { message: insertError.message });
		return { success: true, message: 'Maintenance update added.' };
	},
	uploadMaintenanceAttachment: async ({ request, locals, params }) => {
		const access = await getMaintenanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Maintenance or manager access is required.' });
		const form = await request.formData();
		const requestId = value(form, 'request_id');
		const file = form.get('file');
		if (!requestId || !(file instanceof File) || file.size === 0)
			return fail(400, { message: 'Choose an image or PDF attachment.' });
		if (file.size > 10 * 1024 * 1024)
			return fail(400, { message: 'Attachments must be 10 MB or smaller.' });
		if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type))
			return fail(400, { message: 'Only JPG, PNG, WebP, and PDF files are supported.' });
		const { data: maintenanceRequest } = await locals.supabase
			.from('maintenance_requests')
			.select('id')
			.eq('id', requestId)
			.eq('organization_id', params.id)
			.maybeSingle();
		if (!maintenanceRequest) return fail(404, { message: 'Maintenance request not found.' });
		const storagePath = `${params.id}/${requestId}/${randomUUID()}-${safeFileName(file.name)}`;
		const upload = await locals.supabase.storage
			.from('maintenance-attachments')
			.upload(storagePath, file, { contentType: file.type, upsert: false });
		if (upload.error) return fail(400, { message: upload.error.message });
		const attachment = await locals.supabase.from('maintenance_attachments').insert({
			organization_id: params.id,
			request_id: requestId,
			uploaded_by: access.user.id,
			file_name: file.name,
			storage_path: storagePath,
			mime_type: file.type,
			file_size: file.size
		});
		if (attachment.error) {
			await locals.supabase.storage.from('maintenance-attachments').remove([storagePath]);
			return fail(400, { message: attachment.error.message });
		}
		return { success: true, message: `${file.name} was attached to the request.` };
	},
	deleteMaintenanceAttachment: async ({ request, locals, params }) => {
		const access = await getMaintenanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Maintenance or manager access is required.' });
		const attachmentId = value(await request.formData(), 'attachment_id');
		const { data: attachment } = await locals.supabase
			.from('maintenance_attachments')
			.select('id, storage_path')
			.eq('id', attachmentId)
			.eq('organization_id', params.id)
			.maybeSingle();
		if (!attachment) return fail(404, { message: 'Attachment not found.' });
		await locals.supabase.storage.from('maintenance-attachments').remove([attachment.storage_path]);
		const { error: deleteError } = await locals.supabase
			.from('maintenance_attachments')
			.delete()
			.eq('id', attachment.id)
			.eq('organization_id', params.id);
		if (deleteError) return fail(400, { message: deleteError.message });
		return { success: true, message: 'Attachment removed.' };
	},
	createMaintenanceVendor: async ({ request, locals, params }) => {
		const access = await getMaintenanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Maintenance or manager access is required.' });
		const form = await request.formData();
		const businessName = value(form, 'business_name');
		if (!businessName) return fail(400, { message: 'Enter the vendor or contractor name.' });
		const specialties = value(form, 'specialties')
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean)
			.slice(0, 12);
		const { error: insertError } = await locals.supabase.from('maintenance_vendors').insert({
			organization_id: params.id,
			business_name: businessName,
			contact_name: value(form, 'contact_name') || null,
			email: value(form, 'email') || null,
			phone: value(form, 'phone') || null,
			specialties,
			status: 'active',
			emergency_available: form.has('emergency_available'),
			hourly_rate: numberOrNull(form.get('hourly_rate')),
			notes: value(form, 'notes') || null
		});
		if (insertError) return fail(400, { message: insertError.message });
		return { success: true, message: `${businessName} was added to the contractor directory.` };
	},
	updateMaintenanceVendor: async ({ request, locals, params }) => {
		const access = await getMaintenanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Maintenance or manager access is required.' });
		const form = await request.formData();
		const vendorId = value(form, 'vendor_id');
		const status = value(form, 'status');
		if (!vendorId || !['active', 'inactive'].includes(status))
			return fail(400, { message: 'Choose a valid vendor status.' });
		const { error: updateError } = await locals.supabase
			.from('maintenance_vendors')
			.update({ status })
			.eq('id', vendorId)
			.eq('organization_id', params.id);
		if (updateError) return fail(400, { message: updateError.message });
		return { success: true, message: 'Vendor status updated.' };
	},
	createMaintenancePlan: async ({ request, locals, params }) => {
		const access = await getMaintenanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Maintenance or manager access is required.' });
		const form = await request.formData();
		const title = value(form, 'title');
		const propertyId = value(form, 'property_id');
		const nextDueOn = value(form, 'next_due_on');
		const frequencyUnit = value(form, 'frequency_unit') || 'monthly';
		const intervalCount = numberOrNull(form.get('interval_count')) ?? 1;
		const category = value(form, 'category') || 'general';
		const priority = value(form, 'priority') || 'normal';
		if (
			!title ||
			!propertyId ||
			!nextDueOn ||
			!maintenanceCategories.includes(category) ||
			!planFrequencies.includes(frequencyUnit) ||
			!maintenancePriorities.includes(priority) ||
			intervalCount < 1
		)
			return fail(400, {
				message: 'Enter a title, property, schedule, category, and valid frequency.'
			});
		const { error: insertError } = await locals.supabase.from('maintenance_plans').insert({
			organization_id: params.id,
			property_id: propertyId,
			space_id: value(form, 'space_id') || null,
			vendor_id: value(form, 'vendor_id') || null,
			title,
			description: value(form, 'description') || null,
			category,
			frequency_unit: frequencyUnit,
			interval_count: intervalCount,
			next_due_on: nextDueOn,
			priority,
			estimated_cost: numberOrNull(form.get('estimated_cost')),
			created_by: access.user.id
		});
		if (insertError) return fail(400, { message: insertError.message });
		return { success: true, message: 'Preventive maintenance plan created.' };
	},
	generatePreventiveWork: async ({ request, locals, params }) => {
		const access = await getMaintenanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Maintenance or manager access is required.' });
		const form = await request.formData();
		const planId = value(form, 'plan_id');
		const today = new Date().toISOString().slice(0, 10);
		let planQuery = locals.supabase
			.from('maintenance_plans')
			.select(
				'id, property_id, space_id, vendor_id, title, description, category, frequency_unit, interval_count, next_due_on, priority, estimated_cost'
			)
			.eq('organization_id', params.id)
			.eq('active', true)
			.lte('next_due_on', today)
			.order('next_due_on')
			.limit(25);
		if (planId) planQuery = planQuery.eq('id', planId);
		const { data: plans, error: plansError } = await planQuery;
		if (plansError) return fail(400, { message: plansError.message });
		let generated = 0;
		for (const plan of plans ?? []) {
			const { data: existingRun } = await locals.supabase
				.from('maintenance_plan_runs')
				.select('id')
				.eq('organization_id', params.id)
				.eq('plan_id', plan.id)
				.eq('scheduled_for', plan.next_due_on)
				.maybeSingle();
			if (existingRun) continue;
			const generatedRequest = await locals.supabase
				.from('maintenance_requests')
				.insert({
					organization_id: params.id,
					property_id: plan.property_id,
					space_id: plan.space_id,
					vendor_id: plan.vendor_id,
					title: plan.title,
					description: plan.description,
					category: plan.category,
					source: 'preventive',
					priority: plan.priority,
					reported_at: new Date().toISOString(),
					scheduled_for: plan.next_due_on,
					estimated_cost: plan.estimated_cost
				})
				.select('id')
				.single();
			if (generatedRequest.error || !generatedRequest.data) continue;
			await locals.supabase.from('maintenance_plan_runs').insert({
				organization_id: params.id,
				plan_id: plan.id,
				request_id: generatedRequest.data.id,
				scheduled_for: plan.next_due_on
			});
			await locals.supabase
				.from('maintenance_plans')
				.update({
					last_run_on: plan.next_due_on,
					next_due_on: addPlanInterval(plan.next_due_on, plan.frequency_unit, plan.interval_count)
				})
				.eq('id', plan.id)
				.eq('organization_id', params.id);
			generated += 1;
		}
		return {
			success: true,
			message: generated
				? `${generated} preventive work order${generated === 1 ? '' : 's'} generated.`
				: 'No preventive plans are due yet.'
		};
	},
	runMaintenanceSlaCheck: async ({ locals, params }) => {
		const access = await getMaintenanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Maintenance or manager access is required.' });
		const now = new Date();
		const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
		const { data: requests, error: requestsError } = await locals.supabase
			.from('maintenance_requests')
			.select('id, sla_due_at, status')
			.eq('organization_id', params.id)
			.not('sla_due_at', 'is', null)
			.not('status', 'in', '(completed,closed)');
		if (requestsError) return fail(400, { message: requestsError.message });
		let reminders = 0;
		for (const maintenanceRequest of requests ?? []) {
			const dueAt = new Date(maintenanceRequest.sla_due_at);
			const reminderType = dueAt <= now ? 'overdue' : dueAt <= soon ? 'due_soon' : null;
			if (!reminderType) continue;
			const { error: reminderError } = await locals.supabase
				.from('maintenance_sla_reminders')
				.upsert(
					{
						organization_id: params.id,
						request_id: maintenanceRequest.id,
						reminder_type: reminderType,
						due_at: maintenanceRequest.sla_due_at
					},
					{ onConflict: 'request_id,reminder_type' }
				);
			if (!reminderError) reminders += 1;
		}
		return {
			success: true,
			message: reminders
				? `${reminders} SLA reminder${reminders === 1 ? '' : 's'} refreshed.`
				: 'No SLA reminders are due in the next 24 hours.'
		};
	},
	acknowledgeMaintenanceReminder: async ({ request, locals, params }) => {
		const access = await getMaintenanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Maintenance or manager access is required.' });
		const reminderId = value(await request.formData(), 'reminder_id');
		const { error: updateError } = await locals.supabase
			.from('maintenance_sla_reminders')
			.update({ acknowledged_at: new Date().toISOString() })
			.eq('id', reminderId)
			.eq('organization_id', params.id);
		if (updateError) return fail(400, { message: updateError.message });
		return { success: true, message: 'SLA reminder acknowledged.' };
	},
	generateInvoice: async ({ request, locals, params }) => {
		const access = await getFinanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Finance or manager access is required.' });
		const chargeId = value(await request.formData(), 'charge_id');
		const { data: charge } = await locals.supabase
			.from('charges')
			.select('id, tenancy_id, description, amount, due_on')
			.eq('id', chargeId)
			.eq('organization_id', params.id)
			.maybeSingle();
		if (!charge) return fail(404, { message: 'Charge not found.' });
		const { data: existingInvoice } = await locals.supabase
			.from('billing_documents')
			.select('document_number')
			.eq('organization_id', params.id)
			.eq('document_type', 'invoice')
			.eq('charge_id', charge.id)
			.limit(1)
			.maybeSingle();
		if (existingInvoice)
			return {
				success: true,
				message: `Invoice ${existingInvoice.document_number} already exists for this charge.`
			};
		const [{ data: tenancy }, { data: setting }] = await Promise.all([
			locals.supabase
				.from('tenancies')
				.select('id, space_id')
				.eq('id', charge.tenancy_id)
				.maybeSingle(),
			locals.supabase
				.from('organization_workspace_settings')
				.select('invoice_prefix, send_invoice_notifications')
				.eq('organization_id', params.id)
				.maybeSingle()
		]);
		const { data: party } = await locals.supabase
			.from('tenancy_parties')
			.select('person_id, people(id, email)')
			.eq('tenancy_id', charge.tenancy_id)
			.eq('role', 'primary')
			.maybeSingle();
		const person = Array.isArray(party?.people) ? party?.people[0] : party?.people;
		const year = new Date().getFullYear();
		const { error: documentError } = await locals.supabase.from('billing_documents').insert({
			organization_id: params.id,
			document_type: 'invoice',
			document_number: newDocumentNumber(setting?.invoice_prefix ?? 'INV', year),
			tenancy_id: tenancy?.id ?? charge.tenancy_id,
			person_id: person?.id ?? null,
			charge_id: charge.id,
			issue_date: new Date().toISOString().slice(0, 10),
			due_date: charge.due_on,
			currency_code: access.organization.currency_code,
			subtotal: charge.amount,
			total_amount: charge.amount,
			line_items: [{ description: charge.description, quantity: 1, amount: charge.amount }],
			created_by: access.user.id
		});
		if (documentError) return fail(400, { message: documentError.message });
		if (setting?.send_invoice_notifications !== false && person?.email) {
			await locals.supabase.from('notification_outbox').insert({
				organization_id: params.id,
				recipient_address: person.email,
				channel: 'email',
				event_type: 'invoice_issued',
				payload: { charge_id: charge.id, amount: charge.amount },
				idempotency_key: `invoice:${charge.id}`
			});
		}
		return { success: true, message: 'Invoice generated and queued for delivery.' };
	},
	generateReceipt: async ({ request, locals, params }) => {
		const access = await getFinanceAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Finance or manager access is required.' });
		const paymentId = value(await request.formData(), 'payment_id');
		const { data: payment } = await locals.supabase
			.from('payments')
			.select('id, tenancy_id, payer_person_id, amount, payment_date, reference')
			.eq('id', paymentId)
			.eq('organization_id', params.id)
			.maybeSingle();
		if (!payment) return fail(404, { message: 'Payment not found.' });
		const [{ data: setting }, { data: person }] = await Promise.all([
			locals.supabase
				.from('organization_workspace_settings')
				.select('receipt_prefix, send_payment_receipts')
				.eq('organization_id', params.id)
				.maybeSingle(),
			payment.payer_person_id
				? locals.supabase
						.from('people')
						.select('id, email')
						.eq('id', payment.payer_person_id)
						.maybeSingle()
				: Promise.resolve({ data: null })
		]);
		const year = new Date().getFullYear();
		const { error: documentError } = await locals.supabase.from('billing_documents').insert({
			organization_id: params.id,
			document_type: 'receipt',
			document_number: newDocumentNumber(setting?.receipt_prefix ?? 'RCT', year),
			tenancy_id: payment.tenancy_id,
			person_id: person?.id ?? null,
			payment_id: payment.id,
			issue_date: payment.payment_date,
			status: 'paid',
			currency_code: access.organization.currency_code,
			subtotal: payment.amount,
			total_amount: payment.amount,
			line_items: [
				{ description: payment.reference || 'Rental payment', quantity: 1, amount: payment.amount }
			],
			created_by: access.user.id
		});
		if (documentError) return fail(400, { message: documentError.message });
		if (setting?.send_payment_receipts !== false && person?.email) {
			await locals.supabase.from('notification_outbox').insert({
				organization_id: params.id,
				recipient_address: person.email,
				channel: 'email',
				event_type: 'payment_receipt_issued',
				payload: { payment_id: payment.id, amount: payment.amount },
				idempotency_key: `receipt:${payment.id}`
			});
		}
		return { success: true, message: 'Receipt generated and queued for delivery.' };
	},
	updateSettings: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const name = value(form, 'name');
		const currencyCode = value(form, 'currency_code');
		const logoFile = form.get('logo');
		if (!name || !['USD', 'ZIG'].includes(currencyCode))
			return fail(400, { message: 'Enter a workspace name and choose USD or ZiG.' });
		let logoPath: string | undefined;
		if (logoFile instanceof File && logoFile.size > 0) {
			if (logoFile.size > 5 * 1024 * 1024)
				return fail(400, { message: 'Organization logos must be 5 MB or smaller.' });
			if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(logoFile.type))
				return fail(400, { message: 'Use a JPG, PNG, WebP, or SVG logo.' });
			logoPath = `${params.id}/logo-${randomUUID()}-${safeFileName(logoFile.name)}`;
			const upload = await locals.supabase.storage
				.from('organization-assets')
				.upload(logoPath, logoFile, { contentType: logoFile.type, upsert: false });
			if (upload.error) return fail(400, { message: upload.error.message });
		}
		const { error: updateError } = await locals.supabase
			.from('organizations')
			.update({
				name,
				currency_code: currencyCode,
				timezone: value(form, 'timezone') || 'Africa/Harare'
			})
			.eq('id', params.id);
		if (updateError) return fail(400, { message: updateError.message });
		const { error: preferencesError } = await locals.supabase
			.from('organization_workspace_settings')
			.upsert(
				{
					organization_id: params.id,
					legal_name: value(form, 'legal_name') || null,
					contact_email: value(form, 'contact_email') || null,
					contact_phone: value(form, 'contact_phone') || null,
					address_line_1: value(form, 'address_line_1') || null,
					city: value(form, 'city') || null,
					country: value(form, 'country') || null,
					receipt_footer: value(form, 'receipt_footer') || null,
					invoice_prefix: value(form, 'invoice_prefix').toUpperCase() || 'INV',
					receipt_prefix: value(form, 'receipt_prefix').toUpperCase() || 'RCT',
					payment_terms: value(form, 'payment_terms') || null,
					...(logoPath
						? {
								logo_path: logoPath,
								logo_mime_type: logoFile instanceof File ? logoFile.type : null,
								logo_file_size: logoFile instanceof File ? logoFile.size : null
							}
						: {}),
					updated_by: access.user.id
				},
				{ onConflict: 'organization_id' }
			);
		if (preferencesError) return fail(400, { message: preferencesError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'workspace_profile_updated',
			entityType: 'organization'
		});
		return { success: true, message: 'Workspace profile saved.' };
	},
	updateCollectionDefaults: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const dueDay = numberOrNull(form.get('default_rent_due_day'));
		const graceDays = numberOrNull(form.get('grace_period_days')) ?? 0;
		const lateFee = numberOrNull(form.get('late_fee_amount')) ?? 0;
		const invoiceLeadDays = numberOrNull(form.get('default_invoice_lead_days')) ?? 7;
		const noticePeriodDays = numberOrNull(form.get('default_notice_period_days')) ?? 30;
		if (
			(dueDay !== null && (dueDay < 1 || dueDay > 31)) ||
			graceDays < 0 ||
			lateFee < 0 ||
			invoiceLeadDays < 0 ||
			invoiceLeadDays > 90 ||
			noticePeriodDays < 0 ||
			noticePeriodDays > 365
		)
			return fail(400, { message: 'Check the collection defaults and try again.' });
		const { error: updateError } = await locals.supabase
			.from('organization_workspace_settings')
			.upsert(
				{
					organization_id: params.id,
					default_rent_due_day: dueDay,
					grace_period_days: graceDays,
					late_fee_amount: lateFee,
					auto_generate_rent_invoices: form.has('auto_generate_rent_invoices'),
					default_invoice_lead_days: invoiceLeadDays,
					default_notice_period_days: noticePeriodDays,
					payment_reference_prefix: value(form, 'payment_reference_prefix') || null,
					payment_instructions: value(form, 'payment_instructions') || null,
					updated_by: access.user.id
				},
				{ onConflict: 'organization_id' }
			);
		if (updateError) return fail(400, { message: updateError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'collection_defaults_updated',
			entityType: 'organization_workspace_settings'
		});
		return { success: true, message: 'Collection defaults saved.' };
	},
	updateNotifications: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const { error: updateError } = await locals.supabase
			.from('organization_workspace_settings')
			.upsert(
				{
					organization_id: params.id,
					send_rent_reminders: form.has('send_rent_reminders'),
					send_maintenance_updates: form.has('send_maintenance_updates'),
					send_lease_expiry_alerts: form.has('send_lease_expiry_alerts'),
					send_invoice_notifications: form.has('send_invoice_notifications'),
					send_payment_receipts: form.has('send_payment_receipts'),
					updated_by: access.user.id
				},
				{ onConflict: 'organization_id' }
			);
		if (updateError) return fail(400, { message: updateError.message });
		return { success: true, message: 'Notification preferences saved.' };
	},
	inviteWorkspaceMember: async ({ request, locals, params, url }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		if (!env.SUPABASE_SERVICE_ROLE_KEY)
			return fail(500, { message: 'Invitation credentials are not configured.' });
		const form = await request.formData();
		const email = value(form, 'email').toLowerCase();
		const role = value(form, 'role') || 'viewer';
		if (!email.includes('@') || !workspaceRoles.includes(role))
			return fail(400, { message: 'Enter a valid email and team role.' });
		const adminClient = createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
			auth: { autoRefreshToken: false, persistSession: false }
		});
		const users = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
		const existingUser = users.data?.users.find((user) => user.email?.toLowerCase() === email);
		let userId = existingUser?.id;
		if (!userId) {
			const invite = await adminClient.auth.admin.inviteUserByEmail(email, {
				redirectTo: new URL('/login', url).toString(),
				data: { organization_id: params.id, organization_role: role }
			});
			if (invite.error || !invite.data.user)
				return fail(502, { message: invite.error?.message ?? 'The invitation could not be sent.' });
			userId = invite.data.user.id;
		}
		const { error: memberError } = await adminClient
			.from('organization_members')
			.upsert(
				{ organization_id: params.id, user_id: userId, role },
				{ onConflict: 'organization_id,user_id' }
			);
		if (memberError) return fail(400, { message: memberError.message });
		await adminClient.from('organization_invitations').insert({
			organization_id: params.id,
			user_id: userId,
			email,
			role,
			status: existingUser ? 'accepted' : 'sent',
			invited_by: access.user.id
		});
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'workspace_member_invited',
			entityType: 'organization_member',
			entityId: userId,
			metadata: { email, role }
		});
		return {
			success: true,
			message: existingUser
				? `${email} was added to this workspace.`
				: `Invitation sent to ${email}.`
		};
	},
	updateWorkspaceMemberRole: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const form = await request.formData();
		const userId = value(form, 'user_id');
		const role = value(form, 'role');
		if (!userId || !workspaceRoles.includes(role))
			return fail(400, { message: 'Choose a valid team role.' });
		const { data: member } = await locals.supabase
			.from('organization_members')
			.select('role')
			.eq('organization_id', params.id)
			.eq('user_id', userId)
			.maybeSingle();
		if (!member) return fail(404, { message: 'Team member not found.' });
		if (member.role === 'owner')
			return fail(400, {
				message: 'The workspace owner role is managed by the platform administrator.'
			});
		const { error: updateError } = await locals.supabase
			.from('organization_members')
			.update({ role })
			.eq('organization_id', params.id)
			.eq('user_id', userId);
		if (updateError) return fail(400, { message: updateError.message });
		return { success: true, message: 'Team role updated.' };
	},
	removeWorkspaceMember: async ({ request, locals, params }) => {
		const access = await getManagedAccess(locals, params.id);
		if (!access) return fail(403, { message: 'Workspace manager access is required.' });
		const userId = value(await request.formData(), 'user_id');
		if (!userId || userId === access.user.id)
			return fail(400, { message: 'You cannot remove your own workspace access.' });
		const { data: member } = await locals.supabase
			.from('organization_members')
			.select('role')
			.eq('organization_id', params.id)
			.eq('user_id', userId)
			.maybeSingle();
		if (!member) return fail(404, { message: 'Team member not found.' });
		if (member.role === 'owner')
			return fail(400, { message: 'The workspace owner cannot be removed here.' });
		const { error: deleteError } = await locals.supabase
			.from('organization_members')
			.delete()
			.eq('organization_id', params.id)
			.eq('user_id', userId);
		if (deleteError) return fail(400, { message: deleteError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'workspace_member_removed',
			entityType: 'organization_member',
			entityId: userId
		});
		return { success: true, message: 'Workspace access removed.' };
	}
};
