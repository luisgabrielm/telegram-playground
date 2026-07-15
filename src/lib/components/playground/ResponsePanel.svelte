<script lang="ts">
	import type { Snippet } from 'svelte';
	import RawJson from './RawJson.svelte';

	type Props = {
		titleId: string;
		status?: 'success' | 'error';
		rawResponse?: unknown;
		children: Snippet;
	};

	let { titleId, status, rawResponse, children }: Props = $props();
</script>

<section class="response-panel" aria-labelledby={titleId} aria-live="polite">
	<div class="panel-header">
		<h2 id={titleId}>Response</h2>
		{#if status}
			<span class:success-code={status === 'success'} class="response-code">
				{status === 'success' ? '200 OK' : 'ERROR'}
			</span>
		{/if}
	</div>
	{@render children()}
	{#if rawResponse}
		<RawJson value={rawResponse} />
	{/if}
</section>

<style>
	.response-panel {
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 0.55rem;
		background: var(--surface);
		box-shadow: 0 1px 2px rgba(20, 31, 43, 0.03);
	}

	.panel-header {
		display: flex;
		min-height: 2.8rem;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid var(--border);
		background: var(--surface-muted);
		padding: 0.85rem 1.25rem;
	}

	.panel-header h2 {
		margin: 0;
		font-size: 0.82rem;
	}

	.response-code {
		border-radius: 999px;
		background: var(--danger-soft);
		padding: 0.25rem 0.5rem;
		color: var(--danger);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.59rem;
		font-weight: 700;
	}

	.response-code.success-code {
		background: var(--success-soft);
		color: var(--success);
	}
</style>
