export const monetary = (value: number | string | null | undefined) =>
	Math.round(Number(value ?? 0) * 100) / 100;
export function chargeBalance(
	charge: { id: string; amount: number | string; status?: string },
	allocations: { charge_id: string; payment_id: string; amount: number | string }[],
	payments: { id: string; payment_date: string }[],
	today: string
) {
	if (['draft', 'void'].includes(charge.status ?? 'issued')) return 0;
	const valid = new Set(payments.filter((row) => row.payment_date <= today).map((row) => row.id));
	const paid = allocations
		.filter((row) => row.charge_id === charge.id && valid.has(row.payment_id))
		.reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0);
	return Math.max(0, Math.round(Number(charge.amount) * 100) - paid) / 100;
}
export function maintenanceOrder(
	a: { priority: string; created_at: string; sla_due_at?: string | null },
	b: { priority: string; created_at: string; sla_due_at?: string | null }
) {
	const rank: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
	return (
		(rank[a.priority] ?? 9) - (rank[b.priority] ?? 9) ||
		(a.sla_due_at ?? '9999').localeCompare(b.sla_due_at ?? '9999') ||
		a.created_at.localeCompare(b.created_at)
	);
}

/** Current state plus valid next handoffs. Database rules remain authoritative. */
export function maintenanceNextStates(status: string) {
	const next: Record<string, string[]> = {
		reported: ['triage', 'assigned'],
		triage: ['assigned'],
		assigned: ['in_progress'],
		in_progress: ['awaiting_approval'],
		awaiting_approval: ['in_progress', 'completed'],
		completed: ['closed'],
		closed: []
	};
	return [status, ...(next[status] ?? [])];
}
