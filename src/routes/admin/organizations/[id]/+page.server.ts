import { env } from '$env/dynamic/private';
import { getPlatformMember, writeAuditLog } from '$lib/server/platform';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { error, fail, redirect } from '@sveltejs/kit';

const moduleKeys = ['residential', 'commercial', 'student', 'short_stay'] as const;

const getOrganization = async (locals: App.Locals, id: string) => {
	const { data, error: queryError } = await locals.supabase
		.from('organizations')
		.select('*')
		.eq('id', id)
		.maybeSingle();
	if (queryError) throw error(500, queryError.message);
	if (!data) throw error(404, 'Organization not found');
	return data;
};

export const load = async ({ locals, params, url }) => {
	const access = await getPlatformMember(locals);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		return { access: 'denied' as const };
	}

	const organization = await getOrganization(locals, params.id);
	const [
		properties,
		spaces,
		people,
		tenancies,
		maintenance,
		members,
		sessions,
		onboardingTasks,
		invitations,
		tickets,
		subscription,
		modules,
		chargeSchedules,
		importJobs
	] = await Promise.all([
		locals.supabase
			.from('properties')
			.select('id', { count: 'exact', head: true })
			.eq('organization_id', params.id),
		locals.supabase
			.from('spaces')
			.select('id', { count: 'exact', head: true })
			.eq('organization_id', params.id),
		locals.supabase
			.from('people')
			.select('id', { count: 'exact', head: true })
			.eq('organization_id', params.id),
		locals.supabase
			.from('tenancies')
			.select('id', { count: 'exact', head: true })
			.eq('organization_id', params.id),
		locals.supabase
			.from('maintenance_requests')
			.select('id', { count: 'exact', head: true })
			.eq('organization_id', params.id)
			.neq('status', 'closed'),
		locals.supabase
			.from('organization_members')
			.select('user_id, role, created_at')
			.eq('organization_id', params.id),
		locals.supabase
			.from('support_sessions')
			.select('id, access_level, reason, started_at, expires_at, ended_at')
			.eq('organization_id', params.id)
			.order('started_at', { ascending: false })
			.limit(5),
		locals.supabase
			.from('organization_onboarding_tasks')
			.select(
				'id, task_key, title, description, phase, status, assigned_to, completed_at, notes, position'
			)
			.eq('organization_id', params.id)
			.order('position'),
		locals.supabase
			.from('organization_invitations')
			.select('id, email, role, status, invited_at, accepted_at, last_error')
			.eq('organization_id', params.id)
			.order('invited_at', { ascending: false })
			.limit(5),
		locals.supabase
			.from('support_tickets')
			.select('id, subject, priority, status, assigned_to, created_at, updated_at')
			.eq('organization_id', params.id)
			.order('created_at', { ascending: false })
			.limit(5),
		locals.supabase
			.from('organization_subscriptions')
			.select(
				'status, plan_id, trial_ends_on, current_period_ends_on, platform_plans(name, plan_key)'
			)
			.eq('organization_id', params.id)
			.maybeSingle(),
		locals.supabase
			.from('organization_modules')
			.select('module_key, assigned_at')
			.eq('organization_id', params.id)
			.order('module_key'),
		locals.supabase
			.from('charge_schedules')
			.select('id', { count: 'exact', head: true })
			.eq('organization_id', params.id),
		locals.supabase
			.from('import_jobs')
			.select('status')
			.eq('organization_id', params.id)
			.eq('status', 'completed')
			.limit(1)
	]);
	const accessComplete =
		(members.data?.length ?? 0) > 0 ||
		(invitations.data ?? []).some((invitation) => ['sent', 'accepted'].includes(invitation.status));
	const setupSteps = [
		{
			key: 'access',
			title: 'Client access provisioned',
			detail: accessComplete
				? 'An administrator can access this workspace.'
				: 'Create or invite the client administrator.',
			complete: accessComplete
		},
		{
			key: 'properties',
			title: 'Property portfolio added',
			detail: properties.count
				? `${properties.count} property record(s) are ready.`
				: 'Add the client’s first property.',
			complete: (properties.count ?? 0) > 0
		},
		{
			key: 'spaces',
			title: 'Units and spaces configured',
			detail: spaces.count
				? `${spaces.count} rentable space(s) are configured.`
				: 'Add units under each property.',
			complete: (spaces.count ?? 0) > 0
		},
		{
			key: 'rules',
			title: 'Rent and charge rules configured',
			detail:
				chargeSchedules.count || tenancies.count
					? 'Lease and charge data is present.'
					: 'Add lease or charge rules during setup.',
			complete: (chargeSchedules.count ?? 0) > 0 || (tenancies.count ?? 0) > 0
		},
		{
			key: 'people',
			title: 'People and tenant records added',
			detail: people.count
				? `${people.count} person record(s) are present.`
				: 'Add or import client contacts and tenants.',
			complete: (people.count ?? 0) > 0
		},
		{
			key: 'imports',
			title: 'Initial data import completed',
			detail: importJobs.data?.length
				? 'A completed import is recorded.'
				: 'No completed import is recorded.',
			complete: (importJobs.data?.length ?? 0) > 0
		},
		{
			key: 'handoff',
			title: 'Client handoff completed',
			detail: organization.handoff_at
				? `Handed over ${new Date(organization.handoff_at).toLocaleDateString()}.`
				: 'Review the setup and hand over when ready.',
			complete: Boolean(organization.handoff_at)
		}
	];

	return {
		access: 'granted' as const,
		member: access.member,
		organization,
		counts: {
			properties: properties.count ?? 0,
			spaces: spaces.count ?? 0,
			people: people.count ?? 0,
			tenancies: tenancies.count ?? 0,
			maintenance: maintenance.count ?? 0
		},
		members: members.data ?? [],
		sessions: sessions.data ?? [],
		onboardingTasks: onboardingTasks.data ?? [],
		invitations: invitations.data ?? [],
		tickets: tickets.data ?? [],
		subscription: subscription.data ?? null,
		modules: modules.data ?? [],
		setupSteps,
		setupProgress: {
			completed: setupSteps.filter((step) => step.complete).length,
			total: setupSteps.length
		},
		created: url.searchParams.get('created') === '1'
	};
};

export const actions = {
	updateStatus: async ({ request, locals, params }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Only superadmins can change organization status.' });
		const form = await request.formData();
		const status = String(form.get('status') ?? '');
		if (!['onboarding', 'active', 'suspended', 'archived'].includes(status))
			return fail(400, { message: 'Invalid organization status.' });
		const { error: updateError } = await locals.supabase
			.from('organizations')
			.update({ status })
			.eq('id', params.id);
		if (updateError) return fail(400, { message: updateError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'organization_status_changed',
			entityType: 'organization',
			entityId: params.id,
			metadata: { status }
		});
		return { success: true, message: `Organization marked ${status}.` };
	},
	updateNotes: async ({ request, locals, params }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Only superadmins can update support notes.' });
		const form = await request.formData();
		const supportNotes = String(form.get('support_notes') ?? '').trim();
		const { error: updateError } = await locals.supabase
			.from('organizations')
			.update({ support_notes: supportNotes || null })
			.eq('id', params.id);
		if (updateError) return fail(400, { message: updateError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'support_notes_updated',
			entityType: 'organization',
			entityId: params.id
		});
		return { success: true, message: 'Support notes saved.' };
	},
	updateProfile: async ({ request, locals, params }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Only superadmins can update organization details.' });
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const slug = String(form.get('slug') ?? '')
			.trim()
			.toLowerCase();
		const currencyCode = String(form.get('currency_code') ?? '')
			.trim()
			.toUpperCase();
		const timezone = String(form.get('timezone') ?? '').trim();
		if (!name || !slug || !/^[a-z0-9-]+$/.test(slug))
			return fail(400, { message: 'Enter a name and a valid workspace slug.' });
		if (!/^[A-Z]{3}$/.test(currencyCode) || !['USD', 'ZIG'].includes(currencyCode))
			return fail(400, { message: 'Choose USD or ZIG as the organization currency.' });
		const { error: updateError } = await locals.supabase
			.from('organizations')
			.update({ name, slug, currency_code: currencyCode, timezone })
			.eq('id', params.id);
		if (updateError) return fail(400, { message: updateError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'organization_profile_updated',
			entityType: 'organization',
			entityId: params.id,
			metadata: { name, slug, currency_code: currencyCode, timezone }
		});
		return { success: true, message: 'Organization profile updated.' };
	},
	updateModules: async ({ request, locals, params }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Only superadmins can allocate product modules.' });
		const selectedModules = [
			...new Set(
				(await request.formData())
					.getAll('modules')
					.map((value) => String(value))
					.filter((value) => moduleKeys.includes(value as (typeof moduleKeys)[number]))
			)
		];
		if (selectedModules.length === 0)
			return fail(400, { message: 'An organization must have at least one product module.' });
		const { error: upsertError } = await locals.supabase.from('organization_modules').upsert(
			selectedModules.map((moduleKey) => ({
				organization_id: params.id,
				module_key: moduleKey,
				assigned_by: access.user.id,
				assigned_at: new Date().toISOString()
			})),
			{ onConflict: 'organization_id,module_key' }
		);
		if (upsertError) return fail(400, { message: upsertError.message });
		const { error: removeError } = await locals.supabase
			.from('organization_modules')
			.delete()
			.eq('organization_id', params.id)
			.not('module_key', 'in', `(${selectedModules.join(',')})`);
		if (removeError) return fail(400, { message: removeError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'organization_modules_updated',
			entityType: 'organization_modules',
			metadata: { modules: selectedModules }
		});
		return { success: true, message: 'Product modules updated.' };
	},
	updateTask: async ({ request, locals, params }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Implementation access is required.' });
		const form = await request.formData();
		const taskId = String(form.get('task_id') ?? '');
		const status = String(form.get('status') ?? 'pending');
		if (!taskId || !['pending', 'in_progress', 'completed', 'blocked'].includes(status))
			return fail(400, { message: 'Choose a valid onboarding task status.' });
		const completed = status === 'completed';
		const { error: updateError } = await locals.supabase
			.from('organization_onboarding_tasks')
			.update({
				status,
				completed_at: completed ? new Date().toISOString() : null,
				completed_by: completed ? access.user.id : null
			})
			.eq('id', taskId)
			.eq('organization_id', params.id);
		if (updateError) return fail(400, { message: updateError.message });
		if (completed) {
			const { count } = await locals.supabase
				.from('organization_onboarding_tasks')
				.select('id', { count: 'exact', head: true })
				.eq('organization_id', params.id)
				.neq('status', 'completed');
			if ((count ?? 1) === 0)
				await locals.supabase
					.from('organizations')
					.update({ onboarding_completed_at: new Date().toISOString() })
					.eq('id', params.id);
		}
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'onboarding_task_updated',
			entityType: 'onboarding_task',
			entityId: taskId,
			metadata: { status }
		});
		return { success: true, message: 'Onboarding progress updated.' };
	},
	updateMemberRole: async ({ request, locals, params }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Only superadmins can manage client roles.' });
		const form = await request.formData();
		const userId = String(form.get('user_id') ?? '');
		const role = String(form.get('role') ?? 'viewer');
		if (
			!userId ||
			!['owner', 'admin', 'manager', 'finance', 'maintenance', 'viewer'].includes(role)
		)
			return fail(400, { message: 'Choose a valid client role.' });
		const { data: existingMember } = await locals.supabase
			.from('organization_members')
			.select('role')
			.eq('organization_id', params.id)
			.eq('user_id', userId)
			.maybeSingle();
		if (!existingMember) return fail(404, { message: 'Client member was not found.' });
		if (role === 'owner' && existingMember.role !== 'owner') {
			await locals.supabase
				.from('organization_members')
				.update({ role: 'admin' })
				.eq('organization_id', params.id)
				.eq('role', 'owner');
		}
		const { error: updateError } = await locals.supabase
			.from('organization_members')
			.update({ role })
			.eq('organization_id', params.id)
			.eq('user_id', userId);
		if (updateError) return fail(400, { message: updateError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'organization_member_role_changed',
			entityType: 'organization_member',
			metadata: { user_id: userId, role }
		});
		return { success: true, message: 'Client member role updated.' };
	},
	removeMember: async ({ request, locals, params }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Only superadmins can remove client access.' });
		const userId = String((await request.formData()).get('user_id') ?? '');
		const { data: member } = await locals.supabase
			.from('organization_members')
			.select('role')
			.eq('organization_id', params.id)
			.eq('user_id', userId)
			.maybeSingle();
		if (!member) return fail(404, { message: 'Client member was not found.' });
		if (member.role === 'owner')
			return fail(400, { message: 'Transfer ownership before removing the current owner.' });
		const { error: deleteError } = await locals.supabase
			.from('organization_members')
			.delete()
			.eq('organization_id', params.id)
			.eq('user_id', userId);
		if (deleteError) return fail(400, { message: deleteError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'organization_member_removed',
			entityType: 'organization_member',
			metadata: { user_id: userId }
		});
		return { success: true, message: 'Client access removed.' };
	},
	resetClientAccess: async ({ request, locals, params, url }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Only superadmins can reset client access.' });
		const email = String((await request.formData()).get('email') ?? '')
			.trim()
			.toLowerCase();
		if (!email || !email.includes('@'))
			return fail(400, { message: 'Enter a valid client email.' });
		const { error: resetError } = await locals.supabase.auth.resetPasswordForEmail(email, {
			redirectTo: new URL('/reset-password', url).toString()
		});
		if (resetError) return fail(400, { message: 'The access reset email could not be sent.' });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'client_access_reset_requested',
			entityType: 'organization_member',
			metadata: { email }
		});
		return { success: true, message: `A password reset link was sent to ${email}.` };
	},
	resendInvitation: async ({ request, locals, params }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Only superadmins can resend invitations.' });
		if (!env.SUPABASE_SERVICE_ROLE_KEY)
			return fail(500, { message: 'Invitation credentials are not configured.' });
		const email = String((await request.formData()).get('email') ?? '')
			.trim()
			.toLowerCase();
		if (!email || !email.includes('@'))
			return fail(400, { message: 'Enter a valid client email.' });
		const adminClient = createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
			auth: { autoRefreshToken: false, persistSession: false }
		});
		const { error: invitationError } = await adminClient.auth.admin.inviteUserByEmail(email);
		if (invitationError) return fail(502, { message: invitationError.message });
		await locals.supabase
			.from('organization_invitations')
			.update({ status: 'sent', last_error: null })
			.eq('organization_id', params.id)
			.eq('email', email)
			.eq('status', 'failed');
		await locals.supabase
			.from('platform_alerts')
			.update({
				status: 'resolved',
				resolved_at: new Date().toISOString(),
				resolved_by: access.user.id
			})
			.eq('organization_id', params.id)
			.eq('alert_type', 'invitation_failed')
			.eq('status', 'open');
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'client_invitation_resent',
			entityType: 'organization_invitation',
			metadata: { email }
		});
		return { success: true, message: `Invitation resent to ${email}.` };
	},
	markHandoff: async ({ locals, params }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Only superadmins can complete handoff.' });
		const { error: updateError } = await locals.supabase
			.from('organizations')
			.update({ status: 'active', handoff_at: new Date().toISOString() })
			.eq('id', params.id);
		if (updateError) return fail(400, { message: updateError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'organization_handed_off',
			entityType: 'organization',
			entityId: params.id
		});
		return { success: true, message: 'Organization handed over and marked active.' };
	},
	startSupportSession: async ({ request, locals, params }) => {
		const access = await getPlatformMember(locals);
		if (!access) return fail(403, { message: 'Platform access is required.' });
		const form = await request.formData();
		const reason = String(form.get('reason') ?? '').trim();
		const requestedLevel = String(form.get('access_level') ?? 'read_only');
		const accessLevel =
			access.member.role === 'super_admin' && requestedLevel === 'operator'
				? 'operator'
				: 'read_only';
		if (reason.length < 8)
			return fail(400, { message: 'Add a short reason for the support session.' });
		const { error: insertError } = await locals.supabase.from('support_sessions').insert({
			organization_id: params.id,
			started_by: access.user.id,
			access_level: accessLevel,
			reason
		});
		if (insertError) return fail(400, { message: insertError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId: params.id,
			action: 'support_session_started',
			entityType: 'support_session',
			metadata: { access_level: accessLevel, reason }
		});
		return {
			success: true,
			message: `${accessLevel === 'operator' ? 'Operator' : 'Read-only'} support session started.`
		};
	},
	endSupportSession: async ({ request, locals }) => {
		const access = await getPlatformMember(locals);
		if (!access) return fail(403, { message: 'Platform access is required.' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const { error: updateError } = await locals.supabase
			.from('support_sessions')
			.update({ ended_at: new Date().toISOString() })
			.eq('id', id)
			.is('ended_at', null);
		if (updateError) return fail(400, { message: updateError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			action: 'support_session_ended',
			entityType: 'support_session',
			entityId: id
		});
		return { success: true, message: 'Support session ended.' };
	}
};
