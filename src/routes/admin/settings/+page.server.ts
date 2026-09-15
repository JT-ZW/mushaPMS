import { getPlatformMember, writeAuditLog } from '$lib/server/platform';
import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const access = await getPlatformMember(locals);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		return { access: 'denied' as const, settings: [] };
	}
	const { data: settings } = await locals.supabase
		.from('platform_settings')
		.select('setting_key, value, description, updated_at')
		.order('setting_key');
	return { access: 'granted' as const, member: access.member, settings: settings ?? [] };
};

export const actions = {
	updateSetting: async ({ request, locals }) => {
		const access = await getPlatformMember(locals, ['super_admin']);
		if (!access) return fail(403, { message: 'Only superadmins can change platform settings.' });
		const form = await request.formData();
		const key = String(form.get('setting_key') ?? '');
		const rawValue = String(form.get('value') ?? '').trim();
		if (!key || !rawValue) return fail(400, { message: 'A setting value is required.' });
		let value: string | number | boolean = rawValue;
		if (rawValue === 'true' || rawValue === 'false') value = rawValue === 'true';
		else if (/^\d+$/.test(rawValue)) value = Number(rawValue);
		const { error: updateError } = await locals.supabase
			.from('platform_settings')
			.upsert(
				{ setting_key: key, value, updated_by: access.user.id },
				{ onConflict: 'setting_key' }
			);
		if (updateError) return fail(400, { message: updateError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			action: 'platform_setting_updated',
			entityType: 'platform_setting',
			metadata: { setting_key: key }
		});
		return { success: true, message: 'Platform setting updated.' };
	}
};
