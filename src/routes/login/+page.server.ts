import { fail, redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '').trim();
		const password = String(formData.get('password') ?? '');

		if (!email || !password) return fail(400, { message: 'Email and password are required.' });

		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
		if (error)
			return fail(400, { message: 'We could not sign you in. Check your details and try again.' });

		const { user } = await locals.safeGetSession();
		if (!user)
			return fail(400, { message: 'We could not establish your session. Please try again.' });

		const { data: platformMember } = await locals.supabase
			.from('platform_members')
			.select('user_id')
			.eq('user_id', user.id)
			.maybeSingle();
		if (platformMember) throw redirect(303, '/admin');

		const { data: organizationMember } = await locals.supabase
			.from('organization_members')
			.select('organization_id, organizations(status)')
			.eq('user_id', user.id)
			.order('created_at', { ascending: true })
			.limit(1)
			.maybeSingle();
		const organization = Array.isArray(organizationMember?.organizations)
			? organizationMember.organizations[0]
			: organizationMember?.organizations;
		if (
			organizationMember &&
			organization &&
			!['suspended', 'archived'].includes(organization.status)
		)
			throw redirect(303, `/workspace/${organizationMember.organization_id}`);

		const { data: tenantPerson } = await locals.supabase
			.from('people')
			.select('id, organizations(status)')
			.eq('user_id', user.id)
			.eq('person_type', 'tenant')
			.maybeSingle();
		const tenantOrganization = Array.isArray(tenantPerson?.organizations)
			? tenantPerson.organizations[0]
			: tenantPerson?.organizations;
		if (
			tenantPerson &&
			tenantOrganization &&
			!['suspended', 'archived'].includes(tenantOrganization.status)
		)
			throw redirect(303, '/tenant');

		throw redirect(303, '/login');
	}
};
