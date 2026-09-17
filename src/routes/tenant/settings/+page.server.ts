import { fail, redirect } from '@sveltejs/kit';
import { writeAuditLog } from '$lib/server/platform';

const value = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

export const load = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');
	const { data: person } = await locals.supabase
		.from('people')
		.select('id, organization_id, first_name, last_name, email, user_id')
		.eq('user_id', user.id)
		.eq('person_type', 'tenant')
		.maybeSingle();
	if (!person) throw redirect(303, '/login');
	const { data: organization } = await locals.supabase
		.from('organizations')
		.select('id, name, status, currency_code')
		.eq('id', person.organization_id)
		.maybeSingle();
	if (!organization || ['suspended', 'archived'].includes(organization.status))
		throw redirect(303, '/subscription-inactive');
	return { user, person, organization };
};

export const actions = {
	changePassword: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { message: 'Please sign in again.' });
		const form = await request.formData();
		const newPassword = value(form, 'new_password');
		const confirmation = value(form, 'confirm_password');
		if (newPassword.length < 8)
			return fail(400, { message: 'Passwords must contain at least 8 characters.' });
		if (newPassword !== confirmation)
			return fail(400, { message: 'The passwords do not match.' });
		const changedAt = new Date().toISOString();
		const { error: authError } = await locals.supabase.auth.updateUser({
			password: newPassword,
			data: { ...(user.user_metadata ?? {}), must_change_password: false, password_changed_at: changedAt }
		});
		if (authError) return fail(400, { message: authError.message });
		const { data: person } = await locals.supabase
			.from('people')
			.select('id, organization_id')
			.eq('user_id', user.id)
			.eq('person_type', 'tenant')
			.maybeSingle();
		if (person) {
			await writeAuditLog(locals, {
				actorUserId: user.id,
				organizationId: person.organization_id,
				action: 'tenant_password_changed',
				entityType: 'auth_user',
				entityId: user.id,
				metadata: { changed_at: changedAt }
			});
		}
		return { success: true, message: 'Your password was changed successfully.' };
	}
};
