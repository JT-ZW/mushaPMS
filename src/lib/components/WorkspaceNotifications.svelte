<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	let { organizationId } = $props<{ organizationId: string }>();
	type Item = { id: string; title: string; detail: string; at: string; section: string };
	let items = $state<Item[]>([]);
	let read = $state<string[]>([]);
	let open = $state(false);
	let loading = $state(true);
	let failed = $state(false);
	let limit = $state(50);
	let storageKey = '';
	let busy = false;
	let controller: AbortController | undefined;
	const unread = $derived(items.filter((item) => !read.includes(item.id)).length);
	function save() {
		try {
			localStorage.setItem(storageKey, JSON.stringify(read.slice(-1000)));
		} catch {
			/* Storage may be disabled. Keep read state in memory. */
		}
	}
	function mark(id?: string) {
		read = [...new Set([...read, ...(id ? [id] : items.map((item) => item.id))])];
		save();
	}
	async function update() {
		if (busy) return;
		busy = true;
		controller = new AbortController();
		try {
			const response = await fetch(
				resolve(`/api/workspace/${organizationId}/notifications`) + `?limit=${limit}`,
				{ signal: controller.signal }
			);
			if (!response.ok) throw new Error('Unavailable');
			const data = await response.json();
			const key = `musha-notifications:${data.userId}:${organizationId}`;
			if (key !== storageKey) {
				storageKey = key;
				try {
					const saved = JSON.parse(localStorage.getItem(key) || '[]');
					read = Array.isArray(saved) ? saved.filter((value) => typeof value === 'string') : [];
				} catch {
					read = [];
				}
			}
			items = data.items;
			failed = false;
		} catch (e) {
			if (!(e instanceof DOMException && e.name === 'AbortError')) failed = true;
		} finally {
			busy = false;
			loading = false;
		}
	}
	onMount(() => {
		void update();
		const interval = setInterval(() => {
			if (!document.hidden) void update();
		}, 15000);
		const resume = () => {
			if (!document.hidden) void update();
		};
		window.addEventListener('focus', resume);
		document.addEventListener('visibilitychange', resume);
		return () => {
			clearInterval(interval);
			controller?.abort();
			window.removeEventListener('focus', resume);
			document.removeEventListener('visibilitychange', resume);
		};
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape') open = false;
	}}
/>
<div class="notification-center">
	<button
		class="bell"
		type="button"
		aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
		aria-expanded={open}
		aria-controls="workspace-notifications"
		onclick={() => {
			open = !open;
			if (open) void update();
		}}
		><svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></svg
		>{#if unread}<span class="badge">{unread > 99 ? '99+' : unread}</span>{/if}</button
	>
	{#if open}<div
			class="notification-panel"
			id="workspace-notifications"
			role="region"
			aria-label="Workspace notifications"
		>
			<header>
				<div>
					<strong>Notifications</strong><small>{unread} unread · checks every 15 seconds</small>
				</div>
				<button type="button" onclick={() => (open = false)} aria-label="Close notifications"
					>✕</button
				>
			</header>
			<div class="tools">
				<button type="button" onclick={() => mark()} disabled={!unread}>Mark all read</button
				><button type="button" onclick={() => void update()}>Refresh</button>
			</div>
			{#if failed}<p role="status" class="message">
					Unable to update. Your previous notifications are shown. Retrying automatically.
				</p>{/if}{#if loading}<p class="message">
					Loading activity…
				</p>{:else if !items.length && !failed}<p class="message">
					No workspace activity yet.
				</p>{/if}
			<div class="notification-list">
				{#each items as item (item.id)}<a
						class:unread={!read.includes(item.id)}
						href={resolve(`/workspace/${organizationId}/${item.section}`)}
						onclick={() => {
							mark(item.id);
							open = false;
						}}
						><span class="dot"></span>
						<div>
							<strong>{item.title}</strong>
							<p>{item.detail}</p>
							<time datetime={item.at}
								>{new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(
									new Date(item.at)
								)}</time
							>
						</div>
						<span aria-hidden="true">↗</span></a
					>{/each}
			</div>
			{#if items.length >= limit && limit < 200}<button
					class="load-more"
					type="button"
					onclick={() => {
						limit += 50;
						void update();
					}}>Show more activity</button
				>{/if}
			<footer>Read status is saved on this device.</footer>
		</div>{/if}
</div>

<style>
	.notification-center {
		position: relative;
		z-index: 40;
	}
	.bell {
		position: relative;
		width: 40px;
		height: 40px;
		border: 1px solid #d6decb;
		border-radius: 50%;
		background: #fffefa;
		color: #456239;
		display: grid;
		place-items: center;
		cursor: pointer;
	}
	.bell svg {
		width: 19px;
		height: 19px;
	}
	.badge {
		position: absolute;
		top: -5px;
		right: -5px;
		background: #355c42;
		border: 2px solid #f2f4ec;
		color: white;
		font-size: 8px;
		min-width: 19px;
		padding: 3px;
		border-radius: 20px;
	}
	.notification-panel {
		position: absolute;
		right: 0;
		top: 50px;
		width: min(400px, 86vw);
		background: #fffefa;
		border: 1px solid #dce3d0;
		border-radius: 12px;
		box-shadow: 0 18px 60px #203d3225;
		overflow: hidden;
		color: #294333;
	}
	.notification-panel header {
		display: flex;
		justify-content: space-between;
		gap: 20px;
		padding: 20px;
	}
	.notification-panel header strong {
		font-size: 15px;
		font-weight: 500;
	}
	.notification-panel small {
		display: block;
		font-size: 9px;
		color: #839373;
		margin-top: 8px;
	}
	.notification-panel button {
		font: inherit;
		font-size: 10px;
		color: #61794f;
		border: 0;
		background: transparent;
		cursor: pointer;
	}
	.tools {
		display: flex;
		justify-content: space-between;
		padding: 0 20px 14px;
		border-bottom: 1px solid #e7ebdf;
	}
	.notification-list {
		max-height: 390px;
		overflow-y: auto;
	}
	.notification-list a {
		display: flex;
		gap: 12px;
		padding: 17px 20px;
		text-decoration: none;
		color: inherit;
		border-bottom: 1px solid #edf0e6;
	}
	.notification-list a.unread {
		background: #f0f5e7;
	}
	.notification-list a > div {
		flex: 1;
		min-width: 0;
	}
	.notification-list strong {
		font-size: 11px;
		font-weight: 500;
		text-transform: capitalize;
		overflow-wrap: anywhere;
	}
	.notification-list p {
		font-size: 10px;
		color: #7b8d68;
		margin: 7px 0;
		line-height: 1.7;
	}
	.notification-list time {
		font-size: 8px;
		color: #8b987b;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: transparent;
		margin-top: 5px;
		flex: none;
	}
	.unread .dot {
		background: #6b8d4e;
	}
	.notification-panel footer,
	.message {
		font-size: 9px;
		color: #8b987d;
		padding: 16px 20px;
		margin: 0;
		line-height: 1.8;
	}
	.load-more {
		display: block;
		margin: 15px auto;
	}
	.notification-center button:focus-visible,
	.notification-center a:focus-visible {
		outline: 2px solid #8fa375;
		outline-offset: -3px;
	}
	.notification-panel button:disabled {
		opacity: 0.4;
		cursor: default;
	}
</style>
