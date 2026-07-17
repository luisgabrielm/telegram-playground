<script lang="ts">
	type Props = {
		value: unknown;
		summary?: string;
		open?: boolean;
	};

	let { value, summary = 'Raw JSON', open = false }: Props = $props();
</script>

<details {open}>
	<summary>{summary}</summary>
	<pre>{JSON.stringify(value, null, 2)}</pre>
</details>

<style>
	details {
		border-top: 1px solid var(--border);
	}

	summary {
		padding: 0.75rem 1rem;
		color: var(--text-muted);
		font-size: 0.68rem;
		font-weight: 650;
		cursor: pointer;
	}

	pre {
		max-height: 24rem;
		margin: 0;
		overflow: auto;
		border-top: 1px solid var(--border);
		background: #19232e;
		padding: 1rem;
		color: #dae5ed;
		font-size: 0.65rem;
		line-height: 1.6;
		white-space: pre-wrap;
		word-break: break-word;
	}

	summary:focus-visible {
		outline: 3px solid rgba(22, 138, 192, 0.2);
		outline-offset: 2px;
	}
</style>
