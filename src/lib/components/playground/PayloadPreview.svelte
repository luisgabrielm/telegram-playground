<script lang="ts">
	import type { PayloadEncoding } from '$lib/playground/payload';

	type Props = {
		titleId: string;
		payload: unknown;
		encoding?: PayloadEncoding;
	};

	let { titleId, payload, encoding = 'json' }: Props = $props();
	let copiedValue = $state<string | null>(null);
	let failedValue = $state<string | null>(null);
	const serialized = $derived(JSON.stringify(payload, null, 2));
	const copyStatus = $derived(
		copiedValue === serialized ? 'copied' : failedValue === serialized ? 'error' : 'idle'
	);

	async function copyPayload() {
		const value = serialized;

		try {
			await writeClipboard(value);
			copiedValue = value;
			failedValue = null;
		} catch {
			copiedValue = null;
			failedValue = value;
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
				// Fall through for browsers that deny or do not complete Clipboard API writes.
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
</script>

<section class="payload-preview" aria-labelledby={titleId}>
	<header>
		<div>
			<h3 id={titleId}>Payload preview</h3>
			<p>
				{encoding === 'multipart' ? 'multipart/form-data · file contents omitted' : 'JSON request body'}
			</p>
		</div>
		<button type="button" onclick={copyPayload} aria-label="Copy request payload">
			{copyStatus === 'copied' ? 'Copied' : 'Copy'}
		</button>
	</header>
	<pre><code>{serialized}</code></pre>
	<p class:error={copyStatus === 'error'} class="copy-status" aria-live="polite">
		{copyStatus === 'copied'
			? 'Payload copied to clipboard.'
			: copyStatus === 'error'
				? 'Could not copy the payload. Select the JSON and copy it manually.'
				: ''}
	</p>
</section>

<style>
	.payload-preview {
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 0.45rem;
		background: #19232e;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid #34414d;
		background: #222e39;
		padding: 0.7rem 0.8rem;
	}

	h3,
	p {
		margin: 0;
	}

	h3 {
		color: #f0f5f8;
		font-size: 0.7rem;
	}

	header p {
		margin-top: 0.2rem;
		color: #9eb0be;
		font-size: 0.58rem;
	}

	button {
		border: 1px solid #52616e;
		border-radius: 0.32rem;
		background: #2c3945;
		padding: 0.35rem 0.55rem;
		color: #e8f0f5;
		font: inherit;
		font-size: 0.62rem;
		font-weight: 700;
		cursor: pointer;
	}

	button:hover {
		background: #394754;
	}

	button:focus-visible {
		outline: 3px solid rgba(74, 178, 226, 0.35);
		outline-offset: 2px;
	}

	pre {
		max-height: 18rem;
		margin: 0;
		overflow: auto;
		padding: 0.85rem;
		color: #dae5ed;
		font-size: 0.65rem;
		line-height: 1.55;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.copy-status {
		min-height: 1.65rem;
		border-top: 1px solid #34414d;
		padding: 0.45rem 0.8rem;
		color: #8ed8b9;
		font-size: 0.6rem;
	}

	.copy-status.error {
		color: #ffadb5;
	}
</style>
