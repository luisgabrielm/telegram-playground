<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import { untrack } from 'svelte';
	import ReplyMarkupEditor from '$lib/components/reply-markup/ReplyMarkupEditor.svelte';
	import EmptyResponse from '$lib/components/playground/EmptyResponse.svelte';
	import FormField from '$lib/components/playground/FormField.svelte';
	import MethodLayout from '$lib/components/playground/MethodLayout.svelte';
	import Notice from '$lib/components/playground/Notice.svelte';
	import PayloadPreview from '$lib/components/playground/PayloadPreview.svelte';
	import RequestPanel from '$lib/components/playground/RequestPanel.svelte';
	import ResponsePanel from '$lib/components/playground/ResponsePanel.svelte';
	import SubmitButton from '$lib/components/playground/SubmitButton.svelte';
	import { buildEditMessageReplyMarkupPayload } from '$lib/playground/payload';
	import { restoreReplyMarkup } from '$lib/playground/reply-markup';
	import type { EditMessageReplyMarkupFeedback, MethodComponentProps } from '$lib/playground/types';
	import type { InlineKeyboardMarkup } from '$lib/reply-markup';

	let { initialFeedback }: MethodComponentProps = $props();
	const initial = untrack(() =>
		initialFeedback?.action === 'editMessageReplyMarkup' ? initialFeedback : null
	);
	let pending = $state(false);
	let feedback = $state<EditMessageReplyMarkupFeedback | null>(initial);
	let chatId = $state(initial?.fields?.chatId ?? '');
	let messageId = $state(initial?.fields?.messageId ?? '');
	let inlineMessageId = $state(initial?.fields?.inlineMessageId ?? '');
	let replyMarkup = $state<InlineKeyboardMarkup | undefined>(readMarkup(initial?.fields?.replyMarkup));
	const payload = $derived(buildEditMessageReplyMarkupPayload({ chatId, messageId, inlineMessageId, replyMarkup }));

	function readMarkup(value?: string): InlineKeyboardMarkup | undefined {
		const restored = restoreReplyMarkup(value);
		return restored && 'inline_keyboard' in restored ? restored : undefined;
	}

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

	function getFeedback(result: ActionResult): EditMessageReplyMarkupFeedback | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const value = result.data as EditMessageReplyMarkupFeedback;
		return value.action === 'editMessageReplyMarkup' ? value : null;
	}
</script>

<MethodLayout apiMethod="editMessageReplyMarkup" title="Edit inline keyboard" description="Replace or remove the inline keyboard attached to an existing message." documentationUrl="https://core.telegram.org/bots/api#editmessagereplymarkup">
	{#snippet request()}
		<RequestPanel titleId="edit-keyboard-request-title" subtitle="Message target and new keyboard">
			<form method="POST" action="?/editMessageReplyMarkup" use:enhance={enhanceForm} aria-busy={pending}>
				<p class="target-error">{feedback?.fieldErrors?.target ?? ''}</p>
				<div class="target-grid">
					<FormField label="chat_id" inputId="edit-keyboard-chat-id" meta="String · conditional" help="Required together with message_id." error={feedback?.fieldErrors?.chatId}>
						{#snippet children({ describedBy, invalid })}<input id="edit-keyboard-chat-id" name="chatId" bind:value={chatId} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
					</FormField>
					<FormField label="message_id" inputId="edit-keyboard-message-id" meta="Integer · conditional" help="Required together with chat_id." error={feedback?.fieldErrors?.messageId}>
						{#snippet children({ describedBy, invalid })}<input id="edit-keyboard-message-id" name="messageId" type="number" min="1" step="1" bind:value={messageId} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
					</FormField>
				</div>
				<div class="separator"><span>or</span></div>
				<FormField label="inline_message_id" inputId="edit-keyboard-inline-id" meta="String · conditional" help="Use instead of chat_id and message_id for inline-mode messages." error={feedback?.fieldErrors?.inlineMessageId}>
					{#snippet children({ describedBy, invalid })}<input id="edit-keyboard-inline-id" name="inlineMessageId" bind:value={inlineMessageId} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
				</FormField>
				<ReplyMarkupEditor bind:value={replyMarkup} errors={feedback?.replyMarkupErrors} idPrefix="edit-inline-keyboard" allowedModes={['none', 'inline']} />
				<p class="editor-help">Choose None to remove the current inline keyboard.</p>
				<PayloadPreview titleId="edit-keyboard-payload-title" {payload} />
				<SubmitButton {pending} />
			</form>
		</RequestPanel>
	{/snippet}
	{#snippet response()}
		<ResponsePanel titleId="edit-keyboard-response-title" status={feedback ? (feedback.success ? 'success' : 'error') : undefined} rawResponse={feedback?.response}>
			{#if feedback?.success}<Notice kind="success" title="Keyboard updated"><p>Telegram accepted the new inline keyboard configuration.</p></Notice>
			{:else if feedback?.error}<Notice kind="error" title="Request failed"><p>{feedback.error}</p></Notice>
			{:else}<EmptyResponse />{/if}
		</ResponsePanel>
	{/snippet}
</MethodLayout>

<style>
	form { display: grid; gap: 1.15rem; }
	.target-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	input { width: 100%; border: 1px solid var(--border-strong); border-radius: 0.4rem; background: var(--surface); padding: 0.7rem 0.75rem; color: var(--text); font: inherit; font-size: 0.78rem; }
	input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(22, 138, 192, 0.1); outline: none; }
	input[aria-invalid='true'] { border-color: #d46a74; }
	.target-error { margin: 0; color: var(--danger); font-size: 0.68rem; }
	.target-error:empty { display: none; }
	.separator { display: flex; align-items: center; gap: 0.5rem; color: var(--text-subtle); font-size: 0.65rem; }
	.separator::before, .separator::after { height: 1px; flex: 1; background: var(--border); content: ''; }
	.editor-help { margin: -0.7rem 0 0; color: var(--text-subtle); font-size: 0.68rem; }
	@media (max-width: 560px) { .target-grid { grid-template-columns: 1fr; } }
</style>
