<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	type Toast = { message: string; success: boolean };
	let toast = $state<Toast | null>(null);
	let lastFormKey = $state('');
	let dismissTimer: ReturnType<typeof setTimeout> | undefined;

	const submitVerbs: [string, string][] = [
		['sign in', 'Signing in'],
		['create', 'Creating'],
		['add', 'Adding'],
		['save', 'Saving'],
		['send', 'Sending'],
		['invite', 'Inviting'],
		['record', 'Recording'],
		['log', 'Logging'],
		['queue', 'Queuing'],
		['start', 'Starting'],
		['mark', 'Updating'],
		['remove', 'Removing'],
		['reset', 'Sending']
	];

	const loadingLabel = (button: HTMLButtonElement) => {
		if (button.dataset.loadingText) return button.dataset.loadingText;
		const label = (button.textContent ?? '')
			.replace(/[→➜].*$/u, '')
			.trim()
			.toLowerCase();
		const match = submitVerbs.find(([verb]) => label.startsWith(verb));
		return `${match?.[1] ?? 'Working'}…`;
	};

	const markFormBusy = (form: HTMLFormElement, submitter?: HTMLButtonElement | null) => {
		if (form.dataset.feedbackBusy === 'true') return;
		form.dataset.feedbackBusy = 'true';
		form.setAttribute('aria-busy', 'true');
		const button = submitter ?? form.querySelector<HTMLButtonElement>('button[type="submit"]');
		if (!button || button.dataset.noFeedback === 'true') return;
		button.dataset.feedbackBusy = 'true';
		button.dataset.originalLabel = button.innerHTML;
		button.innerHTML = `<span class="feedback-spinner" aria-hidden="true"></span><span>${loadingLabel(button)}</span>`;
		button.disabled = true;
	};

	const dismiss = () => {
		toast = null;
		if (dismissTimer) clearTimeout(dismissTimer);
	};

	const show = (nextToast: Toast) => {
		toast = nextToast;
		if (dismissTimer) clearTimeout(dismissTimer);
		dismissTimer = setTimeout(dismiss, 5000);
	};

	$effect(() => {
		const form = page.form as { message?: string; success?: boolean } | null;
		if (!form?.message) return;
		const formKey = `${form.success === true ? 'success' : 'error'}:${form.message}`;
		if (formKey === lastFormKey) return;
		lastFormKey = formKey;
		show({ message: form.message, success: form.success === true });
	});

	onMount(() => {
		const onSubmit = (event: SubmitEvent) => {
			const form = event.target;
			if (form instanceof HTMLFormElement) {
				markFormBusy(form, event.submitter instanceof HTMLButtonElement ? event.submitter : null);
			}
		};
		document.addEventListener('submit', onSubmit, true);
		return () => document.removeEventListener('submit', onSubmit, true);
	});
</script>

{#if toast}
	<div class:failure={!toast.success} class="global-toast" role="status" aria-live="polite">
		<span class="toast-mark" aria-hidden="true">{toast.success ? '✓' : '!'}</span>
		<div>
			<strong>{toast.success ? 'Done' : 'Could not complete'}</strong>
			<p>{toast.message}</p>
		</div>
		<button type="button" aria-label="Close notification" onclick={dismiss}>×</button>
	</div>
{/if}

<style>
	.global-toast {
		position: fixed;
		right: 24px;
		bottom: 24px;
		z-index: 1000;
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: start;
		gap: 11px;
		width: min(390px, calc(100vw - 32px));
		border: 1px solid #cfe4d3;
		border-radius: 12px;
		background: #f5fbf3;
		box-shadow: 0 18px 45px rgb(6 47 51 / 18%);
		color: #2e604c;
		padding: 14px 12px 14px 14px;
		animation: toast-in 220ms ease-out both;
	}
	.global-toast.failure {
		border-color: #efd0c6;
		background: #fff7f3;
		color: #955241;
	}
	.toast-mark {
		display: grid;
		place-items: center;
		width: 27px;
		height: 27px;
		border-radius: 50%;
		background: #cfe9bf;
		color: #3d7e50;
		font-size: 14px;
		font-weight: 800;
	}
	.failure .toast-mark {
		background: #f5d8cd;
		color: #a45846;
	}
	.global-toast strong {
		display: block;
		font-size: 13px;
	}
	.global-toast p {
		color: #6f8e7d;
		font-size: 12px;
		line-height: 1.45;
		margin: 3px 0 0;
	}
	.failure p {
		color: #9e6b5c;
	}
	.global-toast button {
		border: 0;
		background: transparent;
		color: #759085;
		cursor: pointer;
		font-size: 22px;
		line-height: 1;
		padding: 0 3px;
	}
	:global(.feedback-spinner) {
		width: 14px;
		height: 14px;
		border: 2px solid rgb(255 255 255 / 38%);
		border-top-color: currentColor;
		border-radius: 50%;
		animation: feedback-spin 700ms linear infinite;
	}
	:global(button:has(.feedback-spinner)) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 9px;
	}
	@keyframes feedback-spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@media (max-width: 560px) {
		.global-toast {
			right: 16px;
			bottom: 16px;
		}
	}
</style>
