<script lang="ts">
	import { enhance } from '$app/forms';
	import { workspaceSubmit } from '$lib/forms/workspace-submit';
	let {
		lease,
		held = 0,
		balance = 0,
		currency = 'USD'
	} = $props<{
		lease: {
			id: string;
			status: string;
			end_date: string | null;
			start_date: string;
			expected_move_out_on?: string | null;
		};
		held?: number;
		balance?: number;
		currency?: string;
	}>();
	let operation = $state('renew');
</script>

{#if ['active', 'ending_soon'].includes(lease.status)}
	<details class="lifecycle">
		<summary>Renewal, notice &amp; move-out</summary>
		<p>
			Keep the same lease history through renewal. Notice does not release the space or stop rent.
		</p>
		{#if lease.expected_move_out_on}<p>
				<strong>Expected move-out:</strong>
				{lease.expected_move_out_on}
			</p>{/if}
		<label
			>Next action<select bind:value={operation}
				><option value="renew">Extend lease</option><option value="notice">Record notice</option
				><option value="move_out">Complete move-out</option></select
			></label
		>
		<form
			method="POST"
			action="?/leaseLifecycle"
			use:enhance={workspaceSubmit}
			data-managed-feedback="true"
		>
			<input type="hidden" name="tenancy_id" value={lease.id} /><input
				type="hidden"
				name="operation"
				value={operation}
			/>
			{#if operation === 'renew'}
				<label
					>New lease end date<input
						name="end_date"
						type="date"
						min={lease.end_date ?? lease.start_date}
						required
					/></label
				>
				<p>
					Extend the existing terms. To change the rent or billing frequency, save the lease terms
					separately.
				</p>
			{:else if operation === 'notice'}
				<label
					>Expected move-out date<input name="expected_move_out_on" type="date" required /></label
				>
			{:else}
				<p>
					<strong>Outstanding charges: {currency} {balance.toFixed(2)}</strong><br />Deposit
					received in the ledger: {currency}
					{held.toFixed(2)}
				</p>
				<label
					>Move-out date<input
						name="move_out_date"
						type="date"
						min={lease.start_date}
						required
					/></label
				>
				<label
					>Inspection findings<textarea
						name="inspection_notes"
						rows="3"
						required
						placeholder="Condition, keys returned, meter readings and any damage"></textarea></label
				>
				<div class="amounts">
					<label
						>Deposit refund<input
							name="deposit_refund_amount"
							type="number"
							min="0"
							step="0.01"
							value={held}
							required
						/></label
					><label
						>Deposit deductions<input
							name="deposit_deduction_amount"
							type="number"
							min="0"
							step="0.01"
							value="0"
							required
						/></label
					>
				</div>
				<label
					>Settlement / collection plan<textarea
						name="settlement_notes"
						rows="3"
						required={balance > 0 || held > 0}
						placeholder="Refund reference, reasons for deductions, and collection plan for any remaining balance"
					></textarea></label
				>
				<p>
					This records the agreed settlement. It does not send a refund or write off unpaid charges.
					Complete any refund through your payment provider.
				</p>
				<label class="confirm"
					><input type="checkbox" required />I have checked the inspection and settlement. Closing
					stops rent automation and releases the space.</label
				>
			{/if}
			<button type="submit"
				>{operation === 'renew'
					? 'Confirm extension'
					: operation === 'notice'
						? 'Save notice'
						: 'Complete move-out'}</button
			>
		</form>
	</details>
{/if}

<style>
	.lifecycle {
		padding: 1rem;
		border: 1px solid #dce4d5;
		border-radius: 12px;
		margin: 1rem 0;
		color: #28483a;
		background: #f7f8f2;
	}
	.lifecycle summary {
		cursor: pointer;
		font-weight: 650;
	}
	.lifecycle p {
		font-size: 0.85rem;
		line-height: 1.6;
		color: #647568;
	}
	.lifecycle form {
		display: grid;
		gap: 1rem;
	}
	.lifecycle label {
		display: grid;
		gap: 0.4rem;
		font-size: 0.85rem;
	}
	.lifecycle input,
	.lifecycle select,
	.lifecycle textarea {
		font: inherit;
		padding: 0.75rem;
		border: 1px solid #ced8c7;
		border-radius: 7px;
		background: white;
		color: #203c30;
		width: 100%;
		box-sizing: border-box;
	}
	.lifecycle .amounts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.lifecycle button {
		justify-self: start;
		padding: 0.8rem 1rem;
		background: #284c3b;
		color: white;
		border: 0;
		border-radius: 7px;
		cursor: pointer;
	}
	.lifecycle .confirm {
		display: flex;
		align-items: start;
	}
	.lifecycle .confirm input {
		width: auto;
		margin-top: 0.2rem;
	}
	@media (max-width: 600px) {
		.lifecycle .amounts {
			grid-template-columns: 1fr;
		}
	}
</style>
