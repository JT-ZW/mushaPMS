import { getPlatformMember } from '$lib/server/platform';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const access = await getPlatformMember(locals);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		return { access: 'denied' as const, logs: [], organizations: [] };
	}
	const [{ data: logs }, { data: organizations }] = await Promise.all([
		locals.supabase
			.from('audit_logs')
			.select(
				'id, organization_id, actor_user_id, action, entity_type, entity_id, metadata, created_at'
			)
			.order('created_at', { ascending: false })
			.limit(100),
		locals.supabase.from('organizations').select('id, name').order('name')
	]);
	return { access: 'granted' as const, logs: logs ?? [], organizations: organizations ?? [] };
};
