import { getPlatformMember, writeAuditLog } from '$lib/server/platform';
import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const access = await getPlatformMember(locals);
	if (!access) {
		const { user } = await locals.safeGetSession();
		if (!user) throw redirect(303, '/login');
		return { access: 'denied' as const, sessions: [], organizations: [] };
	}
	const [{ data: sessions }, { data: organizations }] = await Promise.all([
		locals.supabase
			.from('support_sessions')
			.select(
				'id, organization_id, access_level, reason, started_at, expires_at, ended_at, started_by'
			)
			.order('started_at', { ascending: false })
			.limit(50),
		locals.supabase.from('organizations').select('id, name, status').order('name')
	]);
	const [{ data: tickets }, { data: platformTeam }] = await Promise.all([
		locals.supabase
			.from('support_tickets')
			.select(
				'id, organization_id, subject, description, category, priority, status, assigned_to, created_at, updated_at, organizations(name)'
			)
			.order('created_at', { ascending: false })
			.limit(50),
		locals.supabase
			.from('platform_members')
			.select('user_id, display_name, role')
			.order('display_name')
	]);
	return {
		access: 'granted' as const,
		currentUserId: access.user.id,
		member: access.member,
		sessions: sessions ?? [],
		organizations: organizations ?? [],
		tickets: tickets ?? [],
		platformTeam: platformTeam ?? []
	};
};

export const actions = {
	createTicket: async ({ request, locals }) => {
		const access = await getPlatformMember(locals);
		if (!access) return fail(403, { message: 'Platform access is required.' });
		const form = await request.formData();
		const organizationId = String(form.get('organization_id') ?? '');
		const subject = String(form.get('subject') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const category = String(form.get('category') ?? 'general');
		const priority = String(form.get('priority') ?? 'normal');
		if (!organizationId || !subject || description.length < 10)
			return fail(400, {
				message: 'Choose an organization and describe the request in at least 10 characters.'
			});
		const { data: ticket, error: insertError } = await locals.supabase
			.from('support_tickets')
			.insert({
				organization_id: organizationId,
				subject,
				description,
				category,
				priority,
				requester_user_id: access.user.id,
				assigned_to: access.user.id
			})
			.select('id')
			.single();
		if (insertError || !ticket)
			return fail(400, { message: insertError?.message ?? 'Support ticket could not be created.' });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId,
			action: 'support_ticket_created',
			entityType: 'support_ticket',
			entityId: ticket.id,
			metadata: { subject, priority, category }
		});
		return { success: true, message: 'Support ticket created.' };
	},
	updateTicket: async ({ request, locals }) => {
		const access = await getPlatformMember(locals);
		if (!access) return fail(403, { message: 'Platform access is required.' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const status = String(form.get('status') ?? 'open');
		const priority = String(form.get('priority') ?? 'normal');
		const assignedTo = String(form.get('assigned_to') ?? '').trim() || null;
		if (!id || !['open', 'in_progress', 'waiting_on_client', 'resolved', 'closed'].includes(status))
			return fail(400, { message: 'Choose a valid ticket status.' });
		const { error: updateError } = await locals.supabase
			.from('support_tickets')
			.update({
				status,
				priority,
				assigned_to: assignedTo,
				resolved_at: ['resolved', 'closed'].includes(status) ? new Date().toISOString() : null
			})
			.eq('id', id);
		if (updateError) return fail(400, { message: updateError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			action: 'support_ticket_updated',
			entityType: 'support_ticket',
			entityId: id,
			metadata: { status, priority, assigned_to: assignedTo }
		});
		return { success: true, message: 'Support ticket updated.' };
	},
	addMessage: async ({ request, locals }) => {
		const access = await getPlatformMember(locals);
		if (!access) return fail(403, { message: 'Platform access is required.' });
		const form = await request.formData();
		const ticketId = String(form.get('ticket_id') ?? '');
		const body = String(form.get('body') ?? '').trim();
		const visibility = String(form.get('visibility') ?? 'internal');
		if (!ticketId || body.length < 2)
			return fail(400, { message: 'Write a message before saving.' });
		const { error: insertError } = await locals.supabase
			.from('support_ticket_messages')
			.insert({ ticket_id: ticketId, author_user_id: access.user.id, body, visibility });
		if (insertError) return fail(400, { message: insertError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			action: 'support_ticket_message_added',
			entityType: 'support_ticket',
			entityId: ticketId,
			metadata: { visibility }
		});
		return { success: true, message: 'Ticket note added.' };
	},
	start: async ({ request, locals }) => {
		const access = await getPlatformMember(locals);
		if (!access) return fail(403, { message: 'Platform access is required.' });
		const form = await request.formData();
		const organizationId = String(form.get('organization_id') ?? '');
		const reason = String(form.get('reason') ?? '').trim();
		const requestedLevel = String(form.get('access_level') ?? 'read_only');
		const accessLevel =
			access.member.role === 'super_admin' && requestedLevel === 'operator'
				? 'operator'
				: 'read_only';
		if (!organizationId || reason.length < 8)
			return fail(400, { message: 'Choose an organization and provide a support reason.' });
		const { error: insertError } = await locals.supabase.from('support_sessions').insert({
			organization_id: organizationId,
			started_by: access.user.id,
			access_level: accessLevel,
			reason
		});
		if (insertError) return fail(400, { message: insertError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			organizationId,
			action: 'support_session_started',
			entityType: 'support_session',
			metadata: { access_level: accessLevel, reason }
		});
		return { success: true, message: 'Support session started.' };
	},
	end: async ({ request, locals }) => {
		const access = await getPlatformMember(locals);
		if (!access) return fail(403, { message: 'Platform access is required.' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const { error: updateError } = await locals.supabase
			.from('support_sessions')
			.update({ ended_at: new Date().toISOString() })
			.eq('id', id)
			.is('ended_at', null);
		if (updateError) return fail(400, { message: updateError.message });
		await writeAuditLog(locals, {
			actorUserId: access.user.id,
			action: 'support_session_ended',
			entityType: 'support_session',
			entityId: id
		});
		return { success: true, message: 'Support session ended.' };
	}
};
