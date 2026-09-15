import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { getPlatformMember, writeAuditLog } from '$lib/server/platform';
import { createClient } from '@supabase/supabase-js';
import { fail, redirect } from '@sveltejs/kit';

const roles = ['super_admin', 'support', 'implementation', 'billing', 'read_only'];

export const load = async ({ locals }) => {
	const access = await getPlatformMember(locals, ['super_admin']);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		return { access: 'denied' as const, members: [] };
	}
	const { data: members } = await locals.supabase
		.from('platform_members')
		.select('user_id, role, display_name, created_at, updated_at')
		.order('created_at');
	return { access: 'granted' as const, members: members ?? [] };
};

export const actions = {
	invite: async ({ request, locals }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Only superadmins can manage the platform team.' });
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const displayName = String(form.get('display_name') ?? '').trim();
		const role = String(form.get('role') ?? 'support');
		if (!email.includes('@') || !displayName)
			return fail(400, { message: 'Name and valid email are required.' });
		if (!roles.includes(role)) return fail(400, { message: 'Invalid platform role.' });
		if (!env.SUPABASE_SERVICE_ROLE_KEY)
			return fail(500, { message: 'Server invitation credentials are not configured.' });
		const adminClient = createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
			auth: { autoRefreshToken: false, persistSession: false }
		});
		const { data: invitation, error: invitationError } =
			await adminClient.auth.admin.inviteUserByEmail(email, {
				data: { platform_role: role, display_name: displayName }
			});
		if (invitationError || !invitation.user)
			return fail(502, { message: invitationError?.message ?? 'The platform invitation failed.' });
		const { error: insertError } = await adminClient
			.from('platform_members')
			.insert({ user_id: invitation.user.id, role, display_name: displayName });
		if (insertError)
			return fail(502, {
				message: `Invitation sent, but platform access could not be assigned: ${insertError.message}`
			});
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			action: 'platform_member_invited',
			entityType: 'platform_member',
			metadata: { email, role }
		});
		return { success: true, message: `Invitation sent to ${email}.` };
	},
	remove: async ({ request, locals }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Only superadmins can manage the platform team.' });
		const form = await request.formData();
		const userId = String(form.get('user_id') ?? '');
		if (userId === access.user.id)
			return fail(400, { message: 'You cannot remove your own platform access.' });
		const { error: deleteError } = await locals.supabase
			.from('platform_members')
			.delete()
			.eq('user_id', userId);
		if (deleteError) return fail(400, { message: deleteError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			action: 'platform_member_removed',
			entityType: 'platform_member',
			entityId: userId
		});
		return { success: true, message: 'Platform access removed.' };
	}
};
