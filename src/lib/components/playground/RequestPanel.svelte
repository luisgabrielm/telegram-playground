<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		titleId: string;
		subtitle: string;
		children: Snippet;
	};

	let { titleId, subtitle, children }: Props = $props();
</script>

<section class="request-panel" aria-labelledby={titleId}>
	<div class="panel-header">
		<div>
			<h2 id={titleId}>Request</h2>
			<p>{subtitle}</p>
		</div>
	</div>
	{@render children()}
</section>

<style>
	.request-panel {
		border: 1px solid var(--border);
		border-radius: 0.55rem;
		background: var(--surface);
		box-shadow: 0 1px 2px rgba(20, 31, 43, 0.03);
		padding: 1.25rem;
	}

	.panel-header {
		display: flex;
		min-height: 2.8rem;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid var(--border);
		margin: -1.25rem -1.25rem 1.25rem;
		padding: 0.85rem 1.25rem;
	}

	.panel-header h2 {
		margin: 0;
		font-size: 0.82rem;
	}

	.panel-header p {
		margin: 0.2rem 0 0;
		color: var(--text-subtle);
		font-size: 0.65rem;
	}

	@media (max-width: 560px) {
		.request-panel {
			padding: 1rem;
		}

		.panel-header {
			margin: -1rem -1rem 1rem;
			padding: 0.75rem 1rem;
		}
	}
</style>
