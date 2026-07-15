<script lang="ts">
	let { pending }: { pending: boolean } = $props();
</script>

<button type="submit" disabled={pending}>
	{#if pending}
		<span aria-hidden="true"></span>Sending request…
	{:else}
		Send request
	{/if}
</button>

<style>
	button {
		display: inline-flex;
		min-height: 2.35rem;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border: 1px solid #117dad;
		border-radius: 0.4rem;
		background: var(--accent);
		padding: 0.55rem 0.85rem;
		color: white;
		font: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
	}

	button:hover:not(:disabled) {
		background: #117dad;
	}

	button:disabled {
		cursor: wait;
		opacity: 0.65;
	}

	button:focus-visible {
		outline: 3px solid rgba(22, 138, 192, 0.2);
		outline-offset: 2px;
	}

	span {
		width: 0.75rem;
		height: 0.75rem;
		border: 2px solid rgba(255, 255, 255, 0.45);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 700ms linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		span {
			animation: none;
		}
	}
</style>
