<script lang="ts">
	import { resolve } from '$app/paths';
	let {
		organizationId,
		items,
		unavailable = false
	} = $props<{
		organizationId: string;
		items: { id: string; title: string; detail: string; section: string; priority: number }[];
		unavailable?: boolean;
	}>();
</script>

<section class="daily" aria-label="Daily operations">
	<div class="heading">
		<div>
			<small>DAILY OPERATIONS</small>
			<h2>Your next actions</h2>
		</div>
		<span>{items.length} open</span>
	</div>
	{#if unavailable}<p role="status">The action list could not be refreshed. Reload to try again.</p>
	{:else if items.length}<div class="actions">
			{#each items.slice(0, 8) as item (item.id)}<a
					href={resolve(`/workspace/${organizationId}/${item.section}`)}
					><span class:urgent={item.priority === 0} class="dot"></span><span
						><strong>{item.title}</strong><small>{item.detail}</small></span
					><span aria-hidden="true">&#8599;</span></a
				>{/each}
		</div>
		{#if items.length > 8}<p>
				Showing the first 8 actions. Open the linked sections to review the full queues.
			</p>{/if}
	{:else}<p>
			No overdue collections, upcoming expiries, urgent work, or setup gaps in the current checks.
		</p>{/if}
</section>

<style>
	.daily {
		background: #fffefb;
		border: 1px solid #dce3d5;
		border-radius: 16px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		color: #264437;
	}
	.heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}
	.heading small {
		letter-spacing: 0.16em;
		font-size: 0.65rem;
		color: #70816c;
	}
	.heading h2 {
		font-size: 1.3rem;
		font-weight: 550;
		margin: 0.4rem 0 1rem;
	}
	.heading > span {
		padding: 0.4rem 0.7rem;
		background: #edf2e3;
		border-radius: 20px;
		font-size: 0.8rem;
	}
	.actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem 1.5rem;
	}
	.actions a {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		text-decoration: none;
		color: inherit;
		padding: 0.85rem 0;
		border-top: 1px solid #edf0e7;
	}
	.actions strong {
		font-weight: 550;
		font-size: 0.9rem;
	}
	.actions small {
		display: block;
		font-size: 0.78rem;
		color: #78816e;
		margin-top: 0.3rem;
		line-height: 1.5;
	}
	.actions a > span:last-child {
		margin-left: auto;
	}
	.dot {
		width: 8px;
		height: 8px;
		flex-shrink: 0;
		border-radius: 50%;
		background: #8b9d69;
	}
	.dot.urgent {
		background: #ce7c41;
	}
	.daily p {
		font-size: 0.85rem;
		color: #6f7c68;
		line-height: 1.6;
	}
	@media (max-width: 700px) {
		.actions {
			grid-template-columns: 1fr;
		}
	}
</style>
