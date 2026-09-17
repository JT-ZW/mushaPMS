<script lang="ts">
	import AdminChrome from '$lib/components/AdminChrome.svelte';
	import { resolve } from '$app/paths';
	let { data, form } = $props();
	const organizationName = (id: string) =>
		data.organizations.find((organization) => organization.id === id)?.name ??
		'Unknown organization';
	const attachmentsFor = (ticketId: string) =>
		(data.attachments ?? []).filter((attachment: { ticket_id: string }) => attachment.ticket_id === ticketId);
</script>

<svelte:head><title>Support centre · Musha platform</title></svelte:head>

<AdminChrome active="support">
	{#if data.access === 'denied'}<section class="blocked">
			<p class="eyebrow">Permission required</p>
			<h1>Platform support access is restricted.</h1>
		</section>{:else}<section class="heading">
			<div>
				<p class="eyebrow">Client care</p>
				<h1>Support centre<span>.</span></h1>
				<p>Access client workspaces deliberately, document why, and leave a clear trail.</p>
			</div>
			<span class="security">Read-only by default</span>
		</section>
		{#if form?.message}<div class:failure={!form.success} class="notice">{form.message}</div>{/if}
		<section class="ticket-workspace">
			<section class="panel ticket-create">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Support queue</p>
						<h2>Open a client request</h2>
					</div>
					<span class="session-mark">+</span>
				</div>
				<form method="POST" action="?/createTicket">
					<label
						>Organization<select name="organization_id" required
							><option value="">Choose organization</option
							>{#each data.organizations as organization (organization.id)}<option
									value={organization.id}>{organization.name} · {organization.status}</option
								>{/each}</select
						></label
					>
					<label
						>Subject<input
							name="subject"
							required
							placeholder="e.g. Help importing tenant balances"
						/></label
					>
					<label
						>Request details<textarea
							name="description"
							rows="3"
							required
							placeholder="Describe the issue, context, and next step."></textarea></label
					>
					<div class="ticket-row">
						<label
							>Category<select name="category"
								><option value="general">General</option><option value="access">Access</option
								><option value="billing">Billing</option><option value="setup">Setup</option><option
									value="data">Data</option
								><option value="bug">Bug</option></select
							></label
						><label
							>Priority<select name="priority"
								><option value="normal">Normal</option><option value="high">High</option><option
									value="urgent">Urgent</option
								><option value="low">Low</option></select
							></label
						>
					</div>
					<button class="primary" type="submit">Create support ticket <span>→</span></button>
				</form>
			</section>
			<section class="panel ticket-queue">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Work in progress</p>
						<h2>Recent tickets</h2>
					</div>
					<span class="count">{data.tickets.length}</span>
				</div>
				{#if data.tickets.length === 0}<div class="empty">
						<div>✓</div>
						<strong>No support tickets yet</strong>
						<p>Client requests will appear here for triage.</p>
					</div>{:else}<div class="ticket-list">
						{#each data.tickets as ticket (ticket.id)}<article class="ticket-card">
								<div class="ticket-card-heading">
									<div>
										<strong>{ticket.subject}</strong><small
											>{ticket.organizations?.[0]?.name ?? 'Unknown organization'} · {new Date(
												ticket.created_at
											).toLocaleString()}</small
										>
									</div>
									<span class="priority {ticket.priority}">{ticket.priority}</span>
								</div>
								<p>{ticket.description}</p>
								{#if attachmentsFor(ticket.id).length}<div class="ticket-attachments">{#each attachmentsFor(ticket.id) as attachment (attachment.id)}<a href={attachment.url ?? '#'} target="_blank" rel="noreferrer">{attachment.mime_type?.startsWith('image/') ? 'View image' : 'Open file'} · {attachment.file_name}</a>{/each}</div>{/if}
								<form method="POST" action="?/updateTicket" class="ticket-controls">
									<input type="hidden" name="id" value={ticket.id} /><select
										name="status"
										value={ticket.status}
										><option value="open">Open</option><option value="in_progress"
											>In progress</option
										><option value="waiting_on_client">Waiting on client</option><option
											value="resolved">Resolved</option
										><option value="closed">Closed</option></select
									><select name="assigned_to" value={ticket.assigned_to ?? ''}
										><option value="">Unassigned</option
										>{#each data.platformTeam as member (member.user_id)}<option
												value={member.user_id}>{member.display_name ?? member.role}</option
											>{/each}</select
									><button class="text-button" type="submit">Save</button>
								</form>
								<form method="POST" action="?/addMessage" class="ticket-note">
									<input type="hidden" name="ticket_id" value={ticket.id} /><input
										name="body"
										placeholder="Add an internal note"
										required
									/><input type="hidden" name="visibility" value="internal" /><button
										class="text-button"
										type="submit">Add note</button
									>
								</form>
							</article>{/each}
					</div>{/if}
			</section>
		</section>
		<div class="support-grid">
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Start a session</p>
						<h2>Assist a client</h2>
					</div>
					<span class="session-mark">◌</span>
				</div>
				<form method="POST" action="?/start">
					<label
						>Organization<select name="organization_id" required
							><option value="">Choose organization</option
							>{#each data.organizations as organization (organization.id)}<option
									value={organization.id}>{organization.name} · {organization.status}</option
								>{/each}</select
						></label
					><label
						>Reason for access<textarea
							name="reason"
							rows="4"
							required
							placeholder="e.g. Verify the unit setup before handoff"></textarea></label
					><label
						>Access level<select name="access_level"
							><option value="read_only">Read-only session</option
							>{#if data.member.role === 'super_admin'}<option value="operator"
									>Operator session</option
								>{/if}</select
						></label
					><button class="primary" type="submit">Start session <span>→</span></button>
				</form>
				<p class="form-note">
					Sessions expire automatically after 60 minutes. Operator access is only available to
					superadmins.
				</p>
			</section>
			<section class="panel">
				<div class="panel-heading">
					<div>
						<p class="eyebrow">Session history</p>
						<h2>Recent access</h2>
					</div>
					<span class="count">{data.sessions.length}</span>
				</div>
				{#if data.sessions.length === 0}<div class="empty">
						<div>✓</div>
						<strong>No support sessions yet</strong>
						<p>Start a session when a client needs help.</p>
					</div>{:else}<div class="session-list">
						{#each data.sessions as session (session.id)}<article class="session-row">
								<div class="session-icon">{session.access_level === 'operator' ? '!' : '◌'}</div>
								<div class="session-info">
									<strong>{organizationName(session.organization_id)}</strong><span
										>{session.access_level === 'operator' ? 'Operator' : 'Read-only'} · {session.reason}</span
									><small
										>{new Date(session.started_at).toLocaleString()} · expires {new Date(
											session.expires_at
										).toLocaleTimeString()}</small
									>
								</div>
								{#if !session.ended_at && session.started_by === data.currentUserId}<a
										class="open-session"
										href={resolve(`/workspace/${session.organization_id}`)}
										>Open read-only workspace →</a
									>{/if}
								{#if !session.ended_at && session.started_by === data.currentUserId}<form
										method="POST"
										action="?/end"
									>
										<input type="hidden" name="id" value={session.id} /><button
											class="end"
											type="submit">End</button
										>
									</form>{:else}<span class="ended">Ended</span>{/if}
							</article>{/each}
					</div>{/if}
			</section>
		</div>{/if}
</AdminChrome>

<style>
	.eyebrow {
		color: #7b9588;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.16em;
		margin: 0 0 9px;
		text-transform: uppercase;
	}
	.heading {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 20px;
		margin-bottom: 35px;
	}
	.heading h1 {
		font-size: clamp(35px, 5vw, 58px);
		line-height: 0.95;
		letter-spacing: -0.08em;
		margin: 0 0 15px;
	}
	.heading h1 span {
		color: var(--musha-lime);
	}
	.heading p:not(.eyebrow) {
		color: #718a7e;
		font-size: 13px;
		margin: 0;
	}
	.security {
		background: #e9f1e9;
		color: #557568;
		border-radius: 99px;
		padding: 8px 11px;
		font-size: 10px;
	}
	.security:before {
		content: '●';
		color: #66a579;
		margin-right: 6px;
	}
	.notice {
		background: #e6f2e6;
		color: #39704c;
		border-radius: 7px;
		padding: 11px 13px;
		margin: -10px 0 18px;
		font-size: 11px;
	}
	.notice.failure {
		background: #fae9e5;
		color: #955549;
	}
	.ticket-workspace {
		display: grid;
		grid-template-columns: 0.8fr 1.2fr;
		gap: 13px;
		margin-bottom: 13px;
	}
	.ticket-workspace .panel {
		background: #fff;
		border: 1px solid #e4ebe4;
		border-radius: 10px;
		padding: 24px;
	}
	.ticket-workspace .panel form {
		display: grid;
		gap: 11px;
	}
	.ticket-workspace .panel label {
		display: grid;
		gap: 6px;
		color: #557366;
		font-size: 10px;
		font-weight: 700;
	}
	.ticket-workspace input,
	.ticket-workspace select,
	.ticket-workspace textarea {
		width: 100%;
		border: 1px solid #dfe9e1;
		border-radius: 6px;
		background: #fbfcfa;
		color: #426456;
		padding: 9px;
		outline: 0;
		font-size: 11px;
	}
	.ticket-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 9px;
	}
	.ticket-list {
		display: grid;
		gap: 8px;
		max-height: 445px;
		overflow: auto;
	}
	.ticket-card {
		padding: 11px;
		border: 1px solid #edf2ed;
		border-radius: 7px;
	}
	.ticket-card-heading,
	.ticket-controls,
	.ticket-note {
		display: flex !important;
		align-items: center;
		gap: 8px;
	}
	.ticket-card-heading > div {
		min-width: 0;
		flex: 1;
	}
	.ticket-card strong,
	.ticket-card small {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ticket-card strong {
		color: #345b4b;
		font-size: 11px;
	}
	.ticket-card small {
		color: #91a198;
		font-size: 9px;
		margin-top: 3px;
	}
	.ticket-card > p {
		color: #799187;
		font-size: 10px;
		line-height: 1.5;
		margin: 9px 0;
	}
	.ticket-attachments { display: flex; flex-wrap: wrap; gap: 7px; margin: 12px 0; }
	.ticket-attachments a { background: #edf5d9; border-radius: 6px; color: #4b7357; font-size: 11px; padding: 6px 8px; text-decoration: none; }
	.priority {
		padding: 4px 6px;
		border-radius: 99px;
		background: #edf4dc;
		color: #668a6d;
		font-size: 9px;
		text-transform: capitalize;
	}
	.priority.high,
	.priority.urgent {
		background: #fae9e5;
		color: #9a5548;
	}
	.ticket-controls select {
		flex: 1;
		min-width: 0;
		padding: 7px;
		font-size: 9px;
	}
	.ticket-note {
		margin-top: 7px;
	}
	.ticket-note input {
		min-width: 0;
		flex: 1;
		padding: 7px;
		font-size: 9px;
	}
	.text-button {
		border: 0;
		background: transparent;
		color: #668a6d;
		cursor: pointer;
		font-size: 9px;
		font-weight: 700;
		white-space: nowrap;
	}
	.support-grid {
		display: grid;
		grid-template-columns: 0.85fr 1.15fr;
		gap: 13px;
	}
	.panel {
		background: #fff;
		border: 1px solid #e4ebe4;
		border-radius: 10px;
		padding: 24px;
	}
	.panel-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 15px;
		margin-bottom: 23px;
	}
	.panel h2 {
		font-size: 19px;
		letter-spacing: -0.05em;
		margin: 0;
	}
	.session-mark {
		display: grid;
		place-items: center;
		width: 35px;
		height: 35px;
		border-radius: 10px;
		background: #edf4dc;
		color: #668d6d;
		font-size: 18px;
	}
	.panel form {
		display: grid;
		gap: 14px;
	}
	.panel label {
		display: grid;
		gap: 6px;
		color: #557366;
		font-size: 11px;
		font-weight: 700;
	}
	.panel input,
	.panel select,
	.panel textarea {
		width: 100%;
		border: 1px solid #dfe9e1;
		border-radius: 6px;
		background: #fbfcfa;
		color: #426456;
		padding: 10px;
		outline: 0;
		font-size: 11px;
		resize: vertical;
	}
	.primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 14px;
		border: 0;
		border-radius: 6px;
		background: var(--musha-deep);
		color: #fff;
		padding: 11px 13px;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
	}
	.primary span {
		color: var(--musha-lime);
		font-size: 16px;
	}
	.form-note {
		color: #99a69f;
		font-size: 10px;
		line-height: 1.5;
		margin: 16px 0 0;
	}
	.count {
		background: #edf4dc;
		color: #668a6d;
		border-radius: 99px;
		padding: 7px 10px;
		font-size: 10px;
	}
	.session-list {
		display: grid;
		gap: 8px;
	}
	.session-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 11px;
		border: 1px solid #edf2ed;
		border-radius: 7px;
	}
	.session-icon {
		display: grid;
		place-items: center;
		width: 29px;
		height: 29px;
		border-radius: 8px;
		background: #edf4dc;
		color: #63896a;
		font-size: 13px;
	}
	.session-info {
		min-width: 0;
		flex: 1;
	}
	.session-info strong,
	.session-info span,
	.session-info small {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.session-info strong {
		color: #345b4b;
		font-size: 11px;
	}
	.session-info span,
	.session-info small {
		color: #8e9f96;
		font-size: 10px;
		margin-top: 3px;
	}
	.end {
		border: 0;
		background: transparent;
		color: #9a6559;
		cursor: pointer;
		font-size: 10px;
	}
	.ended {
		color: #9aa69f;
		font-size: 10px;
	}
	.empty {
		display: grid;
		place-content: center;
		min-height: 230px;
		justify-items: center;
		text-align: center;
		color: #81958b;
	}
	.empty div {
		display: grid;
		place-items: center;
		width: 43px;
		height: 43px;
		border-radius: 50%;
		background: #edf4dc;
		color: #658b6d;
		margin-bottom: 12px;
	}
	.empty strong {
		color: #46695a;
		font-size: 13px;
	}
	.empty p {
		font-size: 11px;
		margin: 6px 0 0;
	}
	.blocked {
		padding: 25px;
		background: #fff8f5;
		border: 1px solid #f0ded7;
		border-radius: 10px;
	}
	.blocked h1 {
		font-size: 32px;
		letter-spacing: -0.07em;
	}
	@media (max-width: 850px) {
		.ticket-workspace {
			grid-template-columns: 1fr;
		}
		.support-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 600px) {
		.heading {
			display: block;
		}
		.security {
			display: inline-block;
			margin-top: 19px;
		}
		.ticket-row {
			grid-template-columns: 1fr;
		}
		.ticket-controls {
			align-items: stretch;
			flex-wrap: wrap;
		}
		.ticket-controls select {
			flex-basis: calc(50% - 4px);
		}
	}
</style>
