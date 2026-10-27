<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { ComponentProps } from 'svelte';
	import PropertyRegistrationWizard from './PropertyRegistrationWizard.svelte';
	let { organization, properties, spaces, form, onClose } = $props<
		Pick<
			ComponentProps<typeof PropertyRegistrationWizard>,
			'organization' | 'properties' | 'spaces' | 'form'
		> & { onClose: () => void }
	>();
	const initialForm = untrack(() => form);
	const currentForm = $derived(form === initialForm ? undefined : form);
	let dialog: HTMLDialogElement;
	let dirty = $state(false);
	let busy = $state(false);
	let confirmClose = $state(false);
	function requestClose() {
		if (busy) return;
		if (dirty || currentForm?.success) confirmClose = true;
		else onClose();
	}
	onMount(() => {
		const previous = document.activeElement as HTMLElement | null;
		const overflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		dialog.showModal();
		return () => {
			dialog.close();
			document.body.style.overflow = overflow;
			previous?.focus();
		};
	});
</script>

<dialog
	class="registration-dialog"
	bind:this={dialog}
	aria-labelledby="modal-registration-title"
	oncancel={(event) => {
		event.preventDefault();
		requestClose();
	}}
>
	<header class="modal-header">
		<div>
			<p>PORTFOLIO / NEW PROPERTY</p>
			<h2 id="modal-registration-title">A place for your next property.</h2>
		</div>
		<button
			type="button"
			disabled={busy}
			onclick={requestClose}
			aria-label="Close property registration">×</button
		>
	</header>
	{#if confirmClose}<section class="close-confirmation" role="alert">
			<div>
				<strong>Close this registration?</strong>
				<p>
					Saved steps will remain in your portfolio. Unsaved changes in the current form will be
					discarded.
				</p>
			</div>
			<div>
				<button type="button" onclick={() => (confirmClose = false)}>Keep working</button><button
					type="button"
					class="close-anyway"
					onclick={onClose}>Close registration</button
				>
			</div>
		</section>{/if}
	<div class="modal-body" oninput={() => (dirty = true)} onchange={() => (dirty = true)}>
		<PropertyRegistrationWizard
			{organization}
			{properties}
			{spaces}
			form={currentForm}
			creatingOnly
			bind:busy
			onComplete={onClose}
		/>
	</div>
	<footer class="modal-footer">
		<span
			>{busy
				? 'Saving changes…'
				: 'Each step is saved when you continue. Saved records remain in your portfolio.'}</span
		><button type="button" disabled={busy} onclick={requestClose}>Close</button>
	</footer>
</dialog>

<style>
	.registration-dialog {
		width: min(1180px, calc(100vw - 48px));
		max-width: none;
		height: min(900px, calc(100svh - 48px));
		max-height: calc(100svh - 48px);
		padding: 0;
		border: 1px solid #dbe3ce;
		border-radius: 14px;
		background: #f5f6ee;
		color: #294534;
		overflow: auto;
		box-shadow: 0 30px 100px #17302640;
	}
	.registration-dialog::backdrop {
		background: #132b21a8;
		backdrop-filter: blur(4px);
	}
	.modal-header {
		position: sticky;
		top: 0;
		z-index: 600;
		background: #fffef9;
		border-bottom: 1px solid #dce5d0;
		padding: 23px 30px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
	}
	.modal-header p {
		font-size: 8px;
		letter-spacing: 1.6px;
		color: #91a17c;
		margin: 0 0 10px;
	}
	.modal-header h2 {
		font-size: 24px;
		font-weight: 500;
		letter-spacing: -0.7px;
		margin: 0;
	}
	.modal-header > button {
		font-size: 28px;
		border: 1px solid #e0e7d7;
		background: #f4f6ed;
		border-radius: 50%;
		width: 38px;
		height: 38px;
		color: #7e9567;
		cursor: pointer;
		flex: none;
	}
	.modal-body {
		padding: 28px 30px;
	}
	.modal-body :global(.registration-intro) {
		display: none;
	}
	.modal-body :global(.step-grid) {
		grid-template-columns: minmax(0, 1fr) 300px;
		gap: 18px;
	}
	.modal-body :global(.guidance-panel) {
		background: #edf2e3;
	}
	.modal-body :global(.panel) {
		background: #fffefa;
		border-color: #e1e7d7;
	}
	.modal-body :global(.primary) {
		background: #294e39;
	}
	.modal-body :global(.steps) {
		margin-bottom: 22px;
	}
	.modal-body :global(.steps button.active) {
		background: #294e39;
	}
	.modal-body :global(.stage-toolbar h3),
	.modal-body :global(.panel-heading h3) {
		font-size: 24px;
		letter-spacing: -0.7px;
	}
	.modal-body :global(.portfolio-map-block) {
		display: none;
	}
	.modal-footer {
		position: sticky;
		bottom: 0;
		background: #fffef9;
		border-top: 1px solid #dde5d1;
		padding: 15px 30px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 25px;
		z-index: 600;
	}
	.modal-footer span {
		font-size: 10px;
		color: #91a17a;
		line-height: 1.7;
	}
	.modal-footer button,
	.close-confirmation button {
		border: 1px solid #d5e0c8;
		padding: 10px 17px;
		font: inherit;
		font-size: 11px;
		background: #edf2e4;
		color: #65844a;
		border-radius: 5px;
		cursor: pointer;
	}
	.close-confirmation {
		padding: 20px 30px;
		background: #fcf1dd;
		border-bottom: 1px solid #e6d6b9;
	}
	.close-confirmation strong {
		font-size: 14px;
		font-weight: 500;
		color: #876d39;
	}
	.close-confirmation p {
		font-size: 11px;
		line-height: 1.8;
		color: #97835e;
	}
	.close-confirmation > div:last-child {
		display: flex;
		gap: 10px;
	}
	.close-confirmation .close-anyway {
		background: #886d3e;
		color: white;
		border-color: #886d3e;
	}
	button:disabled {
		opacity: 0.5;
		cursor: wait;
	}
	button:focus-visible {
		outline: 2px solid #8ea772;
		outline-offset: 3px;
	}
	@media (max-width: 950px) {
		.modal-body :global(.step-grid) {
			grid-template-columns: 1fr;
		}
		.modal-body :global(.guidance-panel) {
			display: none;
		}
	}
	@media (max-width: 650px) {
		.registration-dialog {
			width: 100vw;
			height: 100svh;
			max-height: 100svh;
			margin: 0;
			border-radius: 0;
			border: 0;
		}
		.modal-header {
			padding: 20px;
		}
		.modal-header h2 {
			font-size: 20px;
		}
		.modal-body {
			padding: 20px 15px;
		}
		.modal-footer {
			padding: 15px 20px;
		}
		.modal-footer span {
			font-size: 9px;
		}
		.modal-body :global(.steps) {
			grid-template-columns: repeat(2, 1fr);
		}
		.modal-body :global(.form-grid.three),
		.modal-body :global(.form-grid.two) {
			grid-template-columns: 1fr;
		}
		.close-confirmation {
			padding: 20px;
		}
	}
</style>
