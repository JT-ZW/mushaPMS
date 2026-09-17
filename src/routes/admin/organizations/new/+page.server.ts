import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { getPlatformMember, writeAuditLog } from '$lib/server/platform';
import { createClient } from '@supabase/supabase-js';
import { fail, redirect } from '@sveltejs/kit';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);

const moduleKeys = ['residential', 'commercial', 'student', 'short_stay'] as const;
type ModuleKey = (typeof moduleKeys)[number];

export const load = async ({ locals }) => {
	const access = await getPlatformMember(locals, ['super_admin']);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		return { access: 'denied' as const };
	}
	return { access: 'granted' as const };
};

export const actions = {
	default: async ({ request, locals }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access)
			return fail(403, { message: 'Only a platform superadmin can create organizations.' });

		const values = await request.formData();
		const name = String(values.get('name') ?? '').trim();
		const slug = slugify(String(values.get('slug') ?? '').trim() || name);
		const clientEmail = String(values.get('client_email') ?? '')
			.trim()
			.toLowerCase();
		const currencyCode = String(values.get('currency_code') ?? 'USD')
			.trim()
			.toUpperCase();
		const timezone = String(values.get('timezone') ?? 'Africa/Harare').trim();
		const accessMode = String(values.get('access_mode') ?? 'later');
		const temporaryPassword = String(values.get('temporary_password') ?? '');
		const selectedModules = [
			...new Set(
				values
					.getAll('modules')
					.map((value) => String(value))
					.filter((value): value is ModuleKey => moduleKeys.includes(value as ModuleKey))
			)
		];
		const onboardingTemplate = selectedModules[0] ?? 'residential';

		if (!name || !slug) return fail(400, { message: 'Organization name is required.' });
		if (!/^[A-Z]{3}$/.test(currencyCode) || !['USD', 'ZIG'].includes(currencyCode))
			return fail(400, { message: 'Choose USD or ZIG as the organization currency.' });
		if (clientEmail && !clientEmail.includes('@'))
			return fail(400, { message: 'Enter a valid client administrator email.' });
		if (selectedModules.length === 0)
			return fail(400, { message: 'Allocate at least one product module to this organization.' });
		if (!['invite', 'create', 'later'].includes(accessMode))
			return fail(400, { message: 'Choose how client access should be provisioned.' });
		if (accessMode !== 'later' && (!clientEmail || !clientEmail.includes('@')))
			return fail(400, {
				message: 'A client administrator email is required for access provisioning.'
			});
		if (accessMode === 'create' && temporaryPassword.length < 8)
			return fail(400, { message: 'Temporary passwords must contain at least 8 characters.' });
		if (clientEmail && accessMode !== 'later' && !env.SUPABASE_SERVICE_ROLE_KEY)
			return fail(500, {
				message: 'Supabase service credentials are not configured for client access provisioning.'
			});

		const { data: organization, error } = await locals.supabase
			.from('organizations')
			.insert({
				name,
				slug,
				currency_code: currencyCode,
				timezone,
				onboarding_template: onboardingTemplate,
				status: 'onboarding',
				created_by: access.user.id
			})
			.select('id')
			.single();
		if (error || !organization)
			return fail(400, { message: error?.message ?? 'Organization could not be created.' });

		const { error: modulesError } = await locals.supabase.from('organization_modules').insert(
			selectedModules.map((moduleKey) => ({
				organization_id: organization.id,
				module_key: moduleKey,
				assigned_by: access.user.id
			}))
		);
		if (modulesError) {
			await locals.supabase.from('organizations').delete().eq('id', organization.id);
			return fail(400, {
				message: `Product modules could not be allocated: ${modulesError.message}`
			});
		}

		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			action: 'organization_created',
			entityType: 'organization',
			entityId: organization.id,
			metadata: { name, slug, modules: selectedModules, access_mode: accessMode }
		});

		if (clientEmail && accessMode !== 'later') {
			await locals.supabase.from('organization_invitations').insert({
				organization_id: organization.id,
				email: clientEmail,
				role: 'admin',
				status: 'pending',
				invited_by: access.user.id
			});
		}

		if (clientEmail && accessMode !== 'later' && env.SUPABASE_SERVICE_ROLE_KEY) {
			const adminClient = createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
				auth: { autoRefreshToken: false, persistSession: false }
			});
			const accessResult =
				accessMode === 'create'
					? await adminClient.auth.admin.createUser({
							email: clientEmail,
							password: temporaryPassword,
							email_confirm: true,
							user_metadata: {
								organization_id: organization.id,
								organization_name: name,
								must_change_password: true,
								password_provisioned_at: new Date().toISOString()
							}
						})
					: await adminClient.auth.admin.inviteUserByEmail(clientEmail, {
							data: { organization_id: organization.id, organization_name: name }
						});
			const provisionedUser = accessResult.data.user;
			if (accessResult.error || !provisionedUser) {
				await locals.supabase
					.from('organization_invitations')
					.update({ status: 'failed', last_error: accessResult.error?.message ?? 'Unknown error.' })
					.eq('organization_id', organization.id)
					.eq('email', clientEmail)
					.eq('status', 'pending');
				await locals.supabase.from('platform_alerts').insert({
					organization_id: organization.id,
					alert_type: 'invitation_failed',
					severity: 'warning',
					status: 'open',
					title: 'Client access provisioning failed',
					detail: accessResult.error?.message ?? 'Unknown error.',
					metadata: { email: clientEmail, access_mode: accessMode }
				});
				return fail(502, {
					message: `Organization created, but client access failed: ${accessResult.error?.message ?? 'Unknown error.'}`
				});
			}

			const { error: membershipError } = await adminClient
				.from('organization_members')
				.insert({ organization_id: organization.id, user_id: provisionedUser.id, role: 'admin' });
			if (membershipError) {
				await adminClient.auth.admin.deleteUser(provisionedUser.id);
				return fail(502, {
					message: `Client account was created, but organization access could not be assigned: ${membershipError.message}`
				});
			}
			await locals.supabase
				.from('organization_invitations')
				.update({
					status: accessMode === 'create' ? 'accepted' : 'sent',
					user_id: provisionedUser.id,
					accepted_at: accessMode === 'create' ? new Date().toISOString() : null
				})
				.eq('organization_id', organization.id)
				.eq('email', clientEmail)
				.eq('status', 'pending');
			await writeAuditLog(locals, {
				actorUserId: access.user.id,
				organizationId: organization.id,
				action: accessMode === 'create' ? 'client_admin_created' : 'client_admin_invited',
				entityType: 'organization_member',
				metadata: { email: clientEmail, role: 'admin', access_mode: accessMode }
			});
		}

		throw redirect(303, `/admin/organizations/${organization.id}?created=1`);
	}
};
