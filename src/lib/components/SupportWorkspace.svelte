<script lang="ts">
	import { enhance } from '$app/forms';
	import { workspaceSubmit } from '$lib/forms/workspace-submit';
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
	let { tickets, attachments, form } = $props<{
		tickets: Ticket[];
		attachments: Attachment[];
		form?: { success?: boolean; message?: string } | null;
	}>();
	let composing = $state(false);
	let search = $state('');
	let focus = $state('open');
	const open = $derived(
		tickets.filter((ticket: Ticket) => !['closed', 'resolved'].includes(ticket.status))
	);
	const waiting = $derived(
		tickets.filter((ticket: Ticket) => ticket.status === 'waiting_on_client')
	);
	const filtered = $derived(
		tickets
			.filter(
				(ticket: Ticket) =>
					`${ticket.subject} ${ticket.description} ${ticket.category}`
						.toLowerCase()
						.includes(search.toLowerCase()) &&
					(focus === 'all' ||
						(focus === 'open'
							? !['closed', 'resolved'].includes(ticket.status)
							: focus === 'done'
								? ['closed', 'resolved'].includes(ticket.status)
								: ticket.status === focus))
			)
			.sort((a: Ticket, b: Ticket) => b.updated_at.localeCompare(a.updated_at))
	);
	const label = (value: string) => value.replaceAll('_', ' ');
	const attachmentsFor = (id: string) =>
		attachments.filter((row: Attachment) => row.ticket_id === id);
</script>

<!-- Attachment URLs are authenticated download links supplied by the server. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<div class="aligned-workspace support-workspace">
	<div class="aligned-actions">
		<div>
			<p class="eyebrow">MUSHA SUPPORT</p>
			<p class="aligned-description">
				Keep a clear record of requests, progress and supporting evidence.
			</p>
		</div>
		<button
			class="primary"
			type="button"
			aria-expanded={composing}
			aria-controls="support-composer"
			onclick={() => (composing = !composing)}
			>{composing ? 'Close request form' : '+ New support request'}</button
		>
	</div>
	<div class="aligned-metrics">
		<div>
			<span>Open requests</span><strong>{open.length}</strong><small>Awaiting a resolution</small>
		</div>
		<div>
			<span>Waiting on your team</span><strong>{waiting.length}</strong><small
				>Review the request details</small
			>
		</div>
		<div>
			<span>Resolved / closed</span><strong>{tickets.length - open.length}</strong><small
				>Retained in your support history</small
			>
		</div>
	</div>
	<section class="panel" id="support-composer" hidden={!composing}>
		<div class="panel-heading">
			<div>
				<p class="eyebrow">NEW REQUEST</p>
				<h2>How can we help?</h2>
				<p>Include the steps to reproduce an issue and the result you expected.</p>
			</div>
		</div>
		{#if form?.message}<p class="feedback" role={form.success ? 'status' : 'alert'}>
				{form.message}
			</p>{/if}
		<form
			method="POST"
			action="?/createSupportTicket"
			enctype="multipart/form-data"
			data-managed-feedback="true"
			data-reset-on-success="true"
			use:enhance={workspaceSubmit}
			class="form-stack"
		>
			<label
				>Subject<input
					name="subject"
					required
					maxlength="160"
					placeholder="A brief description of your request"
				/></label
			><label
				>Request details<textarea
					name="description"
					required
					minlength="10"
					rows="5"
					placeholder="What happened, where it happened, and what you need help with."
				></textarea></label
			>
			<div class="form-grid two">
				<label
					>Category<select name="category"
						><option value="general">General</option><option value="access">Access</option><option
							value="billing">Billing</option
						><option value="setup">Setup</option><option value="maintenance">Maintenance</option
						><option value="data">Data & imports</option><option value="bug"
							>Something is not working</option
						></select
					></label
				><label
					>Priority<select name="priority"
						><option value="low">Low</option><option value="normal" selected>Normal</option><option
							value="high">High</option
						><option value="urgent">Urgent</option></select
					></label
				>
			</div>
			<label
				>Optional screenshots or files <small
					>JPG, PNG, WebP or PDF · up to 5 files, 10 MB each</small
				><input
					name="attachments"
					type="file"
					accept="image/jpeg,image/png,image/webp,application/pdf"
					multiple
				/></label
			><button class="primary" type="submit">Send support request</button>
		</form>
	</section>
	<div class="aligned-filters">
		<label class="grow"
			><span>Search requests</span><input
				type="search"
				bind:value={search}
				placeholder="Subject, details or category"
			/></label
		><label
			><span>Status</span><select bind:value={focus}
				><option value="open">Open requests</option><option value="all">All requests</option><option
					value="waiting_on_client">Waiting on your team</option
				><option value="done">Resolved / closed</option></select
			></label
		><button
			type="button"
			onclick={() => {
				search = '';
				focus = 'all';
			}}>Reset</button
		>
	</div>
	<section class="panel">
		<div class="panel-heading">
			<div>
				<p class="eyebrow">REQUEST REGISTER</p>
				<h2>Your support history</h2>
			</div>
			<span class="count">{filtered.length} requests</span>
		</div>
		<div class="support-tickets">
			{#each filtered as ticket (ticket.id)}<details class="support-ticket">
					<summary
						><span
							><strong>{ticket.subject}</strong><small
								>{label(ticket.category)} · Updated {new Intl.DateTimeFormat('en', {
									dateStyle: 'medium'
								}).format(new Date(ticket.updated_at))}</small
							></span
						><span class="tag">{label(ticket.priority)}</span><span class="tag"
							>{label(ticket.status)}</span
						></summary
					>
					<div class="ticket-detail">
						<p>{ticket.description}</p>
						<small
							>Reference #{ticket.id.slice(0, 8).toUpperCase()} · Sent {new Intl.DateTimeFormat(
								'en',
								{ dateStyle: 'medium' }
							).format(new Date(ticket.created_at))}</small
						>
						<div class="support-attachments">
							{#each attachmentsFor(ticket.id) as file (file.id)}{#if file.url}<a
										href={file.url}
										target="_blank"
										rel="noreferrer">{file.file_name}</a
									>{:else}<span>{file.file_name} · Unavailable</span>{/if}{/each}
						</div>
					</div>
				</details>{:else}<div class="empty">
					<strong
						>{tickets.length ? 'No requests match this view.' : 'No support requests yet.'}</strong
					>
					<p>New requests and their progress will appear here.</p>
				</div>{/each}
		</div>
	</section>
</div>

<style>
	.support-tickets {
		display: grid;
		gap: 12px;
	}
	.support-ticket {
		border: 1px solid #dfe7d3;
		border-radius: 9px;
		background: #fafcf5;
		overflow: hidden;
	}
	.support-ticket summary {
		display: flex;
		align-items: center;
		gap: 20px;
		padding: 20px;
		cursor: pointer;
	}
	.support-ticket summary > span:first-child {
		flex: 1;
		min-width: 0;
	}
	.support-ticket strong {
		font-size: 12px;
		font-weight: 500;
		color: #58773e;
		overflow-wrap: anywhere;
	}
	.support-ticket small {
		display: block;
		font-size: 9px;
		color: #99ac83;
		line-height: 1.8;
		margin-top: 7px;
	}
	.support-ticket .tag {
		text-transform: capitalize;
	}
	.ticket-detail {
		padding: 0 20px 20px;
	}
	.ticket-detail > p {
		font-size: 12px;
		line-height: 1.9;
		white-space: pre-wrap;
		color: #789362;
		overflow-wrap: anywhere;
	}
	.support-attachments {
		display: flex;
		flex-wrap: wrap;
		gap: 9px;
		margin-top: 17px;
	}
	.support-attachments a,
	.support-attachments span {
		font-size: 10px;
		color: #749656;
		background: #eaf1df;
		border: 1px solid #dbe7cd;
		border-radius: 5px;
		padding: 8px 12px;
		text-decoration: none;
		overflow-wrap: anywhere;
	}
	.support-ticket summary:focus-visible {
		outline: 2px solid #9db57d;
		outline-offset: -3px;
	}
	@media (max-width: 600px) {
		.support-ticket summary {
			gap: 10px;
			flex-wrap: wrap;
			padding: 17px;
		}
		.support-ticket summary > span:first-child {
			flex-basis: 100%;
		}
	}
</style>
