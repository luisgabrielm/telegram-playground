<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		apiMethod: string;
		title: string;
		description: string;
		documentationUrl: string;
		request: Snippet;
		response: Snippet;
	};

	let { apiMethod, title, description, documentationUrl, request, response }: Props = $props();
</script>

<header class="method-header">
	<div>
		<div class="method-meta"><span>POST</span><code>{apiMethod}</code></div>
		<h1>{title}</h1>
		<p>{description}</p>
	</div>
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a href={documentationUrl} target="_blank" rel="noreferrer">
		API reference <span aria-hidden="true">↗</span>
	</a>
</header>

<div class="workspace">
	{@render request()}
	{@render response()}
</div>

<style>
	.method-header {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 2rem;
		max-width: 1120px;
		margin: 0 auto 1.5rem;
	}

	.method-meta {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin-bottom: 0.55rem;
	}

	.method-meta span {
		border-radius: 0.25rem;
		background: #e9f7f1;
		padding: 0.2rem 0.35rem;
		color: var(--success);
		font-size: 0.6rem;
		font-weight: 800;
	}

	.method-meta code {
		color: var(--text-muted);
		font-size: 0.72rem;
	}

	.method-header h1 {
		margin: 0;
		font-size: 1.65rem;
		letter-spacing: -0.025em;
	}

	.method-header p {
		margin: 0.4rem 0 0;
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	.method-header > a {
		flex: 0 0 auto;
		color: var(--accent);
		font-size: 0.72rem;
		font-weight: 650;
		text-decoration: none;
	}

	.method-header > a:hover {
		text-decoration: underline;
	}

	.workspace {
		display: grid;
		max-width: 1120px;
		margin: 0 auto;
		grid-template-columns: minmax(0, 1fr) minmax(20rem, 0.85fr);
		gap: 1rem;
		align-items: start;
	}

	a:focus-visible {
		outline: 3px solid rgba(22, 138, 192, 0.2);
		outline-offset: 2px;
	}

	@media (max-width: 850px) {
		.workspace {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 560px) {
		.method-header {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.65rem;
		}

		.method-header h1 {
			font-size: 1.4rem;
		}
	}
</style>
