import { getPlatformMember } from '$lib/server/platform';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const access = await getPlatformMember(locals);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		return { access: 'denied' as const, organizations: [] };
	}

	const { data: organizations, count } = await locals.supabase
		.from('organizations')
		.select(
			'id, name, slug, status, currency_code, timezone, support_notes, handoff_at, created_at',
			{ count: 'exact' }
		)
		.order('created_at', { ascending: false });

	return {
		access: 'granted' as const,
		member: access.member,
		organizations: organizations ?? [],
		count: count ?? 0
	};
};
