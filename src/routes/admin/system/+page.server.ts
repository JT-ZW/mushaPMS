import { env } from '$env/dynamic/private';
import { getPlatformMember } from '$lib/server/platform';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const access = await getPlatformMember(locals);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		return { access: 'denied' as const, checks: [], alerts: [] };
	}
	const [
		{ count: organizationCount, error: organizationError },
		{ count: openAlerts },
		{ count: failedImports },
		{ count: failedInvitations },
		{ count: queuedNotifications },
		{ data: alerts }
	] = await Promise.all([
		locals.supabase.from('organizations').select('id', { count: 'exact', head: true }),
		locals.supabase
			.from('platform_alerts')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'open'),
		locals.supabase
			.from('import_jobs')
			.select('id', { count: 'exact', head: true })
			.in('status', ['failed', 'completed_with_errors']),
		locals.supabase
			.from('organization_invitations')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'failed'),
		locals.supabase
			.from('notification_outbox')
			.select('id', { count: 'exact', head: true })
			.in('status', ['queued', 'failed']),
		locals.supabase
			.from('platform_alerts')
			.select('id, title, detail, severity, status, created_at, organizations(name)')
			.eq('status', 'open')
			.order('created_at', { ascending: false })
			.limit(10)
	]);
	return {
		access: 'granted' as const,
		member: access.member,
		checks: [
			{
				label: 'Supabase database',
				status: organizationError ? 'attention' : 'operational',
				detail: organizationError
					? 'The organization query returned an error.'
					: `${organizationCount ?? 0} organizations are reachable.`
			},
			{
				label: 'Service invitations',
				status: env.SUPABASE_SERVICE_ROLE_KEY ? 'operational' : 'attention',
				detail: env.SUPABASE_SERVICE_ROLE_KEY
					? 'Invitation credentials are configured.'
					: 'Invitation credentials are missing.'
			},
			{
				label: 'Open platform alerts',
				status: (openAlerts ?? 0) > 0 ? 'attention' : 'operational',
				detail: `${openAlerts ?? 0} open platform alerts.`
			},
			{
				label: 'Import pipeline',
				status: (failedImports ?? 0) > 0 ? 'attention' : 'operational',
				detail: `${failedImports ?? 0} failed or partial import jobs.`
			},
			{
				label: 'Invitation delivery',
				status: (failedInvitations ?? 0) > 0 ? 'attention' : 'operational',
				detail: `${failedInvitations ?? 0} failed invitations.`
			},
			{
				label: 'Notification outbox',
				status: (queuedNotifications ?? 0) > 0 ? 'attention' : 'operational',
				detail: `${queuedNotifications ?? 0} queued or failed notifications await a provider worker.`
			},
			{
				label: 'WhatsApp webhook',
				status: env.WHATSAPP_VERIFY_TOKEN && env.WHATSAPP_APP_SECRET ? 'operational' : 'attention',
				detail:
					env.WHATSAPP_VERIFY_TOKEN && env.WHATSAPP_APP_SECRET
						? 'Signed webhook verification is configured.'
						: 'Add WhatsApp verify token and app secret before enabling the tenant chatbot.'
			}
		],
		alerts: alerts ?? []
	};
};
