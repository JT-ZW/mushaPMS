import { getWorkspaceAccess } from '$lib/server/workspace';

const escapeHtml = (value: unknown) =>
	String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');

export const GET = async ({ locals, params }) => {
	const access = await getWorkspaceAccess(locals, params.id);
	if (!access) return new Response('Not found', { status: 404 });
	const [{ data: document }, { data: settings }] = await Promise.all([
		locals.supabase
			.from('billing_documents')
			.select(
				'document_type, document_number, issue_date, due_date, status, currency_code, total_amount, line_items, notes, person_id, tenancy_id'
			)
			.eq('id', params.documentId)
			.eq('organization_id', params.id)
			.maybeSingle(),
		locals.supabase
			.from('organization_workspace_settings')
			.select(
				'legal_name, contact_email, contact_phone, address_line_1, city, country, receipt_footer, logo_path'
			)
			.eq('organization_id', params.id)
			.maybeSingle()
	]);
	if (!document) return new Response('Document not found', { status: 404 });
	const logoUrl = settings?.logo_path
		? (
				await locals.supabase.storage
					.from('organization-assets')
					.createSignedUrl(settings.logo_path, 600)
			).data?.signedUrl
		: null;
	const items = Array.isArray(document.line_items) ? document.line_items : [];
	const rows = items
		.map(
			(item: { description?: string; quantity?: number; amount?: number }) =>
				`<tr><td>${escapeHtml(item.description)}</td><td>${escapeHtml(item.quantity ?? 1)}</td><td>${escapeHtml(document.currency_code)} ${escapeHtml(Number(item.amount ?? 0).toFixed(2))}</td></tr>`
		)
		.join('');
	const heading = document.document_type === 'receipt' ? 'Payment receipt' : 'Rental invoice';
	return new Response(
		`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(document.document_number)} · ${escapeHtml(access.organization.name)}</title><style>body{font-family:Arial,sans-serif;color:#123f3b;background:#f5f7f3;margin:0;padding:40px}.sheet{max-width:760px;margin:auto;background:#fff;padding:46px;border-radius:18px;box-shadow:0 16px 50px #123f3b18}header{display:flex;justify-content:space-between;gap:30px;border-bottom:1px solid #dfe9e1;padding-bottom:28px}header img{width:90px;height:90px;object-fit:contain}.muted{color:#6e8a7c;font-size:13px;line-height:1.6}.number{text-align:right}h1{font-size:34px;letter-spacing:-.06em;margin:30px 0 6px}table{width:100%;border-collapse:collapse;margin:34px 0}th,td{text-align:left;padding:13px 8px;border-bottom:1px solid #e6eee7}th:last-child,td:last-child{text-align:right}.total{text-align:right;font-size:23px;font-weight:700}.footer{margin-top:40px;border-top:1px solid #dfe9e1;padding-top:18px}@media print{body{padding:0;background:#fff}.sheet{box-shadow:none;max-width:none}}</style></head><body><main class="sheet"><header><div>${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Organization logo">` : ''}<h2>${escapeHtml(settings?.legal_name || access.organization.name)}</h2><p class="muted">${escapeHtml(settings?.address_line_1)}<br>${escapeHtml(settings?.city)}, ${escapeHtml(settings?.country)}<br>${escapeHtml(settings?.contact_email)} · ${escapeHtml(settings?.contact_phone)}</p></div><div class="number"><strong>${escapeHtml(heading)}</strong><p class="muted">${escapeHtml(document.document_number)}<br>Issued ${escapeHtml(document.issue_date)}${document.due_date ? `<br>Due ${escapeHtml(document.due_date)}` : ''}<br>${escapeHtml(document.status)}</p></div></header><h1>${escapeHtml(heading)}</h1><p class="muted">${escapeHtml(access.organization.name)} · ${escapeHtml(document.currency_code)}</p><table><thead><tr><th>Description</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Total: ${escapeHtml(document.currency_code)} ${escapeHtml(Number(document.total_amount).toFixed(2))}</div>${document.notes ? `<p class="muted">${escapeHtml(document.notes)}</p>` : ''}<p class="footer muted">${escapeHtml(settings?.receipt_footer || 'Thank you for your business.')}</p></main></body></html>`,
		{ headers: { 'content-type': 'text/html; charset=utf-8' } }
	);
};
