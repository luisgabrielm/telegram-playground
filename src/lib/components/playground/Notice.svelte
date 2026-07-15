<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		kind: 'warning' | 'error' | 'success';
		title: string;
		children: Snippet;
	};

	let { kind, title, children }: Props = $props();
</script>

<div class={[kind, 'notice']} role={kind === 'error' ? 'alert' : 'status'}>
	<strong>{title}</strong>
	{@render children()}
</div>

<style>
	div {
		margin: 1rem;
		border: 1px solid;
		border-radius: 0.4rem;
		padding: 0.8rem;
	}

	strong {
		font-size: 0.74rem;
	}

	.notice :global(p) {
		margin: 0.3rem 0 0;
		font-size: 0.68rem;
		line-height: 1.5;
	}

	.warning {
		border-color: #ead9a6;
		background: var(--warning-soft);
		color: var(--warning);
	}

	.error {
		border-color: #efc8cd;
		background: var(--danger-soft);
		color: var(--danger);
	}

	.success {
		border-color: #bde1d3;
		background: var(--success-soft);
		color: var(--success);
	}
</style>
