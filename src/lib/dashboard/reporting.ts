export function reportRange(today: string, period: string, customStart = '', customEnd = '') {
	const validDate = (date: string) =>
		/^\d{4}-\d{2}-\d{2}$/.test(date) &&
		!Number.isNaN(Date.parse(date)) &&
		new Date(date).toISOString().slice(0, 10) === date;
	if (period === 'custom')
		return {
			start: customStart,
			end: customEnd,
			valid: validDate(customStart) && validDate(customEnd) && customStart <= customEnd
		};
	const [year, month] = today.split('-').map(Number);
	let startMonth = month - 1,
		endMonth = month;
	if (period === 'last_month') {
		startMonth = month - 2;
		endMonth = month - 1;
	}
	if (period === 'this_quarter') {
		startMonth = Math.floor((month - 1) / 3) * 3;
		endMonth = startMonth + 3;
	}
	if (period === 'this_year') {
		startMonth = 0;
		endMonth = 12;
	}
	return {
		start: new Date(Date.UTC(year, startMonth, 1)).toISOString().slice(0, 10),
		end: new Date(Date.UTC(year, endMonth, 0)).toISOString().slice(0, 10),
		valid: true
	};
}
