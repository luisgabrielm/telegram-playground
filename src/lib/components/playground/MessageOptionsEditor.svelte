<script lang="ts">
	import {
		createMessageOptionsValue,
		type MessageOptionsEditorValue,
		type MessageOptionsFieldErrors
	} from '$lib/message-options';

	type Props = {
		value?: MessageOptionsEditorValue;
		errors?: MessageOptionsFieldErrors;
		idPrefix?: string;
		showParseMode?: boolean;
	};

	let {
		value = $bindable(createMessageOptionsValue()),
		errors = {},
		idPrefix = 'message-options',
		showParseMode = true
	}: Props = $props();
	const hasOptions = $derived(
		Boolean(
			(showParseMode && value.parseMode) ||
				value.replyEnabled ||
				value.protectContent ||
				value.disableNotification ||
				value.messageEffectId.trim()
		)
	);
	const hasErrors = $derived(Object.keys(errors).length > 0);
</script>

<details class="message-options" open={hasErrors}>
	<summary>
		<span>
			<strong>Message options</strong>
			<small>Formatting, replies, and delivery</small>
		</span>
		<span class="status">{hasOptions ? 'Configured' : 'Optional'}</span>
	</summary>

	<div class="editor">
		{#if showParseMode}
			<label class="field" for={`${idPrefix}-parse-mode`}>
				<span>Parse mode</span>
				<select
					id={`${idPrefix}-parse-mode`}
					name="parseMode"
					bind:value={value.parseMode}
					aria-invalid={Boolean(errors.parseMode)}
				>
					<option value="">None</option>
					<option value="HTML">HTML</option>
					<option value="MarkdownV2">MarkdownV2</option>
				</select>
				<small>Telegram validates markup syntax and the formatted text length.</small>
				{#if errors.parseMode}<span class="error">{errors.parseMode}</span>{/if}
			</label>
		{/if}

		<fieldset>
			<legend>Reply and quote</legend>
			<label class="check">
				<input type="checkbox" name="replyEnabled" value="true" bind:checked={value.replyEnabled} />
				Reply to a message in this chat
			</label>

			{#if value.replyEnabled}
				<div class="reply-fields">
					<label class="field" for={`${idPrefix}-reply-message-id`}>
						<span>Message ID</span>
						<input
							id={`${idPrefix}-reply-message-id`}
							name="replyMessageId"
							type="number"
							min="1"
							step="1"
							bind:value={value.replyMessageId}
							aria-invalid={Boolean(errors.replyMessageId)}
						/>
						{#if errors.replyMessageId}<span class="error">{errors.replyMessageId}</span>{/if}
					</label>

					<label class="check">
						<input
							type="checkbox"
							name="allowSendingWithoutReply"
							value="true"
							bind:checked={value.allowSendingWithoutReply}
						/>
						Send even if the original message is missing
					</label>

					<label class="field" for={`${idPrefix}-quote`}>
						<span>Quote text</span>
						<textarea id={`${idPrefix}-quote`} name="quote" rows="3" bind:value={value.quote}></textarea>
						<small>The quote must exactly match the original message.</small>
						{#if errors.quote}<span class="error">{errors.quote}</span>{/if}
					</label>

					<div class="columns">
						<label class="field" for={`${idPrefix}-quote-parse-mode`}>
							<span>Quote parse mode</span>
							<select
								id={`${idPrefix}-quote-parse-mode`}
								name="quoteParseMode"
								bind:value={value.quoteParseMode}
								aria-invalid={Boolean(errors.quoteParseMode)}
							>
								<option value="">None</option>
								<option value="HTML">HTML</option>
								<option value="MarkdownV2">MarkdownV2</option>
							</select>
							{#if errors.quoteParseMode}<span class="error">{errors.quoteParseMode}</span>{/if}
						</label>

						<label class="field" for={`${idPrefix}-quote-position`}>
							<span>Quote position</span>
							<input
								id={`${idPrefix}-quote-position`}
								name="quotePosition"
								type="number"
								min="0"
								step="1"
								bind:value={value.quotePosition}
								aria-invalid={Boolean(errors.quotePosition)}
							/>
							<small>Zero-based position in UTF-16 units.</small>
							{#if errors.quotePosition}<span class="error">{errors.quotePosition}</span>{/if}
						</label>
					</div>
				</div>
			{/if}
		</fieldset>

		<div class="checks">
			<label class="check">
				<input type="checkbox" name="protectContent" value="true" bind:checked={value.protectContent} />
				Protect from forwarding and saving
			</label>
			<label class="check">
				<input
					type="checkbox"
					name="disableNotification"
					value="true"
					bind:checked={value.disableNotification}
				/>
				Send silently
			</label>
		</div>

		<label class="field" for={`${idPrefix}-effect-id`}>
			<span>Message effect ID</span>
			<input
				id={`${idPrefix}-effect-id`}
				name="messageEffectId"
				type="text"
				bind:value={value.messageEffectId}
			/>
			<small>Effects apply only in supported private chats. Telegram validates this opaque ID.</small>
		</label>
	</div>
</details>

<style>
	.message-options {
		border-top: 1px solid var(--border);
		padding-top: 1.1rem;
	}

	summary {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		cursor: pointer;
		list-style-position: inside;
	}

	summary > span:first-child {
		display: inline-grid;
		gap: 0.2rem;
	}

	strong {
		font-size: 0.85rem;
	}

	small,
	.status {
		color: var(--text-subtle);
		font-size: 0.65rem;
		line-height: 1.45;
	}

	.status {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}

	.editor,
	.reply-fields {
		display: grid;
		gap: 0.85rem;
	}

	.editor {
		padding-top: 1rem;
	}

	fieldset {
		margin: 0;
		border: 1px solid var(--border);
		border-radius: 0.45rem;
		padding: 0.75rem;
	}

	legend,
	.field > span {
		font-size: 0.68rem;
		font-weight: 700;
	}

	legend {
		padding: 0 0.3rem;
	}

	.field {
		display: grid;
		gap: 0.35rem;
	}

	input[type='text'],
	input[type='number'],
	select,
	textarea {
		width: 100%;
		border: 1px solid var(--border-strong);
		border-radius: 0.4rem;
		background: var(--surface);
		padding: 0.65rem 0.7rem;
		color: var(--text);
		font: inherit;
		font-size: 0.72rem;
	}

	textarea {
		resize: vertical;
	}

	input:focus,
	select:focus,
	textarea:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px rgba(22, 138, 192, 0.1);
		outline: none;
	}

	input[aria-invalid='true'],
	select[aria-invalid='true'] {
		border-color: #d46a74;
	}

	.check {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.68rem;
	}

	.reply-fields {
		margin-top: 0.85rem;
	}

	.columns,
	.checks {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.checks {
		gap: 0.55rem 1rem;
	}

	.error {
		color: #b04450;
		font-size: 0.65rem;
	}

	@media (max-width: 680px) {
		.columns,
		.checks {
			grid-template-columns: 1fr;
		}
	}
</style>
