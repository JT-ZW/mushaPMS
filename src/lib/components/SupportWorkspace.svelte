<script lang="ts">
	type Ticket = {
		id: string;
		subject: string;
		description: string;
		category: string;
		priority: string;
		status: string;
		created_at: string;
		updated_at: string;
		resolved_at: string | null;
	};
	type Attachment = {
		id: string;
		ticket_id: string;
		file_name: string;
		mime_type: string | null;
		file_size: number | null;
		url: string | null;
	};

	let { tickets, attachments, form }: { tickets: Ticket[]; attachments: Attachment[]; form?: { success?: boolean; message?: string } | null } = $props();
	const titleCase = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
	const attachmentsFor = (ticketId: string) => attachments.filter((attachment) => attachment.ticket_id === ticketId);
</script>

<div class="support-grid">
	<section class="support-panel request-panel">
		<div class="panel-heading">
			<div>
				<p class="eyebrow">New request</p>
				<h2>How can we help?</h2>
				<p>Send your request directly to the Musha support team.</p>
			</div>
			<span class="plus">+</span>
		</div>
		<form method="POST" action="?/createSupportTicket" enctype="multipart/form-data">
			<label>Subject<input name="subject" required maxlength="160" placeholder="e.g. Need help importing tenant balances" /></label>
			<label>Request details<textarea name="description" required minlength="10" rows="5" placeholder="Describe the issue, relevant context, and what you need help with."></textarea></label>
			<div class="fields">
				<label>Category<select name="category"><option value="general">General</option><option value="access">Access</option><option value="billing">Billing</option><option value="setup">Setup</option><option value="maintenance">Maintenance</option><option value="data">Data & imports</option><option value="bug">Something is not working</option></select></label>
				<label>Priority<select name="priority"><option value="low">Low</option><option value="normal" selected>Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
			</div>
			<label class="attachment-input"><span>Optional screenshots or files <small>JPG, PNG, WebP, or PDF · up to 5 files, 10 MB each</small></span><input name="attachments" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple /></label>
			<button class="primary" type="submit">Send support ticket <span>→</span></button>
		</form>
	</section>

	<section class="support-panel ticket-panel">
		<div class="panel-heading">
			<div><p class="eyebrow">Your requests</p><h2>Support tickets</h2></div>
			<span class="count">{tickets.length}</span>
		</div>
		{#if tickets.length === 0}
			<div class="empty"><span>✓</span><strong>No support tickets yet</strong><p>When you contact Musha, you can track the request here.</p></div>
		{:else}
			<div class="ticket-list">
				{#each tickets as ticket (ticket.id)}
					<article class="ticket">
						<div><div class="ticket-top"><strong>{ticket.subject}</strong><span class="priority {ticket.priority}">{ticket.priority}</span></div><p>{ticket.description}</p><small>{titleCase(ticket.category)} · Sent {new Date(ticket.created_at).toLocaleDateString()}</small>{#if attachmentsFor(ticket.id).length}<div class="attachments">{#each attachmentsFor(ticket.id) as attachment (attachment.id)}<a href={attachment.url ?? '#'} target="_blank" rel="noreferrer">{attachment.mime_type?.startsWith('image/') ? '▧' : '↗'} {attachment.file_name}</a>{/each}</div>{/if}</div>
						<span class="status {ticket.status}">{titleCase(ticket.status)}</span>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.support-grid { display: grid; grid-template-columns: minmax(300px, .88fr) minmax(380px, 1.12fr); gap: 20px; align-items: start; }
	.support-panel { background: #fff; border: 1px solid #dbe7df; border-radius: 16px; padding: 28px; }
	.panel-heading, .ticket-top, .ticket { display: flex; justify-content: space-between; gap: 16px; }
	.panel-heading { align-items: start; margin-bottom: 24px; }
	.eyebrow { color: #6b9485; font-size: 11px; font-weight: 800; letter-spacing: .14em; margin: 0 0 8px; text-transform: uppercase; }
	h2 { color: var(--musha-ink); font-size: 25px; letter-spacing: -.055em; margin: 0; }
	.panel-heading p:not(.eyebrow), .ticket p, .empty p { color: #789287; line-height: 1.5; margin: 7px 0 0; }
	.plus, .count { align-items: center; background: #edf5d9; border-radius: 13px; color: #528156; display: inline-flex; font-size: 24px; height: 52px; justify-content: center; width: 52px; }
	.count { font-size: 14px; }
	form { display: grid; gap: 16px; }
	label { color: #466c5e; display: grid; font-size: 13px; font-weight: 700; gap: 7px; }
	input, textarea, select { background: #fbfcfa; border: 1px solid #d7e5dc; border-radius: 8px; box-sizing: border-box; color: var(--musha-ink); font: inherit; font-size: 14px; font-weight: 500; padding: 13px 14px; width: 100%; }
	textarea { resize: vertical; }
	.fields { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
	.attachment-input { background: #f8fbf7; border: 1px dashed #b7d0bf; border-radius: 8px; padding: 11px 13px; }
	.attachment-input span { display: grid; gap: 3px; }
	.attachment-input small { color: #789287; font-size: 11px; font-weight: 500; }
	.attachment-input input { background: transparent; border: 0; font-size: 12px; padding: 8px 0 0; }
	.primary { background: var(--musha-ink); border: 0; border-radius: 8px; color: #fff; cursor: pointer; font: inherit; font-weight: 700; margin-top: 2px; padding: 14px 16px; }
	.primary span { color: #9ad64d; margin-left: 12px; }
	.ticket-list { display: grid; gap: 10px; }
	.ticket { border: 1px solid #e0ebe4; border-radius: 10px; padding: 16px; }
	.ticket > div { min-width: 0; }
	.ticket strong { color: var(--musha-ink); font-size: 15px; }
	.ticket p { color: #637d70; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.ticket small { color: #8aa095; font-size: 11px; }
	.attachments { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
	.attachments a { background: #edf5d9; border-radius: 5px; color: #4f7657; font-size: 11px; max-width: 220px; overflow: hidden; padding: 5px 7px; text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
	.priority, .status { border-radius: 999px; font-size: 10px; font-weight: 800; padding: 5px 8px; text-transform: capitalize; white-space: nowrap; }
	.priority { background: #eef3ef; color: #547062; }
	.priority.high, .priority.urgent { background: #fff0dd; color: #a66220; }
	.status { align-self: start; background: #edf5d9; color: #52775a; }
	.status.in_progress { background: #e4f0fa; color: #3d718e; }
	.status.waiting_on_client { background: #fff4dc; color: #926b25; }
	.status.resolved, .status.closed { background: #e4f2e8; color: #427a54; }
	.empty { align-items: center; color: #4e7061; display: grid; justify-items: center; min-height: 270px; text-align: center; }
	.empty span { align-items: center; background: #edf5d9; border-radius: 50%; color: #55875d; display: flex; font-size: 24px; height: 62px; justify-content: center; width: 62px; }
	.empty strong { margin-top: 16px; }
	.empty p { font-size: 13px; margin-top: 7px; max-width: 260px; }
	@media (max-width: 860px) { .support-grid { grid-template-columns: 1fr; } }
	@media (max-width: 520px) { .support-panel { padding: 20px; } .fields { grid-template-columns: 1fr; } .ticket { display: grid; } }
</style>
