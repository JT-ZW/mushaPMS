import { getWorkspaceAccess } from '$lib/server/workspace';
import { error, redirect } from '@sveltejs/kit';
import { buildDashboard, organizationDate, shiftMonth } from '$lib/dashboard/snapshot';
import type {
	Property,
	Space,
	Tenancy,
	Charge,
	Payment,
	Allocation,
	Maintenance,
	Expense,
	Activity
} from '$lib/dashboard/snapshot';

// Supabase caps responses by default. Page every source rather than presenting a truncated total.
async function allRows<T>(
	page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
) {
	const rows: T[] = [];
	const pageSize = 500;
	for (let from = 0; ; from += pageSize) {
		const result = await page(from, from + pageSize - 1);
		if (result.error)
			throw error(503, 'The dashboard data could not be loaded. Please refresh to try again.');
		const batch = result.data ?? [];
		rows.push(...batch);
		if (batch.length < pageSize) return rows;
	}
}
export const load = async ({ locals, params, url }) => {
	const access = await getWorkspaceAccess(locals, params.id);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		throw redirect(303, '/workspace');
	}
	const today = organizationDate(new Date(), access.organization.timezone || 'Africa/Harare');
	const currentMonth = today.slice(0, 7);
	const months = Array.from({ length: 12 }, (_, i) => shiftMonth(currentMonth, -i));
	const requested = url.searchParams.get('month');
	const month = requested && months.includes(requested) ? requested : currentMonth;
	const db = locals.supabase;
	const [
		properties,
		spaces,
		tenancies,
		charges,
		payments,
		allocations,
		maintenance,
		expenses,
		activity
	] = await Promise.all([
		allRows<Property>((from, to) =>
			db
				.from('properties')
				.select('id,name,city,country,status')
				.eq('organization_id', params.id)
				.order('id')
				.range(from, to)
		),
		allRows<Space>((from, to) =>
			db
				.from('spaces')
				.select('id,property_id,parent_space_id,name,status')
				.eq('organization_id', params.id)
				.order('id')
				.range(from, to)
		),
		allRows<Tenancy>((from, to) =>
			db
				.from('tenancies')
				.select('id,space_id,status,start_date,end_date')
				.eq('organization_id', params.id)
				.order('id')
				.range(from, to)
		),
		allRows<Charge>((from, to) =>
			db
				.from('charges')
				.select('id,tenancy_id,description,amount,due_on,status')
				.eq('organization_id', params.id)
				.order('id')
				.range(from, to)
		),
		allRows<Payment>((from, to) =>
			db
				.from('payments')
				.select('id,tenancy_id,amount,payment_date,method')
				.eq('organization_id', params.id)
				.order('id')
				.range(from, to)
		),
		allRows<Allocation>((from, to) =>
			db
				.from('payment_allocations')
				.select('payment_id,charge_id,amount,charges!inner(organization_id)')
				.eq('charges.organization_id', params.id)
				.order('payment_id')
				.order('charge_id')
				.range(from, to)
		),
		allRows<Maintenance>((from, to) =>
			db
				.from('maintenance_requests')
				.select('id,property_id,space_id,title,priority,status,created_at,sla_due_at')
				.eq('organization_id', params.id)
				.order('id')
				.range(from, to)
		),
		allRows<Expense>((from, to) =>
			db
				.from('property_expenses')
				.select('id,category,amount,expense_date,approval_status')
				.eq('organization_id', params.id)
				.order('id')
				.range(from, to)
		),
		db
			.from('audit_logs')
			.select('id,action,entity_type,created_at')
			.eq('organization_id', params.id)
			.order('created_at', { ascending: false })
			.limit(5)
			.then((result) => {
				if (result.error)
					throw error(503, 'Recent activity could not be loaded. Please refresh to try again.');
				return (result.data ?? []) as Activity[];
			})
	]);
	const records = {
		properties,
		spaces,
		tenancies,
		charges,
		payments,
		allocations,
		maintenance,
		expenses,
		activity
	};
	const asOf = new Date().toISOString();
	const snapshots = months.map((key) => buildDashboard(records, today, key, asOf));
	const periods = Object.fromEntries(
		snapshots.map((snapshot) => [
			snapshot.month,
			{
				month: snapshot.month,
				finance: snapshot.finance,
				monthly: snapshot.monthly,
				categories: snapshot.categories,
				expenseTotal: snapshot.expenseTotal,
				recentPayments: snapshot.recentPayments
			}
		])
	);
	const attention = await db.rpc('workflow_attention', { target_org: params.id });
	return {
		attention: attention.data ?? [],
		attentionUnavailable: Boolean(attention.error),
		...access,
		months,
		periods,
		snapshot: snapshots.find((snapshot) => snapshot.month === month)!
	};
};
