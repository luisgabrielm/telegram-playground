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
	import { buildSendDicePayload } from '$lib/playground/payload';
	import { buildMessageOptionsPayload } from '$lib/playground/message-options';
	import { createMessageOptionsValue } from '$lib/message-options';
	import { restoreReplyMarkup } from '$lib/playground/reply-markup';
	import type { DiceFeedback, MethodComponentProps } from '$lib/playground/types';
	import type { TelegramReplyMarkup } from '$lib/reply-markup';

	const diceOptions = [
		{ emoji: '🎲', label: 'Die' },
		{ emoji: '🎯', label: 'Darts' },
		{ emoji: '🏀', label: 'Basketball' },
		{ emoji: '⚽', label: 'Football' },
		{ emoji: '🎳', label: 'Bowling' },
		{ emoji: '🎰', label: 'Slot machine' }
	] as const;

	let { initialFeedback }: MethodComponentProps = $props();
	const initial = untrack(() =>
		initialFeedback?.action === 'sendDice' ? initialFeedback : null
	);
	let pending = $state(false);
	let feedback = $state<DiceFeedback | null>(initial);
	let chatId = $state(initial?.fields?.chatId ?? '');
	let emoji = $state(initial?.fields?.emoji ?? '🎲');
	let replyMarkup = $state<TelegramReplyMarkup | undefined>(
		restoreReplyMarkup(initial?.fields?.replyMarkup)
	);
	let messageOptions = $state(createMessageOptionsValue(initial?.fields?.messageOptions));
	const sentDice = $derived(diceResult(feedback?.response));
	const requestPayload = $derived({
		...buildSendDicePayload(chatId, emoji, replyMarkup),
		...buildMessageOptionsPayload(messageOptions, false)
	});

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

	function getFeedback(result: ActionResult): DiceFeedback | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const value = result.data as DiceFeedback;
		return value.action === 'sendDice' ? value : null;
	}

	function diceResult(response: unknown): DiceResult | null {
		if (!response || typeof response !== 'object' || !('ok' in response) || response.ok !== true) {
			return null;
		}
		const result = 'result' in response ? response.result : null;
		if (!result || typeof result !== 'object') return null;
		if (!('message_id' in result) || !('chat' in result) || !('dice' in result)) return null;
		const chat = result.chat;
		const dice = result.dice;
		if (!chat || typeof chat !== 'object' || !('id' in chat)) return null;
		if (!dice || typeof dice !== 'object' || !('emoji' in dice) || !('value' in dice)) return null;
		return result as unknown as DiceResult;
	}

	type DiceResult = {
		message_id: number;
		chat: { id: number };
		dice: { emoji: string; value: number };
	};
</script>

<MethodLayout
	apiMethod="sendDice"
	title="Dice"
	description="Send a Telegram animated dice, game, or slot-machine message."
	documentationUrl="https://core.telegram.org/bots/api#senddice"
>
	{#snippet request()}
		<RequestPanel titleId="send-dice-request-title" subtitle="Required and optional parameters">
			<form method="POST" action="?/sendDice" use:enhance={enhanceForm} aria-busy={pending}>
				<FormField
					label="chat_id"
					inputId="send-dice-chat-id"
					meta="String · required"
					help="Numeric chat ID or public channel username."
					error={feedback?.fieldErrors?.chatId}
				>
					{#snippet children({ describedBy, invalid })}
						<input
							id="send-dice-chat-id"
							name="chatId"
							type="text"
							placeholder="123456789 or @channel"
							bind:value={chatId}
							aria-describedby={describedBy}
							aria-invalid={invalid}
						/>
					{/snippet}
				</FormField>

				<FormField
					label="emoji"
					inputId="send-dice-emoji"
					meta="String · optional"
					help="Telegram defaults to the standard die."
					error={feedback?.fieldErrors?.emoji}
				>
					{#snippet children({ describedBy, invalid })}
						<select
							id="send-dice-emoji"
							name="emoji"
							bind:value={emoji}
							aria-describedby={describedBy}
							aria-invalid={invalid}
						>
							{#each diceOptions as option (option.emoji)}
								<option value={option.emoji}>{option.emoji} {option.label}</option>
							{/each}
						</select>
					{/snippet}
				</FormField>

				<ReplyMarkupEditor
					bind:value={replyMarkup}
					errors={feedback?.replyMarkupErrors}
					idPrefix="send-dice-reply"
				/>
				<MessageOptionsEditor bind:value={messageOptions} errors={feedback?.messageOptionsErrors} idPrefix="send-dice-options" showParseMode={false} />

				<PayloadPreview titleId="send-dice-payload-title" payload={requestPayload} />
				<SubmitButton {pending} />
			</form>
		</RequestPanel>
	{/snippet}

	{#snippet response()}
		<ResponsePanel
			titleId="send-dice-response-title"
			status={feedback?.response ? (feedback.success ? 'success' : 'error') : undefined}
			rawResponse={feedback?.response}
		>
			{#if feedback?.success && sentDice}
				<Notice kind="success" title="Dice sent">
					<p>
						Message <code>#{sentDice.message_id}</code> rolled {sentDice.dice.emoji}
						<strong>{sentDice.dice.value}</strong> in chat <code>{sentDice.chat.id}</code>.
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
	select {
		width: 100%;
		border: 1px solid var(--border-strong);
		border-radius: 0.4rem;
		background: var(--surface);
		padding: 0.7rem 0.75rem;
		color: var(--text);
		font: inherit;
		font-size: 0.78rem;
	}

	input:focus,
	select:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px rgba(22, 138, 192, 0.1);
		outline: none;
	}

	input[aria-invalid='true'],
	select[aria-invalid='true'] {
		border-color: #d46a74;
	}
</style>
