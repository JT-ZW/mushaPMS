import { rentableSpaces } from './portfolio.ts';
export type Property = {
	id: string;
	name: string;
	city: string | null;
	country: string | null;
	status: string;
};
export type Space = {
	id: string;
	property_id: string;
	parent_space_id: string | null;
	name: string;
	status: string;
};
export type Tenancy = {
	id: string;
	space_id: string;
	status: string;
	start_date: string;
	end_date: string | null;
};
export type Charge = {
	id: string;
	tenancy_id: string;
	description: string;
	amount: number | string;
	due_on: string;
	status: string;
};
export type Payment = {
	id: string;
	tenancy_id: string | null;
	amount: number | string;
	payment_date: string;
	method: string;
};
export type Allocation = { payment_id: string; charge_id: string; amount: number | string };
export type Maintenance = {
	id: string;
	property_id: string;
	space_id: string | null;
	title: string;
	priority: string;
	status: string;
	created_at: string;
	sla_due_at: string | null;
};
export type Expense = {
	id: string;
	category: string;
	amount: number | string;
	expense_date: string;
	approval_status: string;
};
export type Activity = { id: string; action: string; entity_type: string; created_at: string };
export type DashboardRecords = {
	properties: Property[];
	spaces: Space[];
	tenancies: Tenancy[];
	charges: Charge[];
	payments: Payment[];
	allocations: Allocation[];
	maintenance: Maintenance[];
	expenses: Expense[];
	activity: Activity[];
};
const cents = (value: number | string) => Math.round(Number(value) * 100);
const sum = <T>(rows: T[], amount: (row: T) => number) =>
	rows.reduce((total, row) => total + amount(row), 0);
export function organizationDate(now: Date, timezone: string) {
	const parts = new Intl.DateTimeFormat('en', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(now);
	return ['year', 'month', 'day']
		.map((type) => parts.find((part) => part.type === type)!.value)
		.join('-');
}
export function shiftMonth(month: string, offset: number) {
	const [year, m] = month.split('-').map(Number);
	return new Date(Date.UTC(year, m - 1 + offset, 1)).toISOString().slice(0, 7);
}
export function buildDashboard(
	records: DashboardRecords,
	today: string,
	month: string,
	asOf = `${today}T00:00:00Z`
) {
	const {
		properties,
		spaces,
		tenancies,
		charges,
		payments,
		allocations,
		maintenance,
		expenses,
		activity
	} = records;
	const activeProperties = properties.filter((row) => row.status === 'active');
	const spacesById = new Map(spaces.map((row) => [row.id, row]));
	const rentable = rentableSpaces(properties, spaces);
	const occupancy = ['occupied', 'vacant', 'reserved', 'maintenance'].map((status) => ({
		status,
		count: rentable.filter((row) => row.status === status).length
	}));
	const occupied = occupancy[0].count;
	const posted = charges.filter((row) => !['draft', 'void'].includes(row.status));
	const receipts = payments.filter((row) => row.payment_date <= today);
	const receiptIds = new Set(receipts.map((row) => row.id));
	const allocated = new Map<string, number>();
	for (const row of allocations)
		if (receiptIds.has(row.payment_id))
			allocated.set(row.charge_id, (allocated.get(row.charge_id) ?? 0) + cents(row.amount));
	const balance = (charge: Charge) =>
		Math.max(0, cents(charge.amount) - (allocated.get(charge.id) ?? 0));
	const periodCharges = posted.filter((row) => row.due_on.startsWith(month));
	const periodReceipts = receipts.filter((row) => row.payment_date.startsWith(month));
	const due = sum(periodCharges, (row) => cents(row.amount));
	const settled = sum(periodCharges, (row) =>
		Math.min(cents(row.amount), allocated.get(row.id) ?? 0)
	);
	const overdue = posted
		.filter((row) => row.due_on < today && balance(row) > 0)
		.sort((a, b) => a.due_on.localeCompare(b.due_on));
	const open = maintenance.filter((row) => !['completed', 'closed'].includes(row.status));
	const priorityRank: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
	const requests = [...open].sort(
		(a, b) =>
			(priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9) ||
			a.created_at.localeCompare(b.created_at)
	);
	const activeTenancies = tenancies.filter(
		(row) =>
			['active', 'ending_soon'].includes(row.status) &&
			row.start_date <= today &&
			(!row.end_date || row.end_date >= today)
	);
	const windowEnd = new Date(`${today}T00:00:00Z`);
	windowEnd.setUTCDate(windowEnd.getUTCDate() + 60);
	const renewals = activeTenancies
		.filter((row) => row.end_date && row.end_date <= windowEnd.toISOString().slice(0, 10))
		.sort((a, b) => a.end_date!.localeCompare(b.end_date!));
	const spaceLabel = (id: string) => {
		const space = spacesById.get(id);
		const property = properties.find((row) => row.id === space?.property_id);
		return [property?.name, space?.name].filter(Boolean).join(' · ') || 'Tenancy record';
	};
	const tenancyLabel = (id: string | null) => {
		const tenancy = tenancies.find((row) => row.id === id);
		return tenancy ? spaceLabel(tenancy.space_id) : 'Unassigned receipt';
	};
	const monthly = Array.from({ length: 6 }, (_, i) => {
		const key = shiftMonth(month, i - 5);
		return {
			month: key,
			charges:
				sum(
					posted.filter((row) => row.due_on.startsWith(key)),
					(row) => cents(row.amount)
				) / 100,
			receipts:
				sum(
					receipts.filter((row) => row.payment_date.startsWith(key)),
					(row) => cents(row.amount)
				) / 100
		};
	});
	const approvedExpenses = expenses.filter(
		(row) =>
			row.approval_status === 'approved' &&
			row.expense_date.startsWith(month) &&
			row.expense_date <= today
	);
	const categories = [...new Set(approvedExpenses.map((row) => row.category))]
		.map((category) => ({
			category,
			amount:
				sum(
					approvedExpenses.filter((row) => row.category === category),
					(row) => cents(row.amount)
				) / 100
		}))
		.filter((row) => row.amount > 0)
		.sort((a, b) => b.amount - a.amount);
	const propertyHealth = activeProperties.map((property) => {
		const propertySpaces = rentable.filter((row) => row.property_id === property.id);
		return {
			...property,
			spaces: propertySpaces.length,
			occupied: propertySpaces.filter((row) => row.status === 'occupied').length,
			maintenance: open.filter((row) => row.property_id === property.id).length
		};
	});
	return {
		today,
		month,
		counts: {
			properties: activeProperties.length,
			rentableSpaces: rentable.length,
			occupiedSpaces: occupied,
			activeTenancies: activeTenancies.length,
			openMaintenance: open.length,
			urgentMaintenance: open.filter((row) => row.priority === 'urgent').length,
			renewals: renewals.length
		},
		finance: {
			due: due / 100,
			settled: settled / 100,
			receipts: sum(periodReceipts, (row) => cents(row.amount)) / 100,
			receiptCount: periodReceipts.length,
			overdue: sum(overdue, balance) / 100,
			overdueCount: overdue.length,
			outstanding:
				sum(
					posted.filter((row) => row.due_on <= today),
					balance
				) / 100,
			settlementRate: due ? Math.round((settled / due) * 100) : null
		},
		occupancy,
		monthly,
		categories,
		expenseTotal: sum(approvedExpenses, (row) => cents(row.amount)) / 100,
		propertyHealth,
		maintenance: requests.slice(0, 5).map((row) => ({
			...row,
			location: properties.find((property) => property.id === row.property_id)?.name ?? 'Property',
			overdue: !!row.sla_due_at && row.sla_due_at < asOf
		})),
		watchlist: [
			...requests
				.filter((row) => row.priority === 'urgent')
				.map((row) => ({
					id: row.id,
					kind: 'maintenance',
					title: row.title,
					detail: 'Urgent maintenance',
					section: 'maintenance'
				})),
			...overdue.map((row) => ({
				id: row.id,
				kind: 'arrears',
				title: row.description,
				detail: `${tenancyLabel(row.tenancy_id)} · Due ${row.due_on}`,
				section: 'finance'
			})),
			...renewals.map((row) => ({
				id: row.id,
				kind: 'renewal',
				title: spaceLabel(row.space_id),
				detail: `Lease ends ${row.end_date}`,
				section: 'people'
			}))
		].slice(0, 6),
		recentPayments: periodReceipts
			.slice()
			.sort((a, b) => b.payment_date.localeCompare(a.payment_date))
			.slice(0, 5)
			.map((row) => ({
				...row,
				location: tenancyLabel(row.tenancy_id),
				amount: cents(row.amount) / 100
			})),
		activity
	};
}
export type DashboardSnapshot = ReturnType<typeof buildDashboard>;
