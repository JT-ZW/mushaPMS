import test from 'node:test';
import assert from 'node:assert/strict';
import { isCurrentLease, expiresWithin, validateLeaseTerms } from '../src/lib/dashboard/leases.ts';
const lease = { status: 'ending_soon', start_date: '2026-01-01', end_date: '2026-11-30' };
test('ending-soon counts as current; future and expired leases do not', () => {
	assert.equal(isCurrentLease(lease, '2026-10-27'), true);
	assert.equal(isCurrentLease({ ...lease, start_date: '2026-11-01' }, '2026-10-27'), false);
	assert.equal(isCurrentLease({ ...lease, end_date: '2026-09-01' }, '2026-10-27'), false);
});
test('renewal window excludes past expiry dates and includes the boundary', () => {
	assert.equal(expiresWithin(lease, '2026-10-27', 34), true);
	assert.equal(expiresWithin({ ...lease, end_date: '2026-10-26' }, '2026-10-27'), false);
	assert.equal(expiresWithin({ ...lease, end_date: null }, '2026-10-27'), false);
});
test('lease terms reject reversed dates, invalid due days and negative amounts', () => {
	assert.equal(validateLeaseTerms('2026-10-01', '2027-10-01', 'monthly', 1, 100, 30), null);
	assert.ok(validateLeaseTerms('2026-10-01', '2026-09-01', 'monthly', 1, 100, 30));
	assert.ok(validateLeaseTerms('2026-10-01', '', 'monthly', 32, 100, 30));
	assert.ok(validateLeaseTerms('2026-10-01', '', 'monthly', 1, -1, 30));
	assert.ok(validateLeaseTerms('2026-10-01', '', 'monthly', 1, 100, 1.5));
});
