<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		label: string;
		inputId: string;
		meta: string;
		help: string;
		error?: string;
		metaInvalid?: boolean;
		children: Snippet<[{ describedBy: string; invalid: boolean }]>;
	};

	let { label, inputId, meta, help, error, metaInvalid = false, children }: Props = $props();
	const helpId = $derived(`${inputId}-help`);
	const errorId = $derived(`${inputId}-error`);
	const describedBy = $derived(error ? `${helpId} ${errorId}` : helpId);
</script>

<div class="field-group">
	<div class="label-row">
		<label for={inputId}>{label}</label>
		<span class:invalid={metaInvalid}>{meta}</span>
	</div>
	{@render children({ describedBy, invalid: Boolean(error) })}
	<p id={helpId} class="field-help">{help}</p>
	{#if error}
		<p id={errorId} class="field-error">{error}</p>
	{/if}
</div>

<style>
	.field-group {
		display: grid;
		gap: 0.45rem;
	}

	.label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.label-row label {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.72rem;
		font-weight: 700;
	}

	.label-row span {
		color: var(--text-subtle);
		font-size: 0.61rem;
	}

	.label-row span.invalid {
		color: var(--danger);
	}

	.field-help,
	.field-error {
		margin: 0;
		font-size: 0.63rem;
		line-height: 1.4;
	}

	.field-help {
		color: var(--text-subtle);
	}

	.field-error {
		color: var(--danger);
		font-weight: 650;
	}

	@media (max-width: 560px) {
		.label-row {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.25rem;
		}
	}
</style>
