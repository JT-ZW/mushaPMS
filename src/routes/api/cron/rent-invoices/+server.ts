import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';

export const POST = async ({ request }) => {
	const authorization = request.headers.get('authorization');
	const expected = env.CRON_SECRET;
	if (!expected || authorization !== `Bearer ${expected}`)
		return json({ error: 'Unauthorized' }, { status: 401 });
	if (!env.SUPABASE_SERVICE_ROLE_KEY)
		return json({ error: 'Supabase service role is not configured.' }, { status: 503 });

	const admin = createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
	const { data, error } = await admin.rpc('generate_recurring_rent_invoices', {
		run_on: new Date().toISOString().slice(0, 10)
	});
	if (error) return json({ error: error.message }, { status: 500 });
	return json({ success: true, generated: Number(data ?? 0) });
};
