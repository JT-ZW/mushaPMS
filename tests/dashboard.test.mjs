import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboard, organizationDate, shiftMonth } from '../src/lib/dashboard/snapshot.ts';
const empty = () => ({
	properties: [],
	spaces: [],
	tenancies: [],
	charges: [],
	payments: [],
	allocations: [],
	maintenance: [],
	expenses: [],
	activity: []
});
const charge = (id, amount, status = 'issued', due_on = '2026-10-10') => ({
	id,
	amount,
	status,
	due_on,
	tenancy_id: 't1',
	description: id
});
const payment = (id, amount, payment_date = '2026-10-12') => ({
	id,
	amount,
	payment_date,
	tenancy_id: 't1',
	method: 'cash'
});
test('settlement uses matching allocations, not unrelated or future cash; paid charges are not overdue', () => {
	const r = empty();
	r.charges = [
		charge('partial', 100),
		charge('paid', 60, 'paid'),
		charge('draft', 900, 'draft'),
		charge('void', 800, 'void')
	];
	r.payments = [
		payment('p1', 110),
		payment('unallocated', 500),
		payment('future', 999, '2026-11-01')
	];
	r.allocations = [
		{ payment_id: 'p1', charge_id: 'partial', amount: 50 },
		{ payment_id: 'p1', charge_id: 'paid', amount: 60 },
		{ payment_id: 'future', charge_id: 'partial', amount: 50 }
	];
	const s = buildDashboard(r, '2026-10-26', '2026-10');
	assert.equal(s.finance.due, 160);
	assert.equal(s.finance.receipts, 610);
	assert.equal(s.finance.settled, 110);
	assert.equal(s.finance.overdue, 50);
	assert.equal(s.finance.overdueCount, 1);
	assert.equal(s.finance.settlementRate, 69);
	assert.equal(s.watchlist.length, 1);
});
test('empty portfolio has no invented rate, receipts or expenses', () => {
	const s = buildDashboard(empty(), '2026-10-26', '2026-10');
	assert.equal(s.finance.settlementRate, null);
	assert.equal(s.finance.due, 0);
	assert.equal(s.counts.rentableSpaces, 0);
	assert.equal(s.monthly.length, 6);
	assert.equal(s.expenseTotal, 0);
});
test('occupancy excludes subdivided parents, inactive ancestors and inactive properties', () => {
	const r = empty();
	r.properties = [
		{ id: 'p', name: 'House', status: 'active' },
		{ id: 'off', name: 'Archived', status: 'inactive' }
	];
	r.spaces = [
		{ id: 'unit', property_id: 'p', parent_space_id: null, status: 'occupied' },
		{ id: 'room1', property_id: 'p', parent_space_id: 'unit', status: 'occupied' },
		{ id: 'room2', property_id: 'p', parent_space_id: 'unit', status: 'vacant' },
		{ id: 'offunit', property_id: 'off', parent_space_id: null, status: 'occupied' },
		{ id: 'inactive', property_id: 'p', parent_space_id: null, status: 'inactive' },
		{ id: 'inactivechild', property_id: 'p', parent_space_id: 'inactive', status: 'occupied' }
	];
	const s = buildDashboard(r, '2026-10-26', '2026-10');
	assert.equal(s.counts.rentableSpaces, 2);
	assert.equal(s.counts.occupiedSpaces, 1);
	assert.equal(s.propertyHealth[0].spaces, 2);
});
test('period receipts, approved expense categories, precision and future dates', () => {
	const r = empty();
	r.payments = [payment('a', '0.10'), payment('b', '0.20'), payment('old', 90, '2026-09-03')];
	r.expenses = [
		{
			id: '1',
			category: 'repairs',
			amount: 20,
			expense_date: '2026-10-01',
			approval_status: 'approved'
		},
		{
			id: '2',
			category: 'repairs',
			amount: 99,
			expense_date: '2026-10-01',
			approval_status: 'pending'
		},
		{
			id: '3',
			category: 'other',
			amount: 30,
			expense_date: '2026-10-27',
			approval_status: 'approved'
		}
	];
	const s = buildDashboard(r, '2026-10-26', '2026-10');
	assert.equal(s.finance.receipts, 0.3);
	assert.equal(s.finance.receiptCount, 2);
	assert.equal(s.expenseTotal, 20);
	assert.equal(s.categories.length, 1);
	assert.equal(s.monthly[4].receipts, 90);
});
test('renewals are sorted and exclude future-start and expired tenancies', () => {
	const r = empty();
	r.tenancies = [
		{ id: 'a', space_id: 's', status: 'active', start_date: '2026-01-01', end_date: '2026-11-01' },
		{ id: 'b', space_id: 's', status: 'active', start_date: '2026-11-01', end_date: '2026-11-30' },
		{ id: 'c', space_id: 's', status: 'active', start_date: '2026-01-01', end_date: '2026-10-01' }
	];
	const s = buildDashboard(r, '2026-10-26', '2026-10');
	assert.equal(s.counts.activeTenancies, 1);
	assert.equal(s.counts.renewals, 1);
});
test('organization timezone and month boundaries handle midnight and year changes', () => {
	assert.equal(organizationDate(new Date('2026-10-31T23:30:00Z'), 'Africa/Harare'), '2026-11-01');
	assert.equal(shiftMonth('2026-01', -1), '2025-12');
});
test('maintenance SLA detects a deadline earlier on the same day', () => {
	const r = empty();
	r.maintenance = [
		{
			id: 'm',
			property_id: 'p',
			space_id: null,
			title: 'Fault',
			priority: 'urgent',
			status: 'assigned',
			created_at: '2026-10-25T00:00:00Z',
			sla_due_at: '2026-10-26T08:00:00Z'
		}
	];
	const s = buildDashboard(r, '2026-10-26', '2026-10', '2026-10-26T10:00:00Z');
	assert.equal(s.maintenance[0].overdue, true);
});
