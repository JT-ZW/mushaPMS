import type { SubmitFunction } from '@sveltejs/kit';
/** Keep a workspace tab and entered values intact when a server action fails. */
export const workspaceSubmit: SubmitFunction = ({ formElement, submitter, cancel }) => {
	if (formElement.dataset.submitting === 'true') {
		cancel();
		return;
	}
	formElement.dataset.submitting = 'true';
	formElement.setAttribute('aria-busy', 'true');
	const button = submitter instanceof HTMLButtonElement ? submitter : null;
	if (button) button.disabled = true;
	return async ({ result, update }) => {
		try {
			await update({
				reset:
					result.type === 'success' &&
					result.data?.success !== false &&
					formElement.dataset.resetOnSuccess === 'true'
			});
		} finally {
			delete formElement.dataset.submitting;
			formElement.removeAttribute('aria-busy');
			if (button) button.disabled = false;
		}
	};
};
