export function coordinates(property: {
	latitude: number | string | null;
	longitude: number | string | null;
}): [number, number] | null {
	if (
		property.latitude === null ||
		property.longitude === null ||
		String(property.latitude).trim() === '' ||
		String(property.longitude).trim() === ''
	)
		return null;
	const lat = Number(property.latitude),
		lng = Number(property.longitude);
	return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
		? [lat, lng]
		: null;
}
export function rentableSpaces<
	T extends { id: string; property_id: string; parent_space_id?: string | null; status: string }
>(properties: { id: string; status: string }[], spaces: T[]): T[] {
	const activeIds = new Set(
		properties.filter((row) => row.status === 'active').map((row) => row.id)
	);
	const byId = new Map(spaces.map((row) => [row.id, row]));
	const active = spaces.filter((row) => {
		if (row.status === 'inactive' || !activeIds.has(row.property_id)) return false;
		let parent = row.parent_space_id;
		const seen = new Set([row.id]);
		while (parent) {
			if (seen.has(parent)) return false;
			seen.add(parent);
			const ancestor = byId.get(parent);
			if (!ancestor || ancestor.status === 'inactive') return false;
			parent = ancestor.parent_space_id;
		}
		return true;
	});
	const parents = new Set(active.map((row) => row.parent_space_id));
	return active.filter((row) => !parents.has(row.id));
}
