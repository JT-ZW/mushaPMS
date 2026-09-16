import { getPlatformMember, writeAuditLog } from '$lib/server/platform';
import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const access = await getPlatformMember(locals);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		return { access: 'denied' as const, organizations: [], profiles: [], notifications: [], imports: [], flags: [], integrations: [], metrics: {} };
	}
	const [organizations, profiles, notifications, imports, tickets, payments, flags, featureAssignments, integrations, team, activity] = await Promise.all([
		locals.supabase.from('organizations').select('id, name, status, onboarding_completed_at, last_activity_at').order('name'),
		locals.supabase.from('organization_success_profiles').select('organization_id, health_status, health_score, next_check_in_on, renewal_due_on, risk_notes'),
		locals.supabase.from('notification_outbox').select('id, organization_id, channel, event_type, status, attempts, last_error, created_at, organizations(name)').order('created_at', { ascending: false }).limit(12),
		locals.supabase.from('import_jobs').select('id, organization_id, entity_type, status, failed_rows, created_at, organizations(name)').order('created_at', { ascending: false }).limit(12),
		locals.supabase.from('support_tickets').select('id, status, priority', { count: 'exact' }).in('status', ['open', 'in_progress', 'waiting_on_client']),
		locals.supabase.from('subscription_payments').select('id, amount, status, currency_code', { count: 'exact' }).eq('status', 'paid'),
		locals.supabase.from('platform_feature_flags').select('id, flag_key, name, description, active, enabled_by_default').order('name'),
		locals.supabase.from('organization_feature_flags').select('organization_id, feature_flag_id, enabled'),
		locals.supabase.from('platform_integrations').select('id, provider_key, display_name, status, detail, updated_at').order('display_name'),
		locals.supabase.from('platform_members').select('user_id, display_name, role').order('display_name'),
		locals.supabase.from('audit_logs').select('id, action, entity_type, created_at, organizations(name)').order('created_at', { ascending: false }).limit(8)
	]);
	const profileRows = profiles.data ?? [];
	const orgRows = organizations.data ?? [];
	return {
		access: 'granted' as const, member: access.member, organizations: orgRows, profiles: profileRows,
		notifications: notifications.data ?? [], imports: imports.data ?? [], flags: flags.data ?? [], featureAssignments: featureAssignments.data ?? [], integrations: integrations.data ?? [], team: team.data ?? [], activity: activity.data ?? [],
		metrics: {
			atRisk: profileRows.filter((profile) => profile.health_status === 'at_risk').length,
			openSupport: tickets.count ?? 0,
			queuedWork: (notifications.data ?? []).filter((item) => ['queued', 'failed'].includes(item.status)).length + (imports.data ?? []).filter((item) => ['queued', 'processing', 'failed', 'completed_with_errors'].includes(item.status)).length,
			activeClients: orgRows.filter((organization) => organization.status === 'active').length,
			paidPayments: payments.count ?? 0
		}
	};
};

export const actions = {
	updateSuccessProfile: async ({ request, locals }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Platform administrator access is required.' });
		const form = await request.formData();
		const organizationId = String(form.get('organization_id') ?? '');
		const healthStatus = String(form.get('health_status') ?? 'healthy');
		const healthScore = Number(form.get('health_score'));
		if (!organizationId || !['healthy', 'watch', 'at_risk'].includes(healthStatus) || !Number.isInteger(healthScore) || healthScore < 0 || healthScore > 100) return fail(400, { message: 'Choose a valid client health status and score.' });
		const { error } = await locals.supabase.from('organization_success_profiles').upsert({ organization_id: organizationId, health_status: healthStatus, health_score: healthScore, next_check_in_on: String(form.get('next_check_in_on') ?? '') || null, renewal_due_on: String(form.get('renewal_due_on') ?? '') || null, risk_notes: String(form.get('risk_notes') ?? '').trim() || null, updated_by: access.user.id }, { onConflict: 'organization_id' });
		if (error) return fail(400, { message: error.message });
		await writeAuditLog(locals, { actorUserId: access.user.id, organizationId, action: 'client_success_profile_updated', entityType: 'organization_success_profile', metadata: { healthStatus, healthScore } });
		return { success: true, message: 'Client-success profile saved.' };
	},
	createFeatureFlag: async ({ request, locals }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Platform administrator access is required.' });
		const form = await request.formData();
		const flagKey = String(form.get('flag_key') ?? '').trim().toLowerCase();
		const name = String(form.get('name') ?? '').trim();
		if (!/^[a-z][a-z0-9_]{1,80}$/.test(flagKey) || !name) return fail(400, { message: 'Use a lowercase feature key and enter a name.' });
		const { error } = await locals.supabase.from('platform_feature_flags').insert({ flag_key: flagKey, name, description: String(form.get('description') ?? '').trim() || null, enabled_by_default: form.has('enabled_by_default'), created_by: access.user.id });
		if (error) return fail(400, { message: error.message });
		return { success: true, message: 'Feature flag created.' };
	},
	setFeatureAssignment: async ({ request, locals }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Platform administrator access is required.' });
		const form = await request.formData();
		const organizationId = String(form.get('organization_id') ?? '');
		const featureFlagId = String(form.get('feature_flag_id') ?? '');
		if (!organizationId || !featureFlagId) return fail(400, { message: 'Choose an organization and feature.' });
		const { error } = await locals.supabase.from('organization_feature_flags').upsert({ organization_id: organizationId, feature_flag_id: featureFlagId, enabled: form.has('enabled'), updated_by: access.user.id }, { onConflict: 'organization_id,feature_flag_id' });
		if (error) return fail(400, { message: error.message });
		await writeAuditLog(locals, { actorUserId: access.user.id, organizationId, action: 'organization_feature_flag_updated', entityType: 'organization_feature_flag', entityId: featureFlagId, metadata: { enabled: form.has('enabled') } });
		return { success: true, message: 'Organization feature allocation saved.' };
	}
};
