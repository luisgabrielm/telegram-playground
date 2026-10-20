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
	import { TELEGRAM_REACTION_EMOJIS, type ReactionKind } from '$lib/reaction';
	import type { MethodComponentProps } from '$lib/playground/types';

	type ReactionFeedback = {
		action: 'setMessageReaction';
		success: boolean;
		error?: string;
		response?: unknown;
		fields?: {
			chatId?: string;
			messageId?: string;
			reactionKind?: string;
			emoji?: string;
			customEmojiId?: string;
			isBig?: string;
		};
		fieldErrors?: Record<string, string>;
	};

	let { initialFeedback }: MethodComponentProps = $props();
	const initial = untrack(() => asReactionFeedback(initialFeedback));
	let pending = $state(false);
	let feedback = $state<ReactionFeedback | null>(initial);
	let chatId = $state(initial?.fields?.chatId ?? '');
	let messageId = $state(initial?.fields?.messageId ?? '');
	let reactionKind = $state<ReactionKind>(asReactionKind(initial?.fields?.reactionKind));
	let emoji = $state(initial?.fields?.emoji ?? '👍');
	let customEmojiId = $state(initial?.fields?.customEmojiId ?? '');
	let isBig = $state(initial?.fields?.isBig === 'true');
	const payload = $derived(buildPayload());

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

	function getFeedback(result: ActionResult): ReactionFeedback | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		return asReactionFeedback(result.data);
	}

	function asReactionFeedback(value: unknown): ReactionFeedback | null {
		if (!value || typeof value !== 'object' || !('action' in value)) return null;
		return value.action === 'setMessageReaction' ? (value as ReactionFeedback) : null;
	}

	function asReactionKind(value: string | undefined): ReactionKind {
		return value === 'emoji' || value === 'custom_emoji' || value === 'none' ? value : 'none';
	}

	function buildPayload() {
		const parsedMessageId = Number(messageId);
		const body: Record<string, unknown> = {
			chat_id: chatId.trim(),
			message_id: Number.isInteger(parsedMessageId) && parsedMessageId > 0 ? parsedMessageId : messageId,
			reaction:
				reactionKind === 'emoji'
					? [{ type: 'emoji', emoji }]
					: reactionKind === 'custom_emoji'
						? [{ type: 'custom_emoji', custom_emoji_id: customEmojiId.trim() }]
						: []
		};
		if (isBig) body.is_big = true;
		return body;
	}
</script>

<MethodLayout
	apiMethod="setMessageReaction"
	title="Message reaction"
	description="Set or remove the bot's reaction on an existing message."
	documentationUrl="https://core.telegram.org/bots/api#setmessagereaction"
>
	{#snippet request()}
		<RequestPanel titleId="set-reaction-request-title" subtitle="One reaction per message">
			<form method="POST" action="?/setMessageReaction" use:enhance={enhanceForm} aria-busy={pending}>
				<FormField
					label="chat_id"
					inputId="set-reaction-chat-id"
					meta="String · required"
					help="Numeric chat ID or public channel username containing the message."
					error={feedback?.fieldErrors?.chatId}
				>
					{#snippet children({ describedBy, invalid })}
						<input
							id="set-reaction-chat-id"
							name="chatId"
							placeholder="123456789 or @channel"
							bind:value={chatId}
							aria-describedby={describedBy}
							aria-invalid={invalid}
						/>
					{/snippet}
				</FormField>

				<FormField
					label="message_id"
					inputId="set-reaction-message-id"
					meta="Integer · required"
					help="Positive identifier of the target message."
					error={feedback?.fieldErrors?.messageId}
				>
					{#snippet children({ describedBy, invalid })}
						<input
							id="set-reaction-message-id"
							name="messageId"
							type="number"
							min="1"
							step="1"
							bind:value={messageId}
							aria-describedby={describedBy}
							aria-invalid={invalid}
						/>
					{/snippet}
				</FormField>

				<FormField
					label="reaction"
					inputId="set-reaction-type"
					meta="ReactionType · optional"
					help="Remove the current reaction, or set one standard or custom emoji. Paid reactions are not available to bots."
					error={feedback?.fieldErrors?.reactionKind}
				>
					{#snippet children({ describedBy, invalid })}
						<select
							id="set-reaction-type"
							name="reactionKind"
							bind:value={reactionKind}
							aria-describedby={describedBy}
							aria-invalid={invalid}
						>
							<option value="none">Remove reaction</option>
							<option value="emoji">Standard emoji</option>
							<option value="custom_emoji">Custom emoji</option>
						</select>
					{/snippet}
				</FormField>

				{#if reactionKind === 'emoji'}
					<FormField
						label="emoji"
						inputId="set-reaction-emoji"
						meta="String · required"
						help="Telegram's supported standard reaction set."
						error={feedback?.fieldErrors?.emoji}
					>
						{#snippet children({ describedBy, invalid })}
							<select
								id="set-reaction-emoji"
								name="emoji"
								bind:value={emoji}
								aria-describedby={describedBy}
								aria-invalid={invalid}
							>
								{#each TELEGRAM_REACTION_EMOJIS as option (option)}
									<option value={option}>{option}</option>
								{/each}
							</select>
						{/snippet}
					</FormField>
				{:else if reactionKind === 'custom_emoji'}
					<FormField
						label="custom_emoji_id"
						inputId="set-reaction-custom-emoji-id"
						meta="String · required"
						help="Custom emoji ID. Telegram enforces whether the bot may use it in this chat."
						error={feedback?.fieldErrors?.customEmojiId}
					>
						{#snippet children({ describedBy, invalid })}
							<input
								id="set-reaction-custom-emoji-id"
								name="customEmojiId"
								bind:value={customEmojiId}
								aria-describedby={describedBy}
								aria-invalid={invalid}
							/>
						{/snippet}
					</FormField>
				{/if}

				<label class="checkbox">
					<input type="checkbox" name="isBig" value="true" bind:checked={isBig} />
					Show a larger reaction animation
				</label>

				<PayloadPreview titleId="set-reaction-payload-title" {payload} />
				<SubmitButton {pending} />
			</form>
		</RequestPanel>
	{/snippet}

	{#snippet response()}
		<ResponsePanel
			titleId="set-reaction-response-title"
			status={feedback ? (feedback.success ? 'success' : 'error') : undefined}
			rawResponse={feedback?.response}
		>
			{#if feedback?.success}
				<Notice kind="success" title="Reaction updated">
					<p>Telegram accepted the message reaction update.</p>
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

	input:not([type='checkbox']),
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

	.checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-muted);
		font-size: 0.72rem;
	}
</style>
