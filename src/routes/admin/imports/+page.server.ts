import { getPlatformMember, writeAuditLog } from '$lib/server/platform';
import { fail, redirect } from '@sveltejs/kit';

const allowedEntities = [
	'properties',
	'spaces',
	'people',
	'tenancies',
	'charges',
	'payments'
] as const;
type ImportEntity = (typeof allowedEntities)[number];
const csvRows = (input: string) => {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let quoted = false;
	for (let index = 0; index < input.length; index += 1) {
		const character = input[index];
		const next = input[index + 1];
		if (character === '"' && quoted && next === '"') {
			cell += '"';
			index += 1;
		} else if (character === '"') quoted = !quoted;
		else if (character === ',' && !quoted) {
			row.push(cell.trim());
			cell = '';
		} else if ((character === '\n' || character === '\r') && !quoted) {
			if (character === '\r' && next === '\n') index += 1;
			row.push(cell.trim());
			if (row.some(Boolean)) rows.push(row);
			row = [];
			cell = '';
		} else cell += character;
	}
	if (cell || row.length) {
		row.push(cell.trim());
		if (row.some(Boolean)) rows.push(row);
	}
	return rows;
};
const requiredFields: Record<ImportEntity, string[]> = {
	properties: ['name'],
	spaces: ['property', 'name'],
	people: ['first_name', 'last_name'],
	tenancies: ['space_id', 'start_date', 'rent_amount'],
	charges: ['tenancy_id', 'description', 'amount', 'due_on'],
	payments: ['amount', 'payment_date']
};
const normalize = (headers: string[], row: string[]) =>
	Object.fromEntries(
		headers.map((header, index) => [header.trim().toLowerCase(), row[index]?.trim() ?? ''])
	);
const validateRow = (entity: ImportEntity, raw: Record<string, string>) => {
	const errors = requiredFields[entity]
		.filter((field) => !raw[field])
		.map((field) => `${field} is required`);
	if (['rent_amount', 'amount'].some((field) => raw[field] && !Number.isFinite(Number(raw[field]))))
		errors.push('amount fields must be numeric');
	if (raw.latitude && !Number.isFinite(Number(raw.latitude)))
		errors.push('latitude must be numeric');
	if (raw.longitude && !Number.isFinite(Number(raw.longitude)))
		errors.push('longitude must be numeric');
	return errors;
};

export const load = async ({ locals }) => {
	const access = await getPlatformMember(locals);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		return { access: 'denied' as const, jobs: [], organizations: [] };
	}
	const [{ data: jobs }, { data: organizations }] = await Promise.all([
		locals.supabase
			.from('import_jobs')
			.select(
				'id, organization_id, entity_type, source_name, status, total_rows, processed_rows, failed_rows, error_summary, created_at, completed_at, organizations(name)'
			)
			.order('created_at', { ascending: false })
			.limit(50),
		locals.supabase.from('organizations').select('id, name, status').order('name')
	]);
	return {
		access: 'granted' as const,
		member: access.member,
		jobs: jobs ?? [],
		organizations: organizations ?? []
	};
};

export const actions = {
	uploadCsv: async ({ request, locals }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Implementation access is required.' });
		const form = await request.formData();
		const organizationId = String(form.get('organization_id') ?? '');
		const entityType = String(form.get('entity_type') ?? '') as ImportEntity;
		const file = form.get('file');
		if (
			!organizationId ||
			!allowedEntities.includes(entityType) ||
			!(file instanceof File) ||
			file.size === 0
		)
			return fail(400, { message: 'Choose an organization, data type, and CSV file.' });
		if (file.size > 5 * 1024 * 1024)
			return fail(400, { message: 'CSV files must be 5 MB or smaller.' });
		const rows = csvRows(await file.text());
		if (rows.length < 2)
			return fail(400, { message: 'The CSV needs a header row and at least one data row.' });
		const headers = rows[0].map((header) => header.trim().toLowerCase());
		const missingHeaders = requiredFields[entityType].filter((field) => !headers.includes(field));
		if (missingHeaders.length)
			return fail(400, { message: `Missing required columns: ${missingHeaders.join(', ')}.` });
		const dataRows = rows.slice(1).slice(0, 1000);
		const prepared = dataRows.map((row, index) => {
			const raw = normalize(headers, row);
			const errors = validateRow(entityType, raw);
			return {
				row_number: index + 2,
				raw_data: raw,
				normalized_data: raw,
				status: errors.length ? 'invalid' : 'valid',
				errors
			};
		});
		const { data: job, error: jobError } = await locals.supabase
			.from('import_jobs')
			.insert({
				organization_id: organizationId,
				created_by: access.user.id,
				entity_type: entityType,
				source_name: file.name,
				status: 'processing',
				total_rows: prepared.length
			})
			.select('id')
			.single();
		if (jobError || !job)
			return fail(400, { message: jobError?.message ?? 'Import job could not be created.' });
		await locals.supabase.storage
			.from('imports')
			.upload(`${organizationId}/${job.id}-${file.name}`, file, {
				contentType: 'text/csv',
				upsert: false
			});
		const { error: rowsError } = await locals.supabase
			.from('import_rows')
			.insert(prepared.map((row) => ({ ...row, import_job_id: job.id })));
		if (rowsError) {
			await locals.supabase
				.from('import_jobs')
				.update({ status: 'failed', error_summary: rowsError.message })
				.eq('id', job.id);
			return fail(400, { message: rowsError.message });
		}
		const invalid = prepared.filter((row) => row.status === 'invalid').length;
		await locals.supabase
			.from('import_jobs')
			.update({
				status: invalid ? 'completed_with_errors' : 'validated',
				failed_rows: invalid,
				error_summary: invalid ? `${invalid} row(s) need correction.` : null
			})
			.eq('id', job.id);
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId,
			action: 'import_csv_validated',
			entityType: 'import_job',
			entityId: job.id,
			metadata: { entity_type: entityType, total_rows: prepared.length, invalid_rows: invalid }
		});
		return {
			success: true,
			message: invalid
				? `CSV validated with ${invalid} row error(s).`
				: `CSV validated: ${prepared.length} row(s) ready to apply.`
		};
	},
	applyImport: async ({ request, locals }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Implementation access is required.' });
		const jobId = String((await request.formData()).get('job_id') ?? '');
		const { data: job } = await locals.supabase
			.from('import_jobs')
			.select('id, organization_id, entity_type, status')
			.eq('id', jobId)
			.maybeSingle();
		if (!job || !['validated', 'completed_with_errors'].includes(job.status))
			return fail(400, { message: 'Only validated imports can be applied.' });
		const { data: rows } = await locals.supabase
			.from('import_rows')
			.select('id, row_number, normalized_data, status, errors')
			.eq('import_job_id', job.id)
			.eq('status', 'valid')
			.order('row_number');
		await locals.supabase.from('import_jobs').update({ status: 'applying' }).eq('id', job.id);
		let processed = 0;
		let failed = Number(job.status === 'completed_with_errors' ? 0 : 0);
		for (const row of rows ?? []) {
			const raw = (row.normalized_data ?? {}) as Record<string, string>;
			let payload: Record<string, unknown> | null = null;
			if (job.entity_type === 'properties')
				payload = {
					organization_id: job.organization_id,
					name: raw.name,
					code: raw.code || null,
					address_line_1: raw.address_line_1 || null,
					city: raw.city || null,
					country: raw.country || null,
					postal_code: raw.postal_code || null,
					latitude: raw.latitude ? Number(raw.latitude) : null,
					longitude: raw.longitude ? Number(raw.longitude) : null
				};
			if (job.entity_type === 'people')
				payload = {
					organization_id: job.organization_id,
					person_type: raw.person_type || 'tenant',
					first_name: raw.first_name,
					last_name: raw.last_name,
					email: raw.email || null,
					phone: raw.phone || null,
					id_number: raw.id_number || null,
					city: raw.city || null,
					country: raw.country || null,
					notes: raw.notes || null
				};
			if (job.entity_type === 'spaces') {
				const { data: property } = await locals.supabase
					.from('properties')
					.select('id')
					.eq('organization_id', job.organization_id)
					.or(`id.eq.${raw.property},code.eq.${raw.property},name.eq.${raw.property}`)
					.maybeSingle();
				if (!property) {
					failed += 1;
					await locals.supabase
						.from('import_rows')
						.update({ status: 'failed', errors: ['property could not be resolved'] })
						.eq('id', row.id);
					continue;
				}
				payload = {
					organization_id: job.organization_id,
					property_id: property.id,
					name: raw.name,
					kind: raw.kind || 'unit',
					code: raw.code || null,
					monthly_rent: raw.monthly_rent ? Number(raw.monthly_rent) : null,
					deposit_amount: raw.deposit_amount ? Number(raw.deposit_amount) : null
				};
			}
			if (job.entity_type === 'charges')
				payload = {
					organization_id: job.organization_id,
					tenancy_id: raw.tenancy_id,
					description: raw.description,
					charge_type: raw.charge_type || 'rent',
					amount: Number(raw.amount),
					due_on: raw.due_on
				};
			if (job.entity_type === 'payments')
				payload = {
					organization_id: job.organization_id,
					tenancy_id: raw.tenancy_id || null,
					amount: Number(raw.amount),
					payment_date: raw.payment_date,
					method: raw.method || 'manual',
					reference: raw.reference || null,
					notes: raw.notes || null
				};
			if (job.entity_type === 'tenancies')
				payload = {
					organization_id: job.organization_id,
					space_id: raw.space_id,
					start_date: raw.start_date,
					end_date: raw.end_date || null,
					rent_amount: Number(raw.rent_amount),
					deposit_amount: raw.deposit_amount ? Number(raw.deposit_amount) : 0,
					billing_frequency: raw.billing_frequency || 'monthly',
					status: raw.status || 'active',
					notes: raw.notes || null
				};
			if (!payload) {
				failed += 1;
				continue;
			}
			const table = job.entity_type;
			const { error: insertError } = await locals.supabase.from(table).insert(payload);
			if (insertError) {
				failed += 1;
				await locals.supabase
					.from('import_rows')
					.update({ status: 'failed', errors: [insertError.message] })
					.eq('id', row.id);
			} else {
				processed += 1;
				await locals.supabase
					.from('import_rows')
					.update({ status: 'applied', errors: [] })
					.eq('id', row.id);
			}
		}
		await locals.supabase
			.from('import_jobs')
			.update({
				status: failed ? 'completed_with_errors' : 'completed',
				processed_rows: processed,
				failed_rows: failed,
				completed_at: new Date().toISOString(),
				error_summary: failed ? `${failed} row(s) failed while applying.` : null
			})
			.eq('id', job.id);
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: job.organization_id,
			action: 'import_csv_applied',
			entityType: 'import_job',
			entityId: job.id,
			metadata: { processed, failed }
		});
		return {
			success: true,
			message: failed
				? `Import applied with ${failed} failed row(s).`
				: `Import applied: ${processed} row(s) created.`
		};
	},
	queueImport: async ({ request, locals }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Implementation access is required.' });
		const form = await request.formData();
		const organizationId = String(form.get('organization_id') ?? '');
		const entityType = String(form.get('entity_type') ?? 'properties');
		const sourceName = String(form.get('source_name') ?? '').trim();
		if (!organizationId || !sourceName)
			return fail(400, { message: 'Choose an organization and name the source file.' });
		const { data: job, error: insertError } = await locals.supabase
			.from('import_jobs')
			.insert({
				organization_id: organizationId,
				created_by: access.user.id,
				entity_type: entityType,
				source_name: sourceName,
				status: 'queued'
			})
			.select('id')
			.single();
		if (insertError || !job)
			return fail(400, { message: insertError?.message ?? 'Import job could not be queued.' });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId,
			action: 'import_job_queued',
			entityType: 'import_job',
			entityId: job.id,
			metadata: { entity_type: entityType, source_name: sourceName }
		});
		return { success: true, message: 'Import job queued for processing.' };
	}
};
