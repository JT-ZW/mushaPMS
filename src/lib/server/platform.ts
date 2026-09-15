export type PlatformRole = 'super_admin' | 'support' | 'implementation' | 'billing' | 'read_only';

export type OnboardingTemplate = 'residential' | 'commercial' | 'student' | 'short_stay';

export const onboardingTemplates: Record<
	OnboardingTemplate,
	{
		label: string;
		tasks: {
			key: string;
			title: string;
			description: string;
			phase: 'setup' | 'data' | 'handoff';
		}[];
	}
> = {
	residential: {
		label: 'Traditional residential',
		tasks: [
			{
				key: 'client_invited',
				title: 'Client administrator invited',
				description: 'Send the initial workspace invitation.',
				phase: 'setup'
			},
			{
				key: 'property_added',
				title: 'Property portfolio added',
				description: 'Add the client’s first property records.',
				phase: 'setup'
			},
			{
				key: 'spaces_configured',
				title: 'Units configured',
				description: 'Add rentable units and their rent rules.',
				phase: 'setup'
			},
			{
				key: 'rent_rules_configured',
				title: 'Rent rules configured',
				description: 'Confirm billing frequency, due dates, and deposits.',
				phase: 'data'
			},
			{
				key: 'people_imported',
				title: 'Tenant records imported',
				description: 'Import or create tenants and contacts.',
				phase: 'data'
			},
			{
				key: 'training_completed',
				title: 'Client training completed',
				description: 'Walk the client through their daily workflow.',
				phase: 'handoff'
			},
			{
				key: 'client_handoff',
				title: 'Client handoff completed',
				description: 'Confirm readiness and move the workspace to active.',
				phase: 'handoff'
			}
		]
	},
	commercial: {
		label: 'Commercial property',
		tasks: [
			{
				key: 'client_invited',
				title: 'Client administrator invited',
				description: 'Send the initial workspace invitation.',
				phase: 'setup'
			},
			{
				key: 'property_added',
				title: 'Commercial properties added',
				description: 'Add buildings, offices, shops, or sites.',
				phase: 'setup'
			},
			{
				key: 'spaces_configured',
				title: 'Leasable spaces configured',
				description: 'Configure offices, shops, and shared areas.',
				phase: 'setup'
			},
			{
				key: 'rent_rules_configured',
				title: 'Lease and charge rules configured',
				description: 'Confirm rent, service charges, and billing dates.',
				phase: 'data'
			},
			{
				key: 'people_imported',
				title: 'Occupier records imported',
				description: 'Import companies, contacts, and lease parties.',
				phase: 'data'
			},
			{
				key: 'training_completed',
				title: 'Client training completed',
				description: 'Walk the client through their daily workflow.',
				phase: 'handoff'
			},
			{
				key: 'client_handoff',
				title: 'Client handoff completed',
				description: 'Confirm readiness and move the workspace to active.',
				phase: 'handoff'
			}
		]
	},
	student: {
		label: 'Student accommodation',
		tasks: [
			{
				key: 'client_invited',
				title: 'Client administrator invited',
				description: 'Send the initial workspace invitation.',
				phase: 'setup'
			},
			{
				key: 'property_added',
				title: 'Residence added',
				description: 'Add the student residence and buildings.',
				phase: 'setup'
			},
			{
				key: 'spaces_configured',
				title: 'Rooms and beds configured',
				description: 'Configure rooms, beds, and shared spaces.',
				phase: 'setup'
			},
			{
				key: 'rent_rules_configured',
				title: 'Term billing configured',
				description: 'Confirm term dates, deposits, and payment rules.',
				phase: 'data'
			},
			{
				key: 'people_imported',
				title: 'Student records imported',
				description: 'Import students, guardians, and contacts.',
				phase: 'data'
			},
			{
				key: 'training_completed',
				title: 'Client training completed',
				description: 'Walk the client through their daily workflow.',
				phase: 'handoff'
			},
			{
				key: 'client_handoff',
				title: 'Client handoff completed',
				description: 'Confirm readiness and move the workspace to active.',
				phase: 'handoff'
			}
		]
	},
	short_stay: {
		label: 'Short stay / Airbnb',
		tasks: [
			{
				key: 'client_invited',
				title: 'Client administrator invited',
				description: 'Send the initial workspace invitation.',
				phase: 'setup'
			},
			{
				key: 'property_added',
				title: 'Listings added',
				description: 'Add listings and their operating locations.',
				phase: 'setup'
			},
			{
				key: 'spaces_configured',
				title: 'Rooms and listings configured',
				description: 'Configure rentable rooms, listings, and amenities.',
				phase: 'setup'
			},
			{
				key: 'rent_rules_configured',
				title: 'Rates and charge rules configured',
				description: 'Confirm rates, deposits, fees, and cleaning charges.',
				phase: 'data'
			},
			{
				key: 'people_imported',
				title: 'Guest and supplier records imported',
				description: 'Import operating contacts and supplier records.',
				phase: 'data'
			},
			{
				key: 'training_completed',
				title: 'Client training completed',
				description: 'Walk the client through their daily workflow.',
				phase: 'handoff'
			},
			{
				key: 'client_handoff',
				title: 'Client handoff completed',
				description: 'Confirm readiness and move the workspace to active.',
				phase: 'handoff'
			}
		]
	}
};

export const seedOnboardingTasks = async (
	locals: App.Locals,
	organizationId: string,
	template: OnboardingTemplate = 'residential'
) => {
	const tasks = onboardingTemplates[template]?.tasks ?? onboardingTemplates.residential.tasks;
	await locals.supabase.from('organization_onboarding_tasks').insert(
		tasks.map((task, index) => ({
			organization_id: organizationId,
			task_key: task.key,
			title: task.title,
			description: task.description,
			phase: task.phase,
			position: index
		}))
	);
};

export const getPlatformMember = async (locals: App.Locals, roles?: PlatformRole[]) => {
	const { user } = await locals.safeGetSession();
	if (!user) return null;

	let query = locals.supabase
		.from('platform_members')
		.select('user_id, role, display_name')
		.eq('user_id', user.id);
	if (roles?.length) query = query.in('role', roles);

	const { data } = await query.maybeSingle();
	return data
		? { user, member: data as { user_id: string; role: PlatformRole; display_name: string | null } }
		: null;
};

export const getCount = async (query: PromiseLike<{ count: number | null; error: unknown }>) => {
	const { count } = await query;
	return count ?? 0;
};

export const writeAuditLog = async (
	locals: App.Locals,
	input: {
		organizationId?: string | null;
		actorUserId: string;
		action: string;
		entityType: string;
		entityId?: string | null;
		metadata?: Record<string, unknown>;
	}
) => {
	await locals.supabase.from('audit_logs').insert({
		organization_id: input.organizationId ?? null,
		actor_user_id: input.actorUserId,
		action: input.action,
		entity_type: input.entityType,
		entity_id: input.entityId ?? null,
		metadata: input.metadata ?? {}
	});
};
