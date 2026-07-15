<script lang="ts">
	import { untrack } from 'svelte';
	import { methodGroups, methods, isMethodId } from '$lib/playground/methods';
	import type { MethodFeedback, MethodId } from '$lib/playground/types';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const initialForm = untrack(() => form) as MethodFeedback | null;
	let activeMethod = $state<MethodId>(
		isMethodId(initialForm?.action) ? initialForm.action : methods[0].id
	);
</script>

<svelte:head>
	<title>Telegram API Playground</title>
	<meta name="description" content="Internal tool for testing Telegram Bot API methods." />
</svelte:head>

<div class="app-shell">
	<header class="topbar">
		<div class="product-name">
			<span class="product-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24">
					<path d="M20.7 3.4 3.8 9.9c-1.2.5-1.2 1.2-.2 1.5l4.3 1.3 1.7 5.2c.2.6.1.9.8.9.5 0 .8-.2 1-.4l2.1-2 4.4 3.2c.8.4 1.4.2 1.6-.8l2.8-13.5c.3-1.2-.5-1.8-1.6-1.9ZM9.5 12.4l8.4-5.3c.4-.3.8-.1.5.2l-6.9 6.3-.3 3.4-1.7-4.6Z" />
				</svg>
			</span>
			<div>
				<strong>Telegram API Playground</strong>
				<span>Local development tool</span>
			</div>
		</div>

		<div class:configured={data.configured} class="config-status">
			<span class="status-dot"></span>
			{data.configured ? 'Token configured' : 'Token not configured'}
		</div>
	</header>

	<div class="app-body">
		<aside class="sidebar">
			<nav aria-label="Telegram API methods">
				{#each methodGroups as group (group.label)}
					<div class="method-group">
						<p>{group.label}</p>
						<div class="method-list">
							{#each group.methods as method (method.id)}
								<button
									type="button"
									class:active={activeMethod === method.id}
									aria-current={activeMethod === method.id ? 'page' : undefined}
									onclick={() => (activeMethod = method.id)}
								>
									<span>{method.label}</span>
									<code>{method.apiMethod}</code>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</nav>

			<div class="sidebar-footer">
				<span>Environment</span>
				<code>TELEGRAM_BOT_TOKEN</code>
			</div>
		</aside>

		<main>
			{#each methods as method (method.id)}
				{@const MethodComponent = method.component}
				<div hidden={activeMethod !== method.id}>
					<MethodComponent configured={data.configured} initialFeedback={initialForm} />
				</div>
			{/each}
		</main>
	</div>
</div>

<style>
	:global(:root) {
		--bg: #f6f7f9;
		--surface: #ffffff;
		--surface-muted: #f9fafb;
		--border: #dfe3e8;
		--border-strong: #cdd3da;
		--text: #1d2733;
		--text-muted: #697586;
		--text-subtle: #8b95a3;
		--accent: #168ac0;
		--accent-soft: #e9f5fa;
		--success: #16805a;
		--success-soft: #edf8f3;
		--danger: #b63d49;
		--danger-soft: #fff1f2;
		--warning: #795d17;
		--warning-soft: #fff9e8;
	}

	.app-shell {
		min-height: 100vh;
		background: var(--bg);
		color: var(--text);
	}

	.topbar {
		display: flex;
		height: 4rem;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--border);
		background: var(--surface);
		padding: 0 1.25rem;
	}

	.product-name {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}

	.product-icon {
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		border-radius: 0.45rem;
		background: #229ed9;
	}

	.product-icon svg {
		width: 1.25rem;
		fill: white;
	}

	.product-name > div {
		display: grid;
		gap: 0.1rem;
	}

	.product-name strong {
		font-size: 0.86rem;
	}

	.product-name div span {
		color: var(--text-subtle);
		font-size: 0.67rem;
	}

	.config-status {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		color: var(--text-muted);
		font-size: 0.72rem;
	}

	.status-dot {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 50%;
		background: #9ba4af;
	}

	.config-status.configured {
		color: var(--success);
	}

	.config-status.configured .status-dot {
		background: #20a071;
	}

	.app-body {
		display: grid;
		min-height: calc(100vh - 4rem);
		grid-template-columns: 15rem minmax(0, 1fr);
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		border-right: 1px solid var(--border);
		background: var(--surface);
		padding: 1.25rem 0.8rem;
	}

	.method-group + .method-group {
		margin-top: 1.35rem;
	}

	.method-group > p,
	.sidebar-footer > span {
		margin: 0 0 0.45rem;
		padding: 0 0.6rem;
		color: var(--text-subtle);
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.method-list {
		display: grid;
		gap: 0.2rem;
	}

	.method-list button {
		display: grid;
		gap: 0.18rem;
		width: 100%;
		border: 0;
		border-radius: 0.42rem;
		background: transparent;
		padding: 0.65rem 0.7rem;
		color: var(--text-muted);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.method-list button:hover {
		background: var(--surface-muted);
		color: var(--text);
	}

	.method-list button.active {
		background: var(--accent-soft);
		color: #116f9a;
	}

	.method-list button span {
		font-size: 0.78rem;
		font-weight: 650;
	}

	.method-list button code {
		color: inherit;
		font-size: 0.63rem;
		opacity: 0.78;
	}

	.method-list button:focus-visible {
		outline: 3px solid rgba(22, 138, 192, 0.2);
		outline-offset: 2px;
	}

	.sidebar-footer {
		display: grid;
		gap: 0.35rem;
		border-top: 1px solid var(--border);
		padding: 1rem 0.2rem 0;
	}

	.sidebar-footer > span {
		padding: 0;
	}

	.sidebar-footer code {
		color: var(--text-muted);
		font-size: 0.65rem;
	}

	main {
		min-width: 0;
		padding: 2rem clamp(1.25rem, 3vw, 3rem) 3rem;
	}

	@media (max-width: 850px) {
		.app-body {
			display: block;
		}

		.sidebar {
			display: block;
			border-right: 0;
			border-bottom: 1px solid var(--border);
			padding: 0.75rem 1rem;
			overflow-x: auto;
		}

		.sidebar nav {
			display: flex;
			gap: 1.5rem;
			width: max-content;
		}

		.method-group,
		.method-group + .method-group {
			margin: 0;
		}

		.method-list {
			display: flex;
		}

		.method-list button {
			min-width: 9rem;
		}

		.sidebar-footer {
			display: none;
		}
	}

	@media (max-width: 560px) {
		.topbar {
			height: 3.6rem;
			padding: 0 0.9rem;
		}

		.product-name div span {
			display: none;
		}

		.config-status {
			font-size: 0;
		}

		.config-status::after {
			content: 'Token';
			font-size: 0.68rem;
		}

		main {
			padding: 1.3rem 0.9rem 2rem;
		}
	}
</style>
