const validDate = (date: string) =>
	/^\d{4}-\d{2}-\d{2}$/.test(date) &&
	!Number.isNaN(Date.parse(date)) &&
	new Date(date).toISOString().slice(0, 10) === date;
export type LeaseDates = { status: string; start_date: string; end_date: string | null };
export function isCurrentLease(lease: LeaseDates, today: string) {
	return (
		['active', 'ending_soon'].includes(lease.status) &&
		lease.start_date <= today &&
		(!lease.end_date || lease.end_date >= today)
	);
}
export function expiresWithin(lease: LeaseDates, today: string, days = 90) {
	const end = new Date(`${today}T00:00:00Z`);
	end.setUTCDate(end.getUTCDate() + days);
	return (
		isCurrentLease(lease, today) &&
		!!lease.end_date &&
		lease.end_date <= end.toISOString().slice(0, 10)
	);
}
export function validateLeaseTerms(
	start: string,
	end: string,
	frequency: string,
	due: number | null,
	deposit: number | null,
	notice: number | null
) {
	if (!validDate(start)) return 'Enter a valid lease start date.';
	if (end && (!validDate(end) || end < start))
		return 'The end date must be on or after the start date.';
	if (!['monthly', 'weekly', 'quarterly', 'annual', 'custom'].includes(frequency))
		return 'Choose a valid billing frequency.';
	if (due !== null && (!Number.isInteger(due) || due < 1 || due > 31))
		return 'Rent due day must be a whole number from 1 to 31.';
	if (deposit !== null && deposit < 0) return 'Deposit cannot be negative.';
	if (notice !== null && (!Number.isInteger(notice) || notice < 0))
		return 'Notice period must be a non-negative whole number of days.';
	return null;
}
