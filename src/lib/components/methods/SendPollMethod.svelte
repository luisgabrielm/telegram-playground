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
	import { buildSendPollPayload } from '$lib/playground/payload';
	import { restoreReplyMarkup } from '$lib/playground/reply-markup';
	import type { MethodComponentProps, PollFeedback } from '$lib/playground/types';
	import type { TelegramReplyMarkup } from '$lib/reply-markup';
	import type { PollType } from '$lib/server/methods/poll';

	type OptionDraft = { id: number; text: string };
	type PollMessageResult = { message_id: number; chat: { id: number } };

	let { initialFeedback }: MethodComponentProps = $props();
	const initial = untrack(() =>
		initialFeedback?.action === 'sendPoll' ? (initialFeedback as PollFeedback) : null
	);
	let nextOptionId = 0;
	let pending = $state(false);
	let feedback = $state<PollFeedback | null>(initial);
	let chatId = $state(initial?.fields?.chatId ?? '');
	let question = $state(initial?.fields?.question ?? '');
	let options = $state<OptionDraft[]>(
		(initial?.fields?.options?.length ? initial.fields.options : ['', '']).map((text) => newOption(text))
	);
	let type = $state<PollType>(initial?.fields?.type === 'quiz' ? 'quiz' : 'regular');
	let isAnonymous = $state(initial?.fields?.isAnonymous !== 'false');
	let allowsMultipleAnswers = $state(initial?.fields?.allowsMultipleAnswers === 'true');
	let correctOptionIds = $state<number[]>(readCorrectOptions(initial?.fields?.correctOptionIds));
	let explanation = $state(initial?.fields?.explanation ?? '');
	let openPeriod = $state(initial?.fields?.openPeriod ?? '');
	let replyMarkup = $state<TelegramReplyMarkup | undefined>(
		restoreReplyMarkup(initial?.fields?.replyMarkup)
	);
	const requestPayload = $derived(
		buildSendPollPayload({
			chatId,
			question,
			options: options.map((option) => option.text),
			type,
			isAnonymous,
			allowsMultipleAnswers,
			correctOptionIds,
			explanation,
			openPeriod,
			replyMarkup
		})
	);
	const sentMessage = $derived(messageResult(feedback?.response));

	const enhanceForm: SubmitFunction = () => {
		pending = true;
		feedback = null;

		return async ({ result, update }) => {
			try {
				feedback = getFeedback(result);
				if (result.type === 'success') {
					question = '';
					options = [newOption(), newOption()];
					correctOptionIds = [];
					explanation = '';
				}
				await update({ reset: false, invalidateAll: false });
			} finally {
				pending = false;
			}
		};
	};

	function newOption(text = ''): OptionDraft {
		nextOptionId += 1;
		return { id: nextOptionId, text };
	}

	function addOption() {
		if (options.length < 12) options.push(newOption());
	}

	function removeOption(index: number) {
		if (options.length === 1) return;
		options.splice(index, 1);
		correctOptionIds = correctOptionIds
			.filter((optionId) => optionId !== index)
			.map((optionId) => (optionId > index ? optionId - 1 : optionId));
	}

	function moveOption(index: number, direction: -1 | 1) {
		const destination = index + direction;
		if (destination < 0 || destination >= options.length) return;
		const [option] = options.splice(index, 1);
		options.splice(destination, 0, option);
		correctOptionIds = correctOptionIds.map((optionId) => {
			if (optionId === index) return destination;
			if (optionId === destination) return index;
			return optionId;
		});
	}

	function changeType(nextType: PollType) {
		type = nextType;
		if (nextType === 'quiz') allowsMultipleAnswers = false;
		else correctOptionIds = [];
	}

	function readCorrectOptions(values: string[] | undefined) {
		return (values ?? []).map(Number).filter(Number.isInteger);
	}

	function getFeedback(result: ActionResult): PollFeedback | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const value = result.data as PollFeedback;
		return value.action === 'sendPoll' ? value : null;
	}

	function messageResult(response: unknown): PollMessageResult | null {
		if (!response || typeof response !== 'object' || !('ok' in response) || response.ok !== true) {
			return null;
		}
		const result = 'result' in response ? response.result : null;
		if (!result || typeof result !== 'object' || !('message_id' in result) || !('chat' in result)) {
			return null;
		}
		const chat = result.chat;
		if (!chat || typeof chat !== 'object' || !('id' in chat)) return null;
		return result as PollMessageResult;
	}
</script>

<MethodLayout
	apiMethod="sendPoll"
	title="Poll"
	description="Send a regular poll or quiz with plain-text options."
	documentationUrl="https://core.telegram.org/bots/api#sendpoll"
>
	{#snippet request()}
		<RequestPanel titleId="send-poll-request-title" subtitle="Required and optional parameters">
			<form method="POST" action="?/sendPoll" use:enhance={enhanceForm} aria-busy={pending}>
				<FormField
					label="chat_id"
					inputId="poll-chat-id"
					meta="String · required"
					help="Numeric chat ID or public channel username."
					error={feedback?.fieldErrors?.chatId}
				>
					{#snippet children({ describedBy, invalid })}
						<input
							id="poll-chat-id"
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
					label="question"
					inputId="poll-question"
					meta={`String · required · ${Array.from(question).length}/300`}
					metaInvalid={Array.from(question).length > 300}
					help="Plain-text poll question."
					error={feedback?.fieldErrors?.question}
				>
					{#snippet children({ describedBy, invalid })}
						<textarea
							id="poll-question"
							name="question"
							rows="3"
							bind:value={question}
							aria-describedby={describedBy}
							aria-invalid={invalid}
						></textarea>
					{/snippet}
				</FormField>

				<fieldset class="type-picker">
					<legend>Poll type</legend>
					<label>
						<input
							type="radio"
							name="type"
							value="regular"
							checked={type === 'regular'}
							onchange={() => changeType('regular')}
						/>
						Regular
					</label>
					<label>
						<input
							type="radio"
							name="type"
							value="quiz"
							checked={type === 'quiz'}
							onchange={() => changeType('quiz')}
						/>
						Quiz
					</label>
				</fieldset>

				<section class="options-editor" aria-labelledby="poll-options-title">
					<div class="editor-heading">
						<div>
							<h3 id="poll-options-title">Options</h3>
							<p>Between 1 and 12 plain-text options.</p>
						</div>
						<button type="button" onclick={addOption} disabled={options.length >= 12}>Add option</button>
					</div>
					{#if feedback?.fieldErrors?.options}
						<p class="field-error" role="alert">{feedback.fieldErrors.options}</p>
					{/if}
					<div class="option-list">
						{#each options as option, index (option.id)}
							<div class="option-row">
								{#if type === 'quiz'}
									<input
										type="checkbox"
										name="correctOptionIds"
										value={index}
										bind:group={correctOptionIds}
										aria-label={`Mark option ${index + 1} as correct`}
									/>
								{/if}
								<div class="option-input">
									<label for={`poll-option-${option.id}`}>Option {index + 1}</label>
									<input
										id={`poll-option-${option.id}`}
										name="options"
										type="text"
										bind:value={option.text}
										aria-invalid={Boolean(feedback?.fieldErrors?.[`options.${index}`])}
									/>
									<span class="option-meta">{Array.from(option.text).length}/100</span>
									{#if feedback?.fieldErrors?.[`options.${index}`]}
										<span class="field-error" role="alert">{feedback.fieldErrors[`options.${index}`]}</span>
									{/if}
								</div>
								<div class="row-actions">
									<button type="button" onclick={() => moveOption(index, -1)} disabled={index === 0} aria-label={`Move option ${index + 1} up`}>↑</button>
									<button type="button" onclick={() => moveOption(index, 1)} disabled={index === options.length - 1} aria-label={`Move option ${index + 1} down`}>↓</button>
									<button type="button" onclick={() => removeOption(index)} disabled={options.length === 1} aria-label={`Remove option ${index + 1}`}>Remove</button>
								</div>
							</div>
						{/each}
					</div>
					{#if type === 'quiz' && feedback?.fieldErrors?.correctOptionIds}
						<p class="field-error" role="alert">{feedback.fieldErrors.correctOptionIds}</p>
					{/if}
				</section>

				<div class="checks">
					<label><input type="checkbox" name="isAnonymous" value="true" bind:checked={isAnonymous} /> Anonymous poll</label>
					{#if type === 'regular'}
						<label><input type="checkbox" name="allowsMultipleAnswers" value="true" bind:checked={allowsMultipleAnswers} /> Allow multiple answers</label>
					{/if}
				</div>

				{#if type === 'quiz'}
					<FormField
						label="explanation"
						inputId="poll-explanation"
						meta={`String · optional · ${Array.from(explanation).length}/200`}
						metaInvalid={Array.from(explanation).length > 200 || explanation.split('\n').length - 1 > 2}
						help="Shown after an incorrect answer; at most 2 line feeds."
						error={feedback?.fieldErrors?.explanation}
					>
						{#snippet children({ describedBy, invalid })}
							<textarea
								id="poll-explanation"
								name="explanation"
								rows="3"
								bind:value={explanation}
								aria-describedby={describedBy}
								aria-invalid={invalid}
							></textarea>
						{/snippet}
					</FormField>
				{/if}

				<FormField
					label="open_period"
					inputId="poll-open-period"
					meta="Integer · optional"
					help="Seconds before Telegram automatically closes the poll (5–2,628,000)."
					error={feedback?.fieldErrors?.openPeriod}
				>
					{#snippet children({ describedBy, invalid })}
						<input
							id="poll-open-period"
							name="openPeriod"
							type="number"
							min="5"
							max="2628000"
							step="1"
							bind:value={openPeriod}
							aria-describedby={describedBy}
							aria-invalid={invalid}
						/>
					{/snippet}
				</FormField>

				<ReplyMarkupEditor
					bind:value={replyMarkup}
					errors={feedback?.replyMarkupErrors}
					idPrefix="send-poll-reply"
				/>
				<PayloadPreview titleId="send-poll-payload-title" payload={requestPayload} />
				<SubmitButton {pending} />
			</form>
		</RequestPanel>
	{/snippet}

	{#snippet response()}
		<ResponsePanel
			titleId="send-poll-response-title"
			status={feedback?.response ? (feedback.success ? 'success' : 'error') : undefined}
			rawResponse={feedback?.response}
		>
			{#if feedback?.success && sentMessage}
				<Notice kind="success" title="Poll sent">
					<p>Message <code>#{sentMessage.message_id}</code> was accepted for chat <code>{sentMessage.chat.id}</code>.</p>
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
	form,
	.option-list {
		display: grid;
		gap: 1.15rem;
	}

	.type-picker,
	.checks {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		border: 0;
		margin: 0;
		padding: 0;
	}

	legend,
	.editor-heading h3,
	.option-input label {
		margin: 0 0 0.4rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.72rem;
		font-weight: 700;
	}

	.type-picker label,
	.checks label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--text-muted);
		font-size: 0.7rem;
	}

	.options-editor {
		display: grid;
		gap: 0.75rem;
		border: 1px solid var(--border);
		border-radius: 0.45rem;
		padding: 0.9rem;
	}

	.editor-heading,
	.option-row,
	.row-actions {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}

	.editor-heading {
		justify-content: space-between;
	}

	.editor-heading p {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.66rem;
	}

	.option-row {
		align-items: flex-start;
	}

	.option-input {
		position: relative;
		display: grid;
		flex: 1;
		gap: 0.3rem;
	}

	.option-meta {
		position: absolute;
		top: 0;
		right: 0;
		color: var(--text-muted);
		font-size: 0.62rem;
	}

	input:not([type='radio']):not([type='checkbox']),
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

	button {
		border: 1px solid var(--border-strong);
		border-radius: 0.35rem;
		background: var(--surface);
		padding: 0.35rem 0.55rem;
		color: var(--text);
		font: inherit;
		font-size: 0.65rem;
		cursor: pointer;
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}

	.field-error {
		margin: 0;
		color: var(--danger);
		font-size: 0.66rem;
	}

	@media (max-width: 650px) {
		.option-row {
			align-items: stretch;
			flex-wrap: wrap;
		}

		.option-input {
			min-width: calc(100% - 2rem);
		}
	}
</style>
