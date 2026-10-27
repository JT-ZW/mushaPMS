import { json, error } from '@sveltejs/kit';
import { getWorkspaceAccess } from '$lib/server/workspace';
export const GET = async ({ locals, params, url }) => {
	const access = await getWorkspaceAccess(locals, params.id);
	if (!access) throw error(403, 'Workspace access required');
	const limit = Math.min(200, Math.max(25, Number(url.searchParams.get('limit')) || 50));
	const [maintenance, payments, activity, attention] = await Promise.all([
		locals.supabase
			.from('maintenance_requests')
			.select('id,title,status,priority,created_at,updated_at')
			.eq('organization_id', params.id)
			.order('updated_at', { ascending: false })
			.limit(limit),
		locals.supabase
			.from('payments')
			.select('id,amount,created_at,method')
			.eq('organization_id', params.id)
			.order('created_at', { ascending: false })
			.limit(limit),
		locals.supabase
			.from('audit_logs')
			.select('id,action,entity_type,created_at')
			.eq('organization_id', params.id)
			.order('created_at', { ascending: false })
			.limit(limit),
		locals.supabase.rpc('workflow_attention', { target_org: params.id })
	]);
	if (maintenance.error || payments.error || activity.error || attention.error)
		throw error(503, 'Notifications could not be loaded');
	const items = [
		...((attention.data ?? []) as {
			id: string;
			title: string;
			detail: string;
			at: string;
			section: string;
		}[]),
		...(maintenance.data ?? []).map((row) => ({
			id: `maintenance:${row.id}:${row.updated_at}`,
			title: row.title,
			detail: `Maintenance · ${row.status.replaceAll('_', ' ')} · ${row.priority}`,
			at: row.updated_at,
			section: 'maintenance'
		})),
		...(payments.data ?? []).map((row) => ({
			id: `payment:${row.id}`,
			title: 'Payment recorded',
			detail: `${access.organization.currency_code} ${Number(row.amount).toFixed(2)} · ${row.method.replaceAll('_', ' ')}`,
			at: row.created_at,
			section: 'finance'
		})),
		...(activity.data ?? [])
			.filter(
				(row) => !row.entity_type.includes('maintenance') && !row.entity_type.includes('payment')
			)
			.map((row) => ({
				id: `activity:${row.id}`,
				title: row.action.replaceAll('_', ' '),
				detail: row.entity_type.replaceAll('_', ' '),
				at: row.created_at,
				section: row.entity_type.includes('charge')
					? 'finance'
					: row.entity_type.includes('tenanc') || row.entity_type.includes('person')
						? 'people'
						: row.entity_type.includes('property') || row.entity_type.includes('space')
							? 'properties'
							: 'settings'
			}))
	]
		.sort((a, b) => b.at.localeCompare(a.at))
		.slice(0, limit);
	return json(
		{ items, userId: access.user.id },
		{ headers: { 'cache-control': 'private, no-store' } }
	);
};
