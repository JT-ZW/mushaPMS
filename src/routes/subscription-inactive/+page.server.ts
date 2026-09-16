import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');
	const { data: membership } = await locals.supabase
		.from('organization_members')
		.select('organization_id, organizations(name, status)')
		.eq('user_id', user.id)
		.order('created_at', { ascending: true })
		.limit(1)
		.maybeSingle();
	const organization = Array.isArray(membership?.organizations)
		? membership.organizations[0]
		: membership?.organizations;
	if (organization?.status !== 'suspended') throw redirect(303, '/workspace');
	return { organizationName: organization.name ?? 'Your workspace' };
};
