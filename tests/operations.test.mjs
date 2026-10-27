import test from 'node:test';
import assert from 'node:assert/strict';
import {
	chargeBalance,
	maintenanceOrder,
	maintenanceNextStates
} from '../src/lib/dashboard/operations.ts';
import { workspaceSubmit } from '../src/lib/forms/workspace-submit.ts';
test('partial balances exclude future receipts and ignore draft or void charges', () => {
	const c = { id: 'c', amount: '100.10', status: 'issued' };
	const a = [
		{ charge_id: 'c', payment_id: 'p', amount: '20.10' },
		{ charge_id: 'c', payment_id: 'f', amount: 80 }
	];
	const p = [
		{ id: 'p', payment_date: '2026-10-01' },
		{ id: 'f', payment_date: '2026-11-01' }
	];
	assert.equal(chargeBalance(c, a, p, '2026-10-27'), 80);
	assert.equal(chargeBalance({ ...c, status: 'draft' }, a, p, '2026-10-27'), 0);
	assert.equal(chargeBalance({ ...c, status: 'void' }, a, p, '2026-10-27'), 0);
});
test('maintenance queue prioritises urgency, SLA deadline, then oldest work', () => {
	const rows = [
		{ priority: 'normal', created_at: '2026-01-01', sla_due_at: null },
		{ priority: 'urgent', created_at: '2026-10-20', sla_due_at: '2026-10-29' },
		{ priority: 'urgent', created_at: '2026-10-24', sla_due_at: '2026-10-26' }
	];
	assert.equal(rows.sort(maintenanceOrder)[0].sla_due_at, '2026-10-26');
	assert.equal(
		maintenanceOrder(
			{ priority: 'high', created_at: '2026-10-01' },
			{ priority: 'high', created_at: '2026-10-02' }
		),
		-1
	);
});
class Button {
	disabled = false;
}
globalThis.HTMLButtonElement = Button;
const mockForm = () => ({
	dataset: { resetOnSuccess: 'true' },
	setAttribute() {},
	removeAttribute() {}
});
test('enhanced workspace actions cancel repeat submits and preserve failed inputs', async () => {
	const form = mockForm();
	const button = new Button();
	let cancelled = false;
	const callback = workspaceSubmit({ formElement: form, submitter: button, cancel() {} });
	assert.equal(button.disabled, true);
	workspaceSubmit({
		formElement: form,
		submitter: button,
		cancel() {
			cancelled = true;
		}
	});
	assert.equal(cancelled, true);
	let reset;
	await callback({
		result: { type: 'failure', status: 400, data: { message: 'Invalid' } },
		update: async (options) => {
			reset = options.reset;
		}
	});
	assert.equal(reset, false);
	assert.equal(button.disabled, false);
	assert.equal(form.dataset.submitting, undefined);
});
test('successful create forms reset; failed update cleanup releases the submit button', async () => {
	const form = mockForm();
	const button = new Button();
	const callback = workspaceSubmit({ formElement: form, submitter: button, cancel() {} });
	let reset;
	await callback({
		result: { type: 'success', status: 200, data: { success: true } },
		update: async (options) => {
			reset = options.reset;
		}
	});
	assert.equal(reset, true);
	const again = workspaceSubmit({ formElement: form, submitter: button, cancel() {} });
	await assert.rejects(
		again({
			result: { type: 'success', data: {} },
			update: async () => {
				throw new Error('Network');
			}
		})
	);
	assert.equal(button.disabled, false);
	assert.equal(form.dataset.submitting, undefined);
});

test('maintenance handoffs cannot skip approval or reopen closed work', () => {
	assert.deepEqual(maintenanceNextStates('in_progress'), ['in_progress', 'awaiting_approval']);
	assert.deepEqual(maintenanceNextStates('awaiting_approval'), [
		'awaiting_approval',
		'in_progress',
		'completed'
	]);
	assert.deepEqual(maintenanceNextStates('closed'), ['closed']);
});
