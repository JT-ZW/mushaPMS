export const workspaceModuleLabels = {
	residential: 'Residential',
	commercial: 'Commercial',
	student: 'Student accommodation',
	short_stay: 'Short stay / Airbnb'
} as const;

export const getWorkspaceAccess = async (locals: App.Locals, organizationId: string) => {
	const { user } = await locals.safeGetSession();
	if (!user) return null;

	const { data: memberRecord } = await locals.supabase
		.from('organization_members')
		.select(
			'organization_id, user_id, role, organizations(id, name, slug, status, currency_code, timezone)'
		)
		.eq('organization_id', organizationId)
		.eq('user_id', user.id)
		.maybeSingle();

	let membership = memberRecord;
	let supportMode: {
		id: string;
		accessLevel: 'read_only' | 'operator';
		reason: string;
		expiresAt: string;
	} | null = null;
	let organization = Array.isArray(memberRecord?.organizations)
		? memberRecord.organizations[0]
		: memberRecord?.organizations;

	// A support session is a real, expiring read context. It is intentionally
	// represented as a viewer membership so existing mutation guards cannot be
	// bypassed while support mode is active.
	if (!membership || !organization) {
		const { data: session } = await locals.supabase
			.from('support_sessions')
			.select(
				'id, organization_id, access_level, reason, expires_at, organizations(id, name, slug, status, currency_code, timezone)'
			)
			.eq('organization_id', organizationId)
			.eq('started_by', user.id)
			.is('ended_at', null)
			.gt('expires_at', new Date().toISOString())
			.order('started_at', { ascending: false })
			.limit(1)
			.maybeSingle();
		if (session) {
			organization = Array.isArray(session.organizations)
				? session.organizations[0]
				: session.organizations;
			if (organization) {
				membership = {
					organization_id: organizationId,
					user_id: user.id,
					role: 'viewer',
					organizations: organization
				} as unknown as typeof memberRecord;
				supportMode = {
					id: session.id,
					accessLevel: session.access_level,
					reason: session.reason,
					expiresAt: session.expires_at
				};
			}
		}
	}

	if (!membership || !organization || ['suspended', 'archived'].includes(organization.status))
		return null;

	const { data: modules } = await locals.supabase
		.from('organization_modules')
		.select('module_key')
		.eq('organization_id', organizationId)
		.order('module_key');

	return { user, membership, organization, modules: modules ?? [], supportMode };
};

export const canManageWorkspace = (role: string) => ['owner', 'admin', 'manager'].includes(role);
export const canManageFinance = (role: string) =>
	['owner', 'admin', 'manager', 'finance'].includes(role);
export const canManageMaintenance = (role: string) =>
	['owner', 'admin', 'manager', 'maintenance'].includes(role);
