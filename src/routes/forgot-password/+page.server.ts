import { fail } from '@sveltejs/kit';

export const actions = {
	default: async ({ request, locals, url }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '')
			.trim()
			.toLowerCase();

		if (!email || !email.includes('@')) {
			return fail(400, { message: 'Enter the email address connected to your Musha account.' });
		}

		const redirectTo = new URL('/reset-password', url).toString();
		const { error } = await locals.supabase.auth.resetPasswordForEmail(email, { redirectTo });

		if (error) {
			return fail(400, {
				message: 'We could not send the reset email. Check the address and try again.'
			});
		}

		return {
			success: true,
			message: 'If an account exists for that address, a password reset link is on its way.'
		};
	}
};
