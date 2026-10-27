/** Retain the key after a failed/uncertain response; rotate only when the form resets. */
export function submissionKey(form: HTMLFormElement) {
	const input = document.createElement('input');
	input.type = 'hidden';
	input.name = 'submission_key';
	const rotate = () => {
		input.value = crypto.randomUUID();
		input.defaultValue = input.value;
	};
	rotate();
	form.append(input);
	const reset = () => queueMicrotask(rotate);
	form.addEventListener('reset', reset);
	return {
		destroy() {
			form.removeEventListener('reset', reset);
			input.remove();
		}
	};
}
