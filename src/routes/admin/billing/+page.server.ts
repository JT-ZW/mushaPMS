import { getPlatformMember, writeAuditLog } from '$lib/server/platform';
import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const access = await getPlatformMember(locals);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		return { access: 'denied' as const, organizations: [], plans: [], subscriptions: [] };
	}
	const [{ data: organizations }, { data: plans }, { data: subscriptions }] = await Promise.all([
		locals.supabase.from('organizations').select('id, name, status').order('name'),
		locals.supabase
			.from('platform_plans')
			.select(
				'id, plan_key, name, monthly_price, currency_code, property_limit, space_limit, active'
			)
			.eq('active', true)
			.order('monthly_price'),
		locals.supabase
			.from('organization_subscriptions')
			.select(
				'organization_id, plan_id, status, started_on, trial_ends_on, current_period_ends_on, billing_notes, platform_plans(name, plan_key, monthly_price, currency_code)'
			)
			.order('updated_at', { ascending: false })
	]);
	return {
		access: 'granted' as const,
		member: access.member,
		organizations: organizations ?? [],
		plans: plans ?? [],
		subscriptions: subscriptions ?? []
	};
};

export const actions = {
	assignPlan: async ({ request, locals }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Billing access is restricted.' });
		const form = await request.formData();
		const organizationId = String(form.get('organization_id') ?? '');
		const planId = String(form.get('plan_id') ?? '');
		const status = String(form.get('status') ?? 'trial');
		if (!organizationId || !planId)
			return fail(400, { message: 'Choose an organization and plan.' });
		const { error: upsertError } = await locals.supabase
			.from('organization_subscriptions')
			.upsert(
				{ organization_id: organizationId, plan_id: planId, status, updated_by: access.user.id },
				{ onConflict: 'organization_id' }
			);
		if (upsertError) return fail(400, { message: upsertError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId,
			action: 'subscription_plan_assigned',
			entityType: 'organization_subscription',
			metadata: { plan_id: planId, status }
		});
		return { success: true, message: 'Subscription plan updated.' };
	}
};
