<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import { untrack } from 'svelte';
	import ReplyMarkupEditor from '$lib/components/reply-markup/ReplyMarkupEditor.svelte';
	import EmptyResponse from '$lib/components/playground/EmptyResponse.svelte';
	import FormField from '$lib/components/playground/FormField.svelte';
	import MethodLayout from '$lib/components/playground/MethodLayout.svelte';
	import MessageOptionsEditor from '$lib/components/playground/MessageOptionsEditor.svelte';
	import Notice from '$lib/components/playground/Notice.svelte';
	import PayloadPreview from '$lib/components/playground/PayloadPreview.svelte';
	import RequestPanel from '$lib/components/playground/RequestPanel.svelte';
	import ResponsePanel from '$lib/components/playground/ResponsePanel.svelte';
	import SubmitButton from '$lib/components/playground/SubmitButton.svelte';
	import { buildSendContactPayload } from '$lib/playground/payload';
	import { buildMessageOptionsPayload } from '$lib/playground/message-options';
	import { createMessageOptionsValue } from '$lib/message-options';
	import { restoreReplyMarkup } from '$lib/playground/reply-markup';
	import type { ContactFeedback, MethodComponentProps } from '$lib/playground/types';
	import type { TelegramReplyMarkup } from '$lib/reply-markup';
	const vcardPlaceholder = 'BEGIN:VCARD\nVERSION:4.0\nEND:VCARD';

	let { initialFeedback }: MethodComponentProps = $props();
	const initial = untrack(() => initialFeedback?.action === 'sendContact' ? initialFeedback : null);
	let pending = $state(false);
	let feedback = $state<ContactFeedback | null>(initial);
	let chatId = $state(initial?.fields?.chatId ?? '');
	let phoneNumber = $state(initial?.fields?.phoneNumber ?? '');
	let firstName = $state(initial?.fields?.firstName ?? '');
	let lastName = $state(initial?.fields?.lastName ?? '');
	let vcard = $state(initial?.fields?.vcard ?? '');
	let messageOptions = $state(createMessageOptionsValue(initial?.fields?.messageOptions));
	let replyMarkup = $state<TelegramReplyMarkup | undefined>(restoreReplyMarkup(initial?.fields?.replyMarkup));
	const requestPayload = $derived({
		...buildSendContactPayload({ chatId, phoneNumber, firstName, lastName, vcard, replyMarkup }),
		...buildMessageOptionsPayload(messageOptions, false)
	});
	const sentMessage = $derived(messageResult(feedback?.response));

	const enhanceForm: SubmitFunction = () => {
		pending = true;
		feedback = null;
		return async ({ result, update }) => {
			try {
				feedback = getFeedback(result);
				await update({ reset: false, invalidateAll: false });
			} finally { pending = false; }
		};
	};

	function getFeedback(result: ActionResult): ContactFeedback | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const value = result.data as ContactFeedback;
		return value.action === 'sendContact' ? value : null;
	}

	function messageResult(response: unknown): { message_id: number; chat: { id: number } } | null {
		if (!response || typeof response !== 'object' || !('ok' in response) || response.ok !== true || !('result' in response)) return null;
		const result = response.result;
		if (!result || typeof result !== 'object' || !('message_id' in result) || !('chat' in result)) return null;
		const chat = result.chat;
		if (!chat || typeof chat !== 'object' || !('id' in chat)) return null;
		return result as { message_id: number; chat: { id: number } };
	}
</script>

<MethodLayout apiMethod="sendContact" title="Contact" description="Send a phone contact with optional name and vCard data." documentationUrl="https://core.telegram.org/bots/api#sendcontact">
	{#snippet request()}
		<RequestPanel titleId="send-contact-request-title" subtitle="Required and optional parameters">
			<form method="POST" action="?/sendContact" use:enhance={enhanceForm} aria-busy={pending}>
				<FormField label="chat_id" inputId="contact-chat-id" meta="String · required" help="Numeric chat ID or public channel username." error={feedback?.fieldErrors?.chatId}>
					{#snippet children({ describedBy, invalid })}<input id="contact-chat-id" name="chatId" bind:value={chatId} placeholder="123456789 or @channel" aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
				</FormField>
				<div class="field-grid">
					<FormField label="phone_number" inputId="contact-phone" meta="String · required" help="Include the country code when possible." error={feedback?.fieldErrors?.phoneNumber}>
						{#snippet children({ describedBy, invalid })}<input id="contact-phone" name="phoneNumber" type="tel" bind:value={phoneNumber} placeholder="+55 11 99999-9999" aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
					</FormField>
					<FormField label="first_name" inputId="contact-first-name" meta="String · required" help="Contact's given name." error={feedback?.fieldErrors?.firstName}>
						{#snippet children({ describedBy, invalid })}<input id="contact-first-name" name="firstName" bind:value={firstName} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
					</FormField>
				</div>
				<FormField label="last_name" inputId="contact-last-name" meta="String · optional" help="Contact's family name." error={feedback?.fieldErrors?.lastName}>
					{#snippet children({ describedBy, invalid })}<input id="contact-last-name" name="lastName" bind:value={lastName} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
				</FormField>
				<FormField label="vcard" inputId="contact-vcard" meta={`${new TextEncoder().encode(vcard).length}/2048 bytes`} metaInvalid={new TextEncoder().encode(vcard).length > 2048} help="Additional contact data in vCard format." error={feedback?.fieldErrors?.vcard}>
					{#snippet children({ describedBy, invalid })}<textarea id="contact-vcard" name="vcard" rows="6" bind:value={vcard} placeholder={vcardPlaceholder} aria-describedby={describedBy} aria-invalid={invalid}></textarea>{/snippet}
				</FormField>
				<ReplyMarkupEditor bind:value={replyMarkup} errors={feedback?.replyMarkupErrors} idPrefix="send-contact-reply" />
				<MessageOptionsEditor bind:value={messageOptions} errors={feedback?.messageOptionsErrors} idPrefix="send-contact-options" showParseMode={false} />
				<PayloadPreview titleId="send-contact-payload-title" payload={requestPayload} />
				<SubmitButton {pending} />
			</form>
		</RequestPanel>
	{/snippet}
	{#snippet response()}
		<ResponsePanel titleId="send-contact-response-title" status={feedback?.response ? (feedback.success ? 'success' : 'error') : undefined} rawResponse={feedback?.response}>
			{#if feedback?.success && sentMessage}<Notice kind="success" title="Contact sent"><p>Message <code>#{sentMessage.message_id}</code> sent to chat <code>{sentMessage.chat.id}</code>.</p></Notice>
			{:else if feedback?.error}<Notice kind="error" title="Request failed"><p>{feedback.error}</p></Notice>
			{:else}<EmptyResponse />{/if}
		</ResponsePanel>
	{/snippet}
</MethodLayout>

<style>
	form { display: grid; gap: 1.15rem; }
	.field-grid { display: grid; gap: 1.15rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
	input, textarea { width: 100%; border: 1px solid var(--border-strong); border-radius: 0.4rem; background: var(--surface); padding: 0.7rem 0.75rem; color: var(--text); font: inherit; font-size: 0.78rem; }
	textarea { resize: vertical; }
	input:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(22, 138, 192, 0.1); outline: none; }
	input[aria-invalid='true'], textarea[aria-invalid='true'] { border-color: #d46a74; }
	@media (max-width: 620px) { .field-grid { grid-template-columns: 1fr; } }
</style>
