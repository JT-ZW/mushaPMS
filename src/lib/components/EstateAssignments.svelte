<script lang="ts">
	import { enhance } from '$app/forms';
	import { workspaceSubmit } from '$lib/forms/workspace-submit';
	let { members, properties, assignments } = $props<{
		members: { user_id: string; role: string }[];
		properties: { id: string; name: string }[];
		assignments: { user_id: string; property_id: string }[];
	}>();
	let user = $state('');
	let selected = $derived(
		assignments
			.filter((a: { user_id: string; property_id: string }) => a.user_id === user)
			.map((a: { user_id: string; property_id: string }) => a.property_id)
	);
</script>

<section class="estate panel">
	<p class="eyebrow">PROPERTY RESPONSIBILITY</p>
	<h2>Assign an estate manager</h2>
	<p>
		Choose an existing team member and at least one property. This replaces their portfolio role
		with access to only the selected properties. Owners retain portfolio oversight.
	</p>
	<form
		method="POST"
		action="?/assignEstateManager"
		use:enhance={workspaceSubmit}
		data-managed-feedback="true"
	>
		<label
			>Team member<select name="user_id" bind:value={user} required
				><option value="">Choose a member</option
				>{#each members.filter((m: { user_id: string; role: string }) => m.role !== 'owner') as member (member.user_id)}<option
						value={member.user_id}>{member.role.replaceAll('_', ' ')} · {member.user_id}</option
					>{/each}</select
			></label
		>
		<fieldset>
			<legend>Assigned properties · {selected.length} selected</legend
			>{#each properties as property (property.id)}<label class="check"
					><input
						type="checkbox"
						name="property_ids"
						value={property.id}
						bind:group={selected}
					/>{property.name}</label
				>{:else}<p>Add a property before assigning an estate manager.</p>{/each}
		</fieldset>
		<button type="submit" disabled={!user || !selected.length}>Save property assignments</button>
	</form>
</section>

<style>
	.estate {
		padding: 1.5rem;
		background: #fffefb;
		border: 1px solid #dce4d5;
		border-radius: 14px;
		margin-top: 1rem;
	}
	.estate h2 {
		font-size: 1.4rem;
		letter-spacing: -0.04em;
	}
	.estate p {
		font-size: 0.88rem;
		line-height: 1.65;
		color: #72816c;
	}
	.estate .eyebrow {
		font-size: 0.65rem;
		letter-spacing: 0.16em;
	}
	.estate form {
		display: grid;
		gap: 1rem;
	}
	.estate label {
		display: grid;
		gap: 0.5rem;
		font-size: 0.9rem;
	}
	.estate select {
		width: 100%;
		padding: 0.8rem;
		border: 1px solid #d6dfcf;
		border-radius: 7px;
		background: white;
		color: #284b3b;
	}
	.estate fieldset {
		border: 1px solid #d6dfcf;
		border-radius: 8px;
		display: grid;
		gap: 0.7rem;
		padding: 1rem;
	}
	.estate legend {
		font-size: 0.85rem;
	}
	.estate .check {
		display: flex;
		align-items: center;
	}
	.estate button {
		justify-self: start;
		padding: 0.8rem 1rem;
		border: 0;
		border-radius: 7px;
		color: white;
		background: #284c3b;
		cursor: pointer;
	}
	.estate button:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
