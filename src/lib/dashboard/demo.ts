import { buildDashboard } from './snapshot';
import type { DashboardRecords } from './snapshot';
/** Fictional records for the public design preview. Never queried by an authenticated workspace. */
export function demoDashboard() {
	const records: DashboardRecords = {
		properties: [
			{
				id: 'mabel',
				name: 'Mabel Court',
				city: 'Borrowdale, Harare',
				country: 'Zimbabwe',
				status: 'active'
			},
			{
				id: 'acacia',
				name: 'Acacia Place',
				city: 'Avondale, Harare',
				country: 'Zimbabwe',
				status: 'active'
			},
			{
				id: 'grove',
				name: 'The Grove',
				city: 'Mount Pleasant, Harare',
				country: 'Zimbabwe',
				status: 'active'
			}
		],
		spaces: [],
		tenancies: [],
		charges: [],
		payments: [],
		allocations: [],
		maintenance: [],
		expenses: [],
		activity: []
	};
	for (const [propertyIndex, property] of records.properties.entries()) {
		const count = [12, 8, 4][propertyIndex];
		for (let index = 0; index < count; index++) {
			const id = `${property.id}-${index}`;
			const occupied = index < count - (propertyIndex === 2 ? 0 : 1);
			records.spaces.push({
				id,
				property_id: property.id,
				parent_space_id: null,
				name: `Unit ${String(index + 1).padStart(2, '0')}`,
				status: occupied ? 'occupied' : 'vacant'
			});
			if (!occupied) continue;
			records.tenancies.push({
				id,
				space_id: id,
				status: 'active',
				start_date: '2026-01-01',
				end_date: index === 0 ? '2026-11-30' : null
			});
			for (let m = 5; m <= 10; m++) {
				const month = `2026-${String(m).padStart(2, '0')}`;
				const amount = [850, 900, 1200][propertyIndex];
				const chargeId = `${id}-${m}`;
				records.charges.push({
					id: chargeId,
					tenancy_id: id,
					description: `${property.name} rent`,
					amount,
					due_on: `${month}-05`,
					status: 'issued'
				});
				if (m === 10 && index === 1) continue;
				const paid = m === 10 && index === 2 ? amount / 2 : amount;
				records.payments.push({
					id: chargeId,
					tenancy_id: id,
					amount: paid,
					payment_date: `${month}-${String(7 + index).padStart(2, '0')}`,
					method: index % 2 ? 'bank_transfer' : 'mobile_money'
				});
				records.allocations.push({ payment_id: chargeId, charge_id: chargeId, amount: paid });
			}
		}
	}
	records.maintenance = [
		{
			id: 'request-1',
			property_id: 'mabel',
			space_id: 'mabel-3',
			title: 'Kitchen tap needs repair',
			priority: 'high',
			status: 'in_progress',
			created_at: '2026-10-24T09:00:00Z',
			sla_due_at: '2026-10-28T09:00:00Z'
		},
		{
			id: 'request-2',
			property_id: 'acacia',
			space_id: null,
			title: 'Main entrance electrical fault',
			priority: 'urgent',
			status: 'assigned',
			created_at: '2026-10-25T08:30:00Z',
			sla_due_at: '2026-10-26T08:30:00Z'
		}
	];
	records.expenses = [
		{
			id: 'expense-1',
			category: 'repairs',
			amount: 425,
			expense_date: '2026-10-12',
			approval_status: 'approved'
		},
		{
			id: 'expense-2',
			category: 'utilities',
			amount: 760,
			expense_date: '2026-10-15',
			approval_status: 'approved'
		},
		{
			id: 'expense-3',
			category: 'security',
			amount: 580,
			expense_date: '2026-10-20',
			approval_status: 'approved'
		},
		{
			id: 'expense-4',
			category: 'cleaning',
			amount: 290,
			expense_date: '2026-10-22',
			approval_status: 'approved'
		}
	];
	records.activity = [
		{
			id: 'event1',
			action: 'payment_recorded',
			entity_type: 'payment',
			created_at: '2026-10-26T08:15:00Z'
		},
		{
			id: 'event2',
			action: 'maintenance_assigned',
			entity_type: 'maintenance_request',
			created_at: '2026-10-25T09:00:00Z'
		},
		{
			id: 'event3',
			action: 'tenancy_updated',
			entity_type: 'tenancy',
			created_at: '2026-10-24T14:20:00Z'
		}
	];
	return buildDashboard(records, '2026-10-26', '2026-10', '2026-10-26T10:00:00Z');
}
