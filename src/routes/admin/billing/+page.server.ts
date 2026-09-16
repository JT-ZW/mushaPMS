import { getPlatformMember, writeAuditLog } from '$lib/server/platform';
import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const access = await getPlatformMember(locals);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		return { access: 'denied' as const, organizations: [], plans: [], subscriptions: [], payments: [] };
	}
	const [{ data: organizations }, { data: plans }, { data: subscriptions }, { data: payments }] =
		await Promise.all([
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
				'organization_id, plan_id, status, billing_cycle, started_on, current_period_starts_on, trial_ends_on, current_period_ends_on, paused_at, billing_notes, platform_plans(name, plan_key, monthly_price, currency_code)'
			)
			.order('updated_at', { ascending: false })
		,
		locals.supabase
			.from('subscription_payments')
			.select(
				'id, organization_id, plan_id, subscription_period_start, subscription_period_end, billing_cycle, amount, currency_code, status, paid_on, payment_method, reference, notes, created_at'
			)
			.order('created_at', { ascending: false })
			.limit(100)
	]);
	return {
		access: 'granted' as const,
		member: access.member,
		organizations: organizations ?? [],
		plans: plans ?? [],
		subscriptions: subscriptions ?? [],
		payments: payments ?? []
	};
};

export const actions = {
	renewSubscription: async ({ request, locals }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Billing access is restricted.' });
		const form = await request.formData();
		const organizationId = String(form.get('organization_id') ?? '');
		const planId = String(form.get('plan_id') ?? '');
		const cycle = String(form.get('billing_cycle') ?? 'monthly');
		const periodStart = String(form.get('period_start') ?? '');
		const periodEnd = String(form.get('period_end') ?? '');
		const paymentStatus = String(form.get('payment_status') ?? 'paid');
		const amountInput = String(form.get('amount') ?? '').trim();
		const amount = amountInput ? Number(amountInput) : null;
		if (!organizationId || !planId || !/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd))
			return fail(400, { message: 'Choose an organization, plan, and valid subscription dates.' });
		if (periodEnd < periodStart || !['monthly', 'quarterly', 'annual'].includes(cycle))
			return fail(400, { message: 'Choose a valid billing cycle and date range.' });
		if (!['pending', 'paid', 'void'].includes(paymentStatus) || (amount !== null && (!Number.isFinite(amount) || amount < 0)))
			return fail(400, { message: 'Enter a valid payment amount and status.' });
		const { data: plan } = await locals.supabase
			.from('platform_plans')
			.select('id, monthly_price, currency_code')
			.eq('id', planId)
			.maybeSingle();
		if (!plan) return fail(404, { message: 'Subscription plan not found.' });
		const cycleMultiplier = cycle === 'quarterly' ? 3 : cycle === 'annual' ? 12 : 1;
		const paymentAmount = amount ?? Number(plan.monthly_price) * cycleMultiplier;
		const subscriptionStatus = paymentStatus === 'paid' ? 'active' : 'past_due';
		const { error: subscriptionError } = await locals.supabase
			.from('organization_subscriptions')
			.upsert(
				{
					organization_id: organizationId,
					plan_id: planId,
					status: subscriptionStatus,
					billing_cycle: cycle,
					current_period_starts_on: periodStart,
					current_period_ends_on: periodEnd,
					paused_at: null,
					paused_by: null,
					updated_by: access.user.id
				},
				{ onConflict: 'organization_id' }
			);
		if (subscriptionError) return fail(400, { message: subscriptionError.message });
		const { error: paymentError } = await locals.supabase.from('subscription_payments').insert({
			organization_id: organizationId,
			plan_id: planId,
			subscription_period_start: periodStart,
			subscription_period_end: periodEnd,
			billing_cycle: cycle,
			amount: paymentAmount,
			currency_code: plan.currency_code,
			status: paymentStatus,
			paid_on: paymentStatus === 'paid' ? String(form.get('paid_on') ?? periodStart) : null,
			payment_method: String(form.get('payment_method') ?? '').trim() || null,
			reference: String(form.get('reference') ?? '').trim() || null,
			notes: String(form.get('notes') ?? '').trim() || null,
			recorded_by: access.user.id
		});
		if (paymentError) return fail(400, { message: paymentError.message });
		if (paymentStatus === 'paid')
			await locals.supabase
				.from('organizations')
				.update({ status: 'active' })
				.eq('id', organizationId);
		await writeAuditLog(locals, {
			actorUserId: access.user.id, organizationId, action: 'subscription_renewed',
			entityType: 'organization_subscription', metadata: { plan_id: planId, cycle, periodStart, periodEnd, paymentStatus, paymentAmount }
		});
		return { success: true, message: `Subscription ${paymentStatus === 'paid' ? 'renewed and activated' : 'recorded as awaiting payment'}.` };
	},
	pauseSubscription: async ({ request, locals }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Billing access is restricted.' });
		const organizationId = String((await request.formData()).get('organization_id') ?? '');
		if (!organizationId) return fail(400, { message: 'Organization is required.' });
		const { error } = await locals.supabase.from('organization_subscriptions').update({ status: 'paused', paused_at: new Date().toISOString(), paused_by: access.user.id, updated_by: access.user.id }).eq('organization_id', organizationId);
		if (error) return fail(400, { message: error.message });
		await locals.supabase.from('organizations').update({ status: 'suspended' }).eq('id', organizationId);
		await writeAuditLog(locals, { actorUserId: access.user.id, organizationId, action: 'subscription_paused', entityType: 'organization_subscription' });
		return { success: true, message: 'Subscription paused. The workspace is marked inactive until you reactivate or renew it.' };
	},
	activateSubscription: async ({ request, locals }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Billing access is restricted.' });
		const organizationId = String((await request.formData()).get('organization_id') ?? '');
		if (!organizationId) return fail(400, { message: 'Organization is required.' });
		const { error } = await locals.supabase.from('organization_subscriptions').update({ status: 'active', paused_at: null, paused_by: null, updated_by: access.user.id }).eq('organization_id', organizationId);
		if (error) return fail(400, { message: error.message });
		await locals.supabase.from('organizations').update({ status: 'active' }).eq('id', organizationId);
		await writeAuditLog(locals, { actorUserId: access.user.id, organizationId, action: 'subscription_activated', entityType: 'organization_subscription' });
		return { success: true, message: 'Subscription reactivated.' };
	},
	refreshExpiries: async ({ locals }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Billing access is restricted.' });
		const today = new Date().toISOString().slice(0, 10);
		const { data: expired, error } = await locals.supabase
			.from('organization_subscriptions')
			.update({ status: 'inactive', updated_by: access.user.id })
			.in('status', ['active', 'trial', 'past_due'])
			.lt('current_period_ends_on', today)
			.select('organization_id');
		if (error) return fail(400, { message: error.message });
		if (expired?.length)
			await locals.supabase
				.from('organizations')
				.update({ status: 'suspended' })
				.in('id', expired.map((subscription) => subscription.organization_id));
		return { success: true, message: `${expired?.length ?? 0} expired subscription${expired?.length === 1 ? '' : 's'} marked inactive.` };
	},
	updatePaymentStatus: async ({ request, locals }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Billing access is restricted.' });
		const form = await request.formData();
		const paymentId = String(form.get('payment_id') ?? '');
		const status = String(form.get('status') ?? '');
		if (!paymentId || !['pending', 'paid', 'void'].includes(status)) return fail(400, { message: 'Choose a valid payment status.' });
		const { data: payment, error } = await locals.supabase.from('subscription_payments').update({ status, paid_on: status === 'paid' ? String(form.get('paid_on') ?? new Date().toISOString().slice(0, 10)) : null }).eq('id', paymentId).select('organization_id, subscription_period_start, subscription_period_end').single();
		if (error || !payment) return fail(400, { message: error?.message ?? 'Payment could not be updated.' });
		if (status === 'paid') {
			await locals.supabase.from('organization_subscriptions').update({ status: 'active', current_period_starts_on: payment.subscription_period_start, current_period_ends_on: payment.subscription_period_end, updated_by: access.user.id }).eq('organization_id', payment.organization_id);
			await locals.supabase.from('organizations').update({ status: 'active' }).eq('id', payment.organization_id);
		}
		await writeAuditLog(locals, { actorUserId: access.user.id, organizationId: payment.organization_id, action: 'subscription_payment_updated', entityType: 'subscription_payment', entityId: paymentId, metadata: { status } });
		return { success: true, message: 'Payment status updated.' };
	},
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
