<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import { tick, untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import EmptyResponse from '$lib/components/playground/EmptyResponse.svelte';
	import FormField from '$lib/components/playground/FormField.svelte';
	import MethodLayout from '$lib/components/playground/MethodLayout.svelte';
	import Notice from '$lib/components/playground/Notice.svelte';
	import RequestPanel from '$lib/components/playground/RequestPanel.svelte';
	import ResponsePanel from '$lib/components/playground/ResponsePanel.svelte';
	import SubmitButton from '$lib/components/playground/SubmitButton.svelte';
	import type { MethodComponentProps, SendMessageFeedback } from '$lib/playground/types';
	import type { TelegramApiFailure, TelegramApiSuccess, TelegramMessage } from '$lib/telegram';

	let { initialFeedback }: MethodComponentProps = $props();
	const initial = untrack(() =>
		initialFeedback?.action === 'sendMessage' ? initialFeedback : null
	);
	let pending = $state(false);
	let feedback = $state<SendMessageFeedback | null>(initial);
	let chatId = $state(initial?.fields?.chatId ?? '');
	let messageText = $state(initial?.fields?.text ?? '');
	let chatIdInput: HTMLInputElement | undefined;
	let messageTextInput: HTMLTextAreaElement | undefined;
	const sentMessage = $derived(getResult(feedback?.response));

	const captureChatIdInput: Attachment<HTMLInputElement> = (element) => {
		chatIdInput = element;
		return () => (chatIdInput = undefined);
	};

	const captureMessageTextInput: Attachment<HTMLTextAreaElement> = (element) => {
		messageTextInput = element;
		return () => (messageTextInput = undefined);
	};

	const enhanceForm: SubmitFunction = () => {
		pending = true;
		feedback = null;

		return async ({ result, update }) => {
			try {
				feedback = getFeedback(result);
				if (result.type === 'success') messageText = '';
				await update({ reset: false, invalidateAll: false });

				if (result.type === 'failure') {
					await tick();
					if (feedback?.fieldErrors?.chatId) chatIdInput?.focus();
					else if (feedback?.fieldErrors?.text) messageTextInput?.focus();
				}
			} finally {
				pending = false;
			}
		};
	};

	function getFeedback(result: ActionResult): SendMessageFeedback | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const value = result.data as SendMessageFeedback;
		return value.action === 'sendMessage' ? value : null;
	}

	function getResult(
		response: TelegramApiSuccess<TelegramMessage> | TelegramApiFailure | undefined
	): TelegramMessage | null {
		return response?.ok === true ? response.result : null;
	}
</script>

<MethodLayout
	apiMethod="sendMessage"
	title="Text message"
	description="Send a plain-text message to a chat, group, or channel."
	documentationUrl="https://core.telegram.org/bots/api#sendmessage"
>
	{#snippet request()}
		<RequestPanel titleId="send-request-title" subtitle="Required parameters">
			<form method="POST" action="?/sendMessage" use:enhance={enhanceForm} aria-busy={pending}>
				<FormField
					label="chat_id"
					inputId="chatId"
					meta="String · required"
					help="Numeric chat ID or public channel username."
					error={feedback?.fieldErrors?.chatId}
				>
					{#snippet children({ describedBy, invalid })}
						<input
							id="chatId"
							name="chatId"
							type="text"
							placeholder="123456789 or @channel"
							bind:value={chatId}
							{@attach captureChatIdInput}
							aria-describedby={describedBy}
							aria-invalid={invalid}
						/>
					{/snippet}
				</FormField>

				<FormField
					label="text"
					inputId="messageText"
					meta={`String · required · ${messageText.length.toLocaleString()}/4,096`}
					metaInvalid={messageText.length > 4096}
					help="Sent without a parse mode."
					error={feedback?.fieldErrors?.text}
				>
					{#snippet children({ describedBy, invalid })}
						<textarea
							id="messageText"
							name="text"
							rows="8"
							placeholder="Message text"
							bind:value={messageText}
							{@attach captureMessageTextInput}
							aria-describedby={describedBy}
							aria-invalid={invalid}
						></textarea>
					{/snippet}
				</FormField>
				<SubmitButton {pending} />
			</form>
		</RequestPanel>
	{/snippet}

	{#snippet response()}
		<ResponsePanel
			titleId="send-response-title"
			status={feedback?.response ? (feedback.success ? 'success' : 'error') : undefined}
			rawResponse={feedback?.response}
		>
			{#if feedback?.success && sentMessage}
				<Notice kind="success" title="Message sent">
					<p>
						Message <code>#{sentMessage.message_id}</code> was accepted for chat
						<code>{sentMessage.chat.id}</code>.
					</p>
				</Notice>
			{:else if feedback?.error}
				<Notice kind="error" title="Request failed"><p>{feedback.error}</p></Notice>
			{:else}
				<EmptyResponse />
			{/if}
		</ResponsePanel>
	{/snippet}
</MethodLayout>

<style>
	form {
		display: grid;
		gap: 1.15rem;
	}

	input,
	textarea {
		width: 100%;
		border: 1px solid var(--border-strong);
		border-radius: 0.4rem;
		background: var(--surface);
		padding: 0.7rem 0.75rem;
		color: var(--text);
		font: inherit;
		font-size: 0.78rem;
	}

	textarea {
		min-height: 9rem;
		line-height: 1.55;
		resize: vertical;
	}

	input:focus,
	textarea:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px rgba(22, 138, 192, 0.1);
		outline: none;
	}

	input[aria-invalid='true'],
	textarea[aria-invalid='true'] {
		border-color: #d46a74;
	}
</style>
