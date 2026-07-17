<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import { untrack } from 'svelte';
	import EmptyResponse from '$lib/components/playground/EmptyResponse.svelte';
	import FormField from '$lib/components/playground/FormField.svelte';
	import MethodLayout from '$lib/components/playground/MethodLayout.svelte';
	import Notice from '$lib/components/playground/Notice.svelte';
	import PayloadPreview from '$lib/components/playground/PayloadPreview.svelte';
	import RequestPanel from '$lib/components/playground/RequestPanel.svelte';
	import ResponsePanel from '$lib/components/playground/ResponsePanel.svelte';
	import SubmitButton from '$lib/components/playground/SubmitButton.svelte';
	import { buildAnswerCallbackQueryPayload } from '$lib/playground/payload';
	import type { AnswerCallbackQueryFeedback, MethodComponentProps } from '$lib/playground/types';

	let { initialFeedback }: MethodComponentProps = $props();
	const initial = untrack(() =>
		initialFeedback?.action === 'answerCallbackQuery' ? initialFeedback : null
	);
	let pending = $state(false);
	let feedback = $state<AnswerCallbackQueryFeedback | null>(initial);
	let callbackQueryId = $state(initial?.fields?.callbackQueryId ?? '');
	let text = $state(initial?.fields?.text ?? '');
	let showAlert = $state(initial?.fields?.showAlert === 'true');
	let url = $state(initial?.fields?.url ?? '');
	let cacheTime = $state(initial?.fields?.cacheTime ?? '');
	const payload = $derived(
		buildAnswerCallbackQueryPayload({ callbackQueryId, text, showAlert, url, cacheTime })
	);

	const enhanceForm: SubmitFunction = () => {
		pending = true;
		feedback = null;
		return async ({ result, update }) => {
			try {
				feedback = getFeedback(result);
				await update({ reset: false, invalidateAll: false });
			} finally {
				pending = false;
			}
		};
	};

	function getFeedback(result: ActionResult): AnswerCallbackQueryFeedback | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const value = result.data as AnswerCallbackQueryFeedback;
		return value.action === 'answerCallbackQuery' ? value : null;
	}
</script>

<MethodLayout
	apiMethod="answerCallbackQuery"
	title="Answer callback query"
	description="Acknowledge an inline callback button and optionally show feedback to the user."
	documentationUrl="https://core.telegram.org/bots/api#answercallbackquery"
>
	{#snippet request()}
		<RequestPanel titleId="answer-callback-request-title" subtitle="Callback acknowledgement">
			<form method="POST" action="?/answerCallbackQuery" use:enhance={enhanceForm} aria-busy={pending}>
				<FormField label="callback_query_id" inputId="callback-query-id" meta="String · required" help="Copy callback_query.id from a received webhook update." error={feedback?.fieldErrors?.callbackQueryId}>
					{#snippet children({ describedBy, invalid })}<input id="callback-query-id" name="callbackQueryId" bind:value={callbackQueryId} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
				</FormField>
				<FormField label="text" inputId="callback-text" meta="String · optional" help="Notification text, up to 200 characters." error={feedback?.fieldErrors?.text}>
					{#snippet children({ describedBy, invalid })}<input id="callback-text" name="text" bind:value={text} maxlength="200" aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
				</FormField>
				<label class="checkbox"><input type="checkbox" name="showAlert" value="true" bind:checked={showAlert} /> Show as an alert</label>
				<FormField label="url" inputId="callback-url" meta="String · optional" help="Game or deep-link URL opened by the client." error={feedback?.fieldErrors?.url}>
					{#snippet children({ describedBy, invalid })}<input id="callback-url" name="url" type="url" bind:value={url} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
				</FormField>
				<FormField label="cache_time" inputId="callback-cache-time" meta="Integer · optional" help="Client-side cache duration in seconds; defaults to 0." error={feedback?.fieldErrors?.cacheTime}>
					{#snippet children({ describedBy, invalid })}<input id="callback-cache-time" name="cacheTime" type="number" min="0" step="1" bind:value={cacheTime} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
				</FormField>
				<PayloadPreview titleId="answer-callback-payload-title" {payload} />
				<SubmitButton {pending} />
			</form>
		</RequestPanel>
	{/snippet}
	{#snippet response()}
		<ResponsePanel titleId="answer-callback-response-title" status={feedback ? (feedback.success ? 'success' : 'error') : undefined} rawResponse={feedback?.response}>
			{#if feedback?.success}<Notice kind="success" title="Callback answered"><p>Telegram acknowledged the callback query.</p></Notice>
			{:else if feedback?.error}<Notice kind="error" title="Request failed"><p>{feedback.error}</p></Notice>
			{:else}<EmptyResponse />{/if}
		</ResponsePanel>
	{/snippet}
</MethodLayout>

<style>
	form { display: grid; gap: 1.15rem; }
	input:not([type='checkbox']) { width: 100%; border: 1px solid var(--border-strong); border-radius: 0.4rem; background: var(--surface); padding: 0.7rem 0.75rem; color: var(--text); font: inherit; font-size: 0.78rem; }
	input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(22, 138, 192, 0.1); outline: none; }
	input[aria-invalid='true'] { border-color: #d46a74; }
	.checkbox { display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.72rem; }
</style>
