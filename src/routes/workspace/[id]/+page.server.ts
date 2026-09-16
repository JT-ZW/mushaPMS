import { getWorkspaceAccess } from '$lib/server/workspace';
import { redirect } from '@sveltejs/kit';

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
};

export const load = async ({ locals, params }) => {
	const access = await getWorkspaceAccess(locals, params.id);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		throw redirect(303, '/workspace');
	}

	const now = new Date();
	const today = dateOnly(now);
	const startOfMonth = `${today.slice(0, 7)}-01`;
	const endOfMonth = dateOnly(new Date(now.getFullYear(), now.getMonth() + 1, 0));
	const leaseWindowEnd = dateOnly(addDays(now, 60));

	const [properties, spaces, people, tenancies, charges, payments, maintenance, activity, members] =
		await Promise.all([
			locals.supabase
				.from('properties')
				.select('id, name, city, country, status, latitude, longitude, created_at')
				.eq('organization_id', params.id)
				.order('name'),
			locals.supabase
				.from('spaces')
				.select('id, property_id, name, kind, status, monthly_rent, created_at')
				.eq('organization_id', params.id),
			locals.supabase
				.from('people')
				.select('id', { count: 'exact', head: true })
				.eq('organization_id', params.id),
			locals.supabase
				.from('tenancies')
				.select('id, space_id, status, start_date, end_date, rent_amount, billing_frequency')
				.eq('organization_id', params.id)
				.order('start_date', { ascending: false }),
			locals.supabase
				.from('charges')
				.select('id, tenancy_id, description, amount, due_on, charge_type')
				.eq('organization_id', params.id)
				.order('due_on', { ascending: true }),
			locals.supabase
				.from('payments')
				.select('id, tenancy_id, amount, payment_date, method')
				.eq('organization_id', params.id)
				.order('payment_date', { ascending: false }),
			locals.supabase
				.from('maintenance_requests')
				.select('id, property_id, space_id, title, priority, status, created_at')
				.eq('organization_id', params.id)
				.order('created_at', { ascending: false }),
			locals.supabase
				.from('audit_logs')
				.select('id, action, entity_type, metadata, created_at')
				.eq('organization_id', params.id)
				.order('created_at', { ascending: false })
				.limit(5),
			locals.supabase
				.from('organization_members')
				.select('user_id', { count: 'exact', head: true })
				.eq('organization_id', params.id)
		]);

	const propertyRows = properties.data ?? [];
	const spaceRows = spaces.data ?? [];
	const tenancyRows = tenancies.data ?? [];
	const chargeRows = charges.data ?? [];
	const paymentRows = payments.data ?? [];
	const maintenanceRows = maintenance.data ?? [];
	const activeTenancies = tenancyRows.filter((tenancy) =>
		['active', 'ending_soon'].includes(tenancy.status)
	);
	const occupiedSpaces = spaceRows.filter((space) => space.status === 'occupied').length;
	const rentableSpaces = spaceRows.filter((space) => space.status !== 'inactive').length;
	const total = (rows: { amount: number | string }[]) =>
		rows.reduce((sum, row) => sum + Number(row.amount), 0);
	const dueThisMonth = total(
		chargeRows.filter((charge) => charge.due_on >= startOfMonth && charge.due_on <= endOfMonth)
	);
	const receivedThisMonth = total(
		paymentRows.filter(
			(payment) => payment.payment_date >= startOfMonth && payment.payment_date <= endOfMonth
		)
	);
	const totalCharges = total(chargeRows);
	const totalPayments = total(paymentRows);
	const openMaintenance = maintenanceRows.filter(
		(request) => !['completed', 'closed'].includes(request.status)
	);
	const urgentMaintenance = openMaintenance.filter((request) => request.priority === 'urgent');
	const expiringTenancies = activeTenancies
		.filter(
			(tenancy) =>
				tenancy.end_date && tenancy.end_date >= today && tenancy.end_date <= leaseWindowEnd
		)
		.slice(0, 4);
	const overdueCharges = chargeRows.filter((charge) => charge.due_on < today).slice(0, 4);

	const propertyHealth = propertyRows.map((property) => {
		const propertySpaces = spaceRows.filter((space) => space.property_id === property.id);
		const occupied = propertySpaces.filter((space) => space.status === 'occupied').length;
		const propertyMaintenance = openMaintenance.filter(
			(request) => request.property_id === property.id
		).length;
		return {
			...property,
			spaces: propertySpaces.length,
			occupied,
			maintenance: propertyMaintenance
		};
	});

	const setupProgress = [
		propertyRows.length > 0,
		spaceRows.length > 0,
		(people.count ?? 0) > 0,
		activeTenancies.length > 0,
		chargeRows.length > 0
	];
	const watchlist = [
		...urgentMaintenance.map((request) => ({
			kind: 'urgent',
			title: request.title,
			detail: 'Urgent maintenance request',
			href: '/maintenance'
		})),
		...expiringTenancies.map((tenancy) => ({
			kind: 'lease',
			title: `Lease ends ${tenancy.end_date}`,
			detail: 'Review renewal or move-out plan',
			href: '/people'
		})),
		...overdueCharges.map((charge) => ({
			kind: 'collections',
			title: charge.description,
			detail: `Charge due ${charge.due_on}`,
			href: '/finance'
		}))
	].slice(0, 5);

	return {
		...access,
		counts: {
			properties: propertyRows.length,
			spaces: spaceRows.length,
			people: people.count ?? 0,
			activeTenancies: activeTenancies.length,
			openMaintenance: openMaintenance.length,
			occupiedSpaces,
			rentableSpaces,
			teamMembers: members.count ?? 0
		},
		finance: {
			dueThisMonth,
			receivedThisMonth,
			outstanding: Math.max(0, totalCharges - totalPayments),
			totalCharges,
			totalPayments
		},
		propertyHealth,
		watchlist,
		expiringTenancies,
		activity: activity.data ?? [],
		setup: { complete: setupProgress.filter(Boolean).length, total: setupProgress.length },
		recentPayments: paymentRows.slice(0, 4)
	};
};
