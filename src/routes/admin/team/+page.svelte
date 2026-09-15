<script lang="ts">
	import AdminChrome from '$lib/components/AdminChrome.svelte';
	let { data, form } = $props();
	let showInvite = $state(false);
</script>

<svelte:head><title>Platform team · Musha platform</title></svelte:head>

<AdminChrome active="team">
	{#if data.access === 'denied'}<section class="blocked">
			<p class="eyebrow">Permission required</p>
			<h1>Only superadmins can manage the platform team.</h1>
		</section>{:else}<section class="heading">
			<div>
				<p class="eyebrow">Internal access</p>
				<h1>Platform team<span>.</span></h1>
				<p>Keep the people behind onboarding and support separate from client accounts.</p>
			</div>
			<button class="primary" type="button" onclick={() => (showInvite = !showInvite)}
				>{showInvite ? 'Close invite' : 'Invite teammate'} <span>→</span></button
			>
		</section>
		{#if form?.message}<div class:failure={!form.success} class="notice">
				{form.message}
			</div>{/if}{#if showInvite}<section class="invite-panel">
				<p class="eyebrow">New platform member</p>
				<h2>Send an invitation</h2>
				<form method="POST" action="?/invite">
					<label>Name<input name="display_name" required placeholder="Support teammate" /></label
					><label
						>Email<input
							name="email"
							type="email"
							required
							placeholder="support@musha.app"
						/></label
					><label
						>Role<select name="role"
							><option value="support">Support</option><option value="implementation"
								>Implementation</option
							><option value="billing">Billing</option><option value="read_only">Read-only</option
							><option value="super_admin">Superadmin</option></select
						></label
					><button class="primary" type="submit">Send invitation <span>→</span></button>
				</form>
			</section>{/if}
		<section class="team-card">
			<div class="card-heading">
				<div>
					<p class="eyebrow">People with platform access</p>
					<h2>Team members</h2>
				</div>
				<span class="count">{data.members.length}</span>
			</div>
			{#if data.members.length === 0}<div class="empty">
					<strong>No platform members yet</strong>
				</div>{:else}<div class="members">
					{#each data.members as member (member.user_id)}<article class="member">
							<div class="avatar">
								{(member.display_name ?? member.user_id).slice(0, 1).toUpperCase()}
							</div>
							<div class="member-info">
								<strong>{member.display_name ?? 'Unnamed member'}</strong><small
									>{member.user_id}</small
								>
							</div>
							<span class="role">{member.role.replace('_', ' ')}</span
							>{#if member.user_id !== data.members[0]?.user_id}<form
									method="POST"
									action="?/remove"
								>
									<input type="hidden" name="user_id" value={member.user_id} /><button
										class="remove"
										type="submit">Remove</button
									>
								</form>{/if}
						</article>{/each}
				</div>{/if}
		</section>{/if}
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
		align-items: flex-end;
		justify-content: space-between;
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
	.primary {
		display: inline-flex;
		align-items: center;
		gap: 15px;
		border: 0;
		border-radius: 7px;
		background: var(--musha-deep);
		color: #fff;
		padding: 11px 14px;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		text-decoration: none;
	}
	.primary span {
		color: var(--musha-lime);
		font-size: 16px;
	}
	.notice {
		background: #e6f2e6;
		color: #39704c;
		border-radius: 7px;
		padding: 11px 13px;
		margin: -10px 0 17px;
		font-size: 11px;
	}
	.notice.failure {
		background: #fae9e5;
		color: #955549;
	}
	.invite-panel,
	.team-card {
		background: #fff;
		border: 1px solid #e4ebe4;
		border-radius: 10px;
		padding: 24px;
	}
	.invite-panel {
		max-width: 520px;
		margin-bottom: 14px;
	}
	.invite-panel h2,
	.team-card h2 {
		font-size: 19px;
		letter-spacing: -0.05em;
		margin: 0;
	}
	.invite-panel form {
		display: grid;
		gap: 12px;
		margin-top: 20px;
	}
	.invite-panel label {
		display: grid;
		gap: 6px;
		color: #557366;
		font-size: 11px;
		font-weight: 700;
	}
	.invite-panel input,
	.invite-panel select {
		border: 1px solid #dfe9e1;
		border-radius: 6px;
		padding: 10px;
		background: #fbfcfa;
		color: #426456;
		font-size: 11px;
		outline: 0;
	}
	.card-heading {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 20px;
	}
	.count {
		background: #edf4dc;
		color: #668a6d;
		border-radius: 99px;
		padding: 7px 10px;
		font-size: 10px;
	}
	.members {
		display: grid;
		gap: 7px;
	}
	.member {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 11px;
		border: 1px solid #edf2ed;
		border-radius: 7px;
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 31px;
		height: 31px;
		border-radius: 9px;
		background: #edf4dc;
		color: #63896a;
		font-size: 12px;
		font-weight: 700;
	}
	.member-info {
		min-width: 0;
		flex: 1;
	}
	.member-info strong,
	.member-info small {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.member-info strong {
		color: #345b4b;
		font-size: 11px;
	}
	.member-info small {
		color: #98a69e;
		font-size: 9px;
		margin-top: 4px;
	}
	.role {
		color: #668a6d;
		background: #edf4dc;
		border-radius: 99px;
		padding: 5px 8px;
		font-size: 9px;
		text-transform: capitalize;
	}
	.remove {
		border: 0;
		background: transparent;
		color: #9a6559;
		cursor: pointer;
		font-size: 10px;
	}
	.empty {
		min-height: 160px;
		display: grid;
		place-content: center;
		color: #81958b;
		font-size: 12px;
	}
	.blocked {
		padding: 25px;
		background: #fff8f5;
		border: 1px solid #f0ded7;
		border-radius: 10px;
	}
	.blocked h1 {
		font-size: 33px;
		letter-spacing: -0.07em;
	}
	@media (max-width: 600px) {
		.heading {
			display: block;
		}
		.heading .primary {
			margin-top: 20px;
		}
		.member {
			align-items: flex-start;
			flex-wrap: wrap;
		}
		.member-info {
			max-width: calc(100% - 45px);
		}
		.role {
			margin-left: 41px;
		}
		.remove {
			margin-left: auto;
		}
	}
</style>
