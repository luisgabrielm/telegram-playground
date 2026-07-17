<script lang="ts">
	import { onMount } from 'svelte';
	import { getTelegramUpdateType, type UpdateEntry } from '$lib/updates';
	import RawJson from './RawJson.svelte';

	let entries = $state<UpdateEntry[]>([]);
	let selectedUpdateId = $state<number | null>(null);
	let loading = $state(true);
	let refreshing = $state(false);
	let clearing = $state(false);
	let error = $state<string | null>(null);
	let copyStatus = $state<'idle' | 'copied' | 'error'>('idle');
	let unreadUpdateIds = $state<number[]>([]);

	const selectedEntry = $derived(
		entries.find((entry) => entry.updateId === selectedUpdateId) ?? null
	);

	onMount(() => {
		void refreshUpdates();

		const interval = window.setInterval(() => {
			void refreshUpdates();
		}, 4000);

		return () => window.clearInterval(interval);
	});

	async function refreshUpdates() {
		if (refreshing) return;
		refreshing = true;

		try {
			const response = await fetch('/api/updates');
			if (!response.ok) throw new Error('The update history request failed.');

			const data = (await response.json()) as { entries: UpdateEntry[] };
			const previousUpdateIds = new Set(entries.map((entry) => entry.updateId));
			const currentUpdateIds = new Set(data.entries.map((entry) => entry.updateId));
			const nextUnreadUpdateIds = unreadUpdateIds.filter((updateId) =>
				currentUpdateIds.has(updateId)
			);

			if (!loading) {
				for (const entry of data.entries) {
					if (!previousUpdateIds.has(entry.updateId)) nextUnreadUpdateIds.push(entry.updateId);
				}
			}

			entries = data.entries;
			error = null;

			if (
				selectedUpdateId === null ||
				!entries.some((entry) => entry.updateId === selectedUpdateId)
			) {
				selectedUpdateId = entries[0]?.updateId ?? null;
			}

			unreadUpdateIds = [...new Set(nextUnreadUpdateIds)].filter(
				(updateId) => updateId !== selectedUpdateId
			);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not load received updates.';
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	async function clearUpdates() {
		clearing = true;
		copyStatus = 'idle';

		try {
			const response = await fetch('/api/updates', { method: 'DELETE' });
			if (!response.ok) throw new Error('The update history could not be cleared.');

			entries = [];
			selectedUpdateId = null;
			unreadUpdateIds = [];
			error = null;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not clear received updates.';
		} finally {
			clearing = false;
		}
	}

	async function copySelectedPayload() {
		if (!selectedEntry) return;

		try {
			await writeClipboard(JSON.stringify(selectedEntry.payload, null, 2));
			copyStatus = 'copied';
		} catch {
			copyStatus = 'error';
		}
	}

	async function writeClipboard(value: string) {
		if (navigator.clipboard) {
			try {
				await Promise.race([
					navigator.clipboard.writeText(value),
					new Promise<never>((_, reject) =>
						setTimeout(() => reject(new Error('Clipboard write timed out')), 750)
					)
				]);
				return;
			} catch {
				// Fall back to a temporary text area when clipboard access is denied.
			}
		}

		const textarea = document.createElement('textarea');
		textarea.value = value;
		textarea.setAttribute('readonly', '');
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.append(textarea);
		textarea.select();
		const copied = document.execCommand('copy');
		textarea.remove();

		if (!copied) throw new Error('Clipboard write failed');
	}

	function readableType(entry: UpdateEntry) {
		return getTelegramUpdateType(entry.payload).replaceAll('_', ' ');
	}

	function selectUpdate(updateId: number) {
		selectedUpdateId = updateId;
		unreadUpdateIds = unreadUpdateIds.filter((id) => id !== updateId);
		copyStatus = 'idle';
	}

	function formatReceivedAt(value: string) {
		return new Intl.DateTimeFormat(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		}).format(new Date(value));
	}
</script>

<aside class="updates-panel" aria-labelledby="received-updates-title">
	<header>
		<div>
			<div class="title-row">
				<h2 id="received-updates-title">Received updates</h2>
				<span>{entries.length}</span>
			</div>
			<p>Webhook payloads stored in memory</p>
		</div>
		<div class="header-actions">
			<button type="button" onclick={refreshUpdates} disabled={refreshing}>
				{refreshing ? 'Refreshing…' : 'Refresh'}
			</button>
			<button type="button" onclick={clearUpdates} disabled={clearing || entries.length === 0}>
				{clearing ? 'Clearing…' : 'Clear'}
			</button>
		</div>
	</header>

	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}

	<div class="update-list" aria-label="Received Telegram updates" aria-busy={loading}>
		{#if loading}
			<p class="empty">Loading updates…</p>
		{:else}
			{#each entries as entry (entry.updateId)}
				<button
					type="button"
					class:active={selectedUpdateId === entry.updateId}
					aria-pressed={selectedUpdateId === entry.updateId}
					onclick={() => selectUpdate(entry.updateId)}
				>
					<span class="update-heading">
						<span class="update-type">{readableType(entry)}</span>
						{#if unreadUpdateIds.includes(entry.updateId)}
							<span class="unread-indicator"><span class="sr-only">Unread</span></span>
						{/if}
					</span>
					<code>update_id: {entry.updateId}</code>
					<time datetime={entry.receivedAt}>{formatReceivedAt(entry.receivedAt)}</time>
				</button>
			{:else}
				<p class="empty">Waiting for a webhook update.</p>
			{/each}
		{/if}
	</div>

	<section class="payload" aria-labelledby="received-payload-title">
		<div class="payload-header">
			<div>
				<h3 id="received-payload-title">Payload</h3>
				{#if selectedEntry}<code>update_id: {selectedEntry.updateId}</code>{/if}
			</div>
			<button type="button" onclick={copySelectedPayload} disabled={!selectedEntry}>
				{copyStatus === 'copied' ? 'Copied' : 'Copy JSON'}
			</button>
		</div>

		{#if selectedEntry}
			<RawJson value={selectedEntry.payload} summary="Formatted JSON" open />
		{:else}
			<p class="empty payload-empty">Select an update to inspect its payload.</p>
		{/if}

		<p class:error-text={copyStatus === 'error'} class="copy-status" aria-live="polite">
			{copyStatus === 'copied'
				? 'Payload copied to clipboard.'
				: copyStatus === 'error'
					? 'Could not copy the payload. Select the JSON and copy it manually.'
					: ''}
		</p>
	</section>
</aside>

<style>
	.updates-panel {
		min-width: 0;
		align-self: start;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 0.55rem;
		background: var(--surface);
		box-shadow: 0 1px 2px rgba(20, 31, 43, 0.03);
	}

	header,
	.title-row,
	.header-actions,
	.payload-header {
		display: flex;
		align-items: center;
	}

	header {
		justify-content: space-between;
		gap: 0.75rem;
		border-bottom: 1px solid var(--border);
		padding: 0.85rem 1rem;
	}

	.title-row {
		gap: 0.45rem;
	}

	h2,
	h3,
	p {
		margin: 0;
	}

	h2 {
		font-size: 0.82rem;
	}

	.title-row span {
		min-width: 1.4rem;
		border-radius: 999px;
		background: var(--surface-muted);
		padding: 0.16rem 0.4rem;
		color: var(--text-muted);
		font-size: 0.6rem;
		font-weight: 700;
		text-align: center;
	}

	header p {
		margin-top: 0.2rem;
		color: var(--text-subtle);
		font-size: 0.65rem;
	}

	.header-actions {
		gap: 0.35rem;
	}

	button {
		border: 1px solid var(--border-strong);
		border-radius: 0.35rem;
		background: var(--surface);
		padding: 0.38rem 0.55rem;
		color: var(--text-muted);
		font: inherit;
		font-size: 0.65rem;
		font-weight: 650;
		cursor: pointer;
	}

	button:hover:not(:disabled) {
		border-color: #aeb7c2;
		color: var(--text);
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	button:focus-visible {
		outline: 3px solid rgba(22, 138, 192, 0.2);
		outline-offset: 2px;
	}

	.error {
		border-bottom: 1px solid #f4cbd0;
		background: var(--danger-soft);
		padding: 0.7rem 1rem;
		color: var(--danger);
		font-size: 0.68rem;
	}

	.update-list {
		display: grid;
		max-height: 18rem;
		overflow: auto;
		border-bottom: 1px solid var(--border);
	}

	.update-list > button {
		display: grid;
		gap: 0.22rem;
		border: 0;
		border-bottom: 1px solid var(--border);
		border-radius: 0;
		padding: 0.7rem 1rem;
		text-align: left;
	}

	.update-list > button:last-child {
		border-bottom: 0;
	}

	.update-list > button.active {
		background: var(--accent-soft);
		box-shadow: inset 3px 0 var(--accent);
	}

	.update-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.update-type {
		color: var(--text);
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: capitalize;
	}

	.unread-indicator {
		width: 0.42rem;
		height: 0.42rem;
		flex: 0 0 auto;
		border-radius: 50%;
		background: var(--accent);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		clip-path: inset(50%);
	}

	.update-list code,
	.update-list time,
	.payload-header code {
		color: var(--text-subtle);
		font-size: 0.61rem;
	}

	.empty {
		padding: 1.2rem 1rem;
		color: var(--text-subtle);
		font-size: 0.7rem;
		text-align: center;
	}

	.payload-header {
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1rem;
	}

	.payload-header h3 {
		font-size: 0.72rem;
	}

	.payload-header code {
		display: block;
		margin-top: 0.18rem;
	}

	.payload-empty {
		border-top: 1px solid var(--border);
	}

	.copy-status {
		min-height: 1.6rem;
		padding: 0.35rem 1rem;
		color: var(--success);
		font-size: 0.62rem;
	}

	.copy-status.error-text {
		color: var(--danger);
	}

	@media (max-width: 560px) {
		header {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
