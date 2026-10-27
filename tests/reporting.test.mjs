import test from 'node:test';
import assert from 'node:assert/strict';
import { reportRange } from '../src/lib/dashboard/reporting.ts';
test('last month handles month-end and year boundaries', () => {
	assert.deepEqual(reportRange('2026-03-31', 'last_month'), {
		start: '2026-02-01',
		end: '2026-02-28',
		valid: true
	});
	assert.deepEqual(reportRange('2026-01-31', 'last_month'), {
		start: '2025-12-01',
		end: '2025-12-31',
		valid: true
	});
});
test('quarters and leap-year months have exact boundaries', () => {
	assert.deepEqual(reportRange('2026-10-27', 'this_quarter'), {
		start: '2026-10-01',
		end: '2026-12-31',
		valid: true
	});
	assert.equal(reportRange('2028-02-29', 'this_month').end, '2028-02-29');
});
test('custom reporting rejects reversed, missing and non-calendar dates', () => {
	assert.equal(reportRange('2026-10-27', 'custom', '2026-10-31', '2026-10-01').valid, false);
	assert.equal(reportRange('2026-10-27', 'custom', '', '2026-10-01').valid, false);
	assert.equal(reportRange('2026-10-27', 'custom', '2026-02-31', '2026-03-01').valid, false);
	assert.equal(reportRange('2026-10-27', 'custom', '2026-10-01', '2026-10-27').valid, true);
});
