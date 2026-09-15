import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { seedOnboardingTasks, writeAuditLog } from '$lib/server/platform';
import { createClient } from '@supabase/supabase-js';
import { fail } from '@sveltejs/kit';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);

const getPlatformAdmin = async (locals: App.Locals) => {
	const { user } = await locals.safeGetSession();
	if (!user) return null;

	const { data } = await locals.supabase
		.from('platform_members')
		.select('role, display_name')
		.eq('user_id', user.id)
		.eq('role', 'super_admin')
		.maybeSingle();

	return data ? { user, member: data } : null;
};

export const load = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return { access: 'signed_out' as const, organizations: [] };

	const { data: member } = await locals.supabase
		.from('platform_members')
		.select('role, display_name')
		.eq('user_id', user.id)
		.maybeSingle();

	if (!member) return { access: 'denied' as const, organizations: [] };

	const [
		{ data: organizations },
		properties,
		spaces,
		supportTickets,
		alerts,
		recentActivity,
		failedInvitations
	] = await Promise.all([
		locals.supabase
			.from('organizations')
			.select(
				'id, name, slug, status, currency_code, onboarding_template, handoff_at, last_activity_at, created_at'
			)
			.order('created_at', { ascending: false }),
		locals.supabase.from('properties').select('id', { count: 'exact', head: true }),
		locals.supabase.from('spaces').select('id', { count: 'exact', head: true }),
		locals.supabase
			.from('support_tickets')
			.select('id', { count: 'exact', head: true })
			.in('status', ['open', 'in_progress', 'waiting_on_client']),
		locals.supabase
			.from('platform_alerts')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'open'),
		locals.supabase
			.from('audit_logs')
			.select('id, action, entity_type, organization_id, created_at, organizations(name)')
			.order('created_at', { ascending: false })
			.limit(8),
		locals.supabase
			.from('organization_invitations')
			.select('id, organization_id, email, status, last_error, invited_at, organizations(name)')
			.eq('status', 'failed')
			.order('invited_at', { ascending: false })
			.limit(5)
	]);
	const organizationList = organizations ?? [];
	const needingAttention = organizationList.filter(
		(organization) => organization.status === 'onboarding' || organization.status === 'suspended'
	);

	return {
		access: 'granted' as const,
		member,
		organizations: organizationList,
		dashboard: {
			properties: properties.count ?? 0,
			spaces: spaces.count ?? 0,
			openSupport: supportTickets.count ?? 0,
			openAlerts: alerts.count ?? 0,
			recentActivity: recentActivity.data ?? [],
			failedInvitations: failedInvitations.data ?? [],
			needingAttention
		}
	};
};

export const actions = {
	createOrganization: async ({ request, locals }) => {
		const admin = await getPlatformAdmin(locals);
		if (!admin)
			return fail(403, { message: 'Only a platform superadmin can create organizations.' });

		const formData = await request.formData();
		const name = String(formData.get('name') ?? '').trim();
		const requestedSlug = String(formData.get('slug') ?? '').trim();
		const clientEmail = String(formData.get('client_email') ?? '')
			.trim()
			.toLowerCase();
		const currencyCode = String(formData.get('currency_code') ?? 'USD')
			.trim()
			.toUpperCase();
		const timezone = String(formData.get('timezone') ?? 'Africa/Harare').trim();
		const onboardingTemplate = String(formData.get('onboarding_template') ?? 'residential');

		if (!name) return fail(400, { message: 'Organization name is required.' });
		if (!/^[A-Z]{3}$/.test(currencyCode))
			return fail(400, { message: 'Currency must be a three-letter code.' });
		if (clientEmail && !clientEmail.includes('@'))
			return fail(400, { message: 'Enter a valid client administrator email.' });
		if (!['residential', 'commercial', 'student', 'short_stay'].includes(onboardingTemplate))
			return fail(400, { message: 'Choose a valid onboarding template.' });

		const slug = slugify(requestedSlug || name);
		if (!slug) return fail(400, { message: 'Choose a valid organization slug.' });

		const { data: organization, error } = await locals.supabase
			.from('organizations')
			.insert({
				name,
				slug,
				currency_code: currencyCode,
				timezone,
				onboarding_template: onboardingTemplate,
				status: 'onboarding',
				created_by: admin.user.id
			})
			.select('id, name, slug')
			.single();

		if (error || !organization) {
			return fail(400, { message: error?.message ?? 'Organization could not be created.' });
		}
		await seedOnboardingTasks(
			locals,
			organization.id,
			onboardingTemplate as 'residential' | 'commercial' | 'student' | 'short_stay'
		);
		await writeAuditLog(locals, {
			actorUserId: admin.user.id,
			action: 'organization_created',
			entityType: 'organization',
			entityId: organization.id,
			metadata: { name, slug }
		});

		if (!clientEmail) {
			return {
				success: true,
				message: `${organization.name} was created. Invite a client administrator when their email is ready.`
			};
		}

		await locals.supabase.from('organization_invitations').insert({
			organization_id: organization.id,
			email: clientEmail,
			role: 'admin',
			status: 'pending',
			invited_by: admin.user.id
		});

		if (!env.SUPABASE_SERVICE_ROLE_KEY) {
			return fail(500, {
				message: `${organization.name} was created, but server invitation credentials are not configured.`
			});
		}

		const adminClient = createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
			auth: { autoRefreshToken: false, persistSession: false }
		});
		const { data: invitation, error: invitationError } =
			await adminClient.auth.admin.inviteUserByEmail(clientEmail, {
				data: { organization_id: organization.id, organization_name: organization.name }
			});

		if (invitationError || !invitation.user) {
			await locals.supabase
				.from('organization_invitations')
				.update({ status: 'failed', last_error: invitationError?.message ?? 'Unknown error.' })
				.eq('organization_id', organization.id)
				.eq('email', clientEmail)
				.eq('status', 'pending');
			await locals.supabase.from('platform_alerts').insert({
				organization_id: organization.id,
				alert_type: 'invitation_failed',
				severity: 'warning',
				status: 'open',
				title: 'Client invitation failed',
				detail: invitationError?.message ?? 'Unknown invitation error.',
				metadata: { email: clientEmail }
			});
			return fail(502, {
				message: `${organization.name} was created, but the client invitation failed: ${invitationError?.message ?? 'Unknown error.'}`
			});
		}
		await locals.supabase
			.from('organization_invitations')
			.update({ status: 'sent' })
			.eq('organization_id', organization.id)
			.eq('email', clientEmail)
			.eq('status', 'pending');

		const { error: membershipError } = await adminClient.from('organization_members').insert({
			organization_id: organization.id,
			user_id: invitation.user.id,
			role: 'admin'
		});

		if (membershipError) {
			return fail(502, {
				message: `${organization.name} was created and the invitation was sent, but client access could not be assigned: ${membershipError.message}`
			});
		}
		await writeAuditLog(locals, {
			actorUserId: admin.user.id,
			organizationId: organization.id,
			action: 'client_admin_invited',
			entityType: 'organization_member',
			metadata: { email: clientEmail, role: 'admin' }
		});

		return {
			success: true,
			message: `${organization.name} was created and an administrator invitation was sent to ${clientEmail}.`
		};
	}
};
