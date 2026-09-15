import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { json } from '@sveltejs/kit';

/* eslint-disable @typescript-eslint/no-explicit-any */

const verifySignature = async (request: Request, body: string) => {
	if (!env.WHATSAPP_APP_SECRET) return false;
	const provided = request.headers.get('x-hub-signature-256') ?? '';
	const expected = `sha256=${createHmac('sha256', env.WHATSAPP_APP_SECRET).update(body).digest('hex')}`;
	return (
		provided.length === expected.length &&
		timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
	);
};

export const GET = ({ url }) => {
	const mode = url.searchParams.get('hub.mode');
	const token = url.searchParams.get('hub.verify_token');
	const challenge = url.searchParams.get('hub.challenge');
	if (mode === 'subscribe' && token && challenge && token === env.WHATSAPP_VERIFY_TOKEN) {
		return new Response(challenge, { status: 200 });
	}
	return new Response('Webhook verification failed', { status: 403 });
};

export const POST = async ({ request }) => {
	const body = await request.text();
	if (!(await verifySignature(request, body)))
		return json({ error: 'Invalid signature' }, { status: 401 });
	if (!env.SUPABASE_SERVICE_ROLE_KEY)
		return json({ error: 'Server integration is not configured' }, { status: 503 });
	let payload: any;
	try {
		payload = JSON.parse(body);
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}
	const admin = createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
	const messages = (payload.entry ?? []).flatMap((entry: any) =>
		(entry.changes ?? []).flatMap((change: any) => change.value?.messages ?? [])
	);
	for (const message of messages) {
		const phone = String(message.from ?? '').trim();
		if (!phone) continue;
		const { data: person } = await admin
			.from('people')
			.select('id, organization_id')
			.eq('phone', phone)
			.maybeSingle();
		const { data: conversation, error: conversationError } = await admin
			.from('whatsapp_conversations')
			.upsert(
				{
					phone_number: phone,
					person_id: person?.id ?? null,
					organization_id: person?.organization_id ?? null,
					last_message_at: new Date().toISOString(),
					status: 'open'
				},
				{ onConflict: 'phone_number' }
			)
			.select('id')
			.single();
		if (conversationError || !conversation) continue;
		await admin.from('whatsapp_messages').insert({
			conversation_id: conversation.id,
			direction: 'inbound',
			message_type: message.type ?? 'text',
			body: message.text?.body ?? null,
			provider_message_id: message.id ?? null,
			payload: message
		});
	}
	return json({ received: true });
};
