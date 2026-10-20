<script lang="ts">
	import type { InlineKeyboardButtonStyle, TelegramReplyMarkup } from '$lib/reply-markup';

	type Mode = 'none' | 'inline' | 'reply' | 'remove' | 'force';
	type InlineAction = 'url' | 'copy_text' | 'callback_data';
	type InlineStyle = 'default' | InlineKeyboardButtonStyle;
	type InlineButton = {
		id: string;
		text: string;
		action: InlineAction;
		value: string;
		style: InlineStyle;
		iconCustomEmojiId: string;
	};
	type InlineRow = { id: string; buttons: InlineButton[] };
	type ReplyButton = { id: string; text: string };
	type ReplyRow = { id: string; buttons: ReplyButton[] };

	type Props = {
		value?: TelegramReplyMarkup;
		errors?: Record<string, string>;
		idPrefix?: string;
		allowedModes?: Mode[];
	};

	let {
		value = $bindable(),
		errors = {},
		idPrefix = 'reply-markup',
		allowedModes = ['none', 'inline', 'reply', 'remove', 'force']
	}: Props = $props();
	let nextId = 0;
	let mode = $state<Mode>(getMode(value));
	let inlineRows = $state<InlineRow[]>(readInlineRows(value));
	let replyRows = $state<ReplyRow[]>(readReplyRows(value));
	let isPersistent = $state(readReplyOption(value, 'is_persistent'));
	let resizeKeyboard = $state(readReplyOption(value, 'resize_keyboard'));
	let oneTimeKeyboard = $state(readReplyOption(value, 'one_time_keyboard'));
	let replyPlaceholder = $state(readPlaceholder(value, 'keyboard'));
	let forcePlaceholder = $state(readPlaceholder(value, 'force_reply'));
	const serializedValue = $derived(value ? JSON.stringify(value) : '');
	const firstError = $derived(Object.values(errors)[0]);

	function id(kind: string) {
		nextId += 1;
		return `${kind}-${nextId}`;
	}

	function getMode(markup: TelegramReplyMarkup | undefined): Mode {
		if (!markup) return 'none';
		if ('inline_keyboard' in markup) return 'inline';
		if ('keyboard' in markup) return 'reply';
		if ('remove_keyboard' in markup) return 'remove';
		return 'force';
	}

	function readInlineRows(markup: TelegramReplyMarkup | undefined): InlineRow[] {
		if (!markup || !('inline_keyboard' in markup)) return [newInlineRow()];
		return markup.inline_keyboard.map((row) => ({
			id: id('inline-row'),
			buttons: row.map((button) => {
				const style = button.style ?? 'default';
				const iconCustomEmojiId = button.icon_custom_emoji_id ?? '';
				if ('url' in button) {
					return newInlineButton(button.text, 'url', button.url, style, iconCustomEmojiId);
				}
				if ('copy_text' in button) {
					return newInlineButton(
						button.text,
						'copy_text',
						button.copy_text.text,
						style,
						iconCustomEmojiId
					);
				}
				return newInlineButton(
					button.text,
					'callback_data',
					button.callback_data,
					style,
					iconCustomEmojiId
				);
			})
		}));
	}

	function readReplyRows(markup: TelegramReplyMarkup | undefined): ReplyRow[] {
		if (!markup || !('keyboard' in markup)) return [newReplyRow()];
		return markup.keyboard.map((row) => ({
			id: id('reply-row'),
			buttons: row.map((button) => ({ id: id('reply-button'), text: button.text }))
		}));
	}

	function readReplyOption(
		markup: TelegramReplyMarkup | undefined,
		option: 'is_persistent' | 'resize_keyboard' | 'one_time_keyboard'
	) {
		return Boolean(markup && 'keyboard' in markup && markup[option]);
	}

	function readPlaceholder(
		markup: TelegramReplyMarkup | undefined,
		kind: 'keyboard' | 'force_reply'
	) {
		if (!markup || !(kind in markup) || !('input_field_placeholder' in markup)) return '';
		return markup.input_field_placeholder ?? '';
	}

	function newInlineButton(
		text = '',
		action: InlineAction = 'url',
		actionValue = '',
		style: InlineStyle = 'default',
		iconCustomEmojiId = ''
	): InlineButton {
		return {
			id: id('inline-button'),
			text,
			action,
			value: actionValue,
			style,
			iconCustomEmojiId
		};
	}

	function newInlineRow(): InlineRow {
		return { id: id('inline-row'), buttons: [newInlineButton()] };
	}

	function newReplyRow(): ReplyRow {
		return {
			id: id('reply-row'),
			buttons: [{ id: id('reply-button'), text: '' }]
		};
	}

	function setMode(nextMode: Mode) {
		mode = nextMode;
		commit();
	}

	function commit() {
		if (mode === 'none') {
			value = undefined;
			return;
		}

		if (mode === 'inline') {
			value = {
				inline_keyboard: inlineRows.map((row) =>
					row.buttons.map((button) => {
						const appearance = {
							...(button.style === 'default' ? {} : { style: button.style }),
							...(button.iconCustomEmojiId
								? { icon_custom_emoji_id: button.iconCustomEmojiId }
								: {})
						};
						if (button.action === 'url') {
							return { text: button.text, ...appearance, url: button.value };
						}
						if (button.action === 'copy_text') {
							return {
								text: button.text,
								...appearance,
								copy_text: { text: button.value }
							};
						}
						return { text: button.text, ...appearance, callback_data: button.value };
					})
			)
			};
			return;
		}

		if (mode === 'reply') {
			value = {
				keyboard: replyRows.map((row) => row.buttons.map((button) => ({ text: button.text }))),
				...(isPersistent ? { is_persistent: true } : {}),
				...(resizeKeyboard ? { resize_keyboard: true } : {}),
				...(oneTimeKeyboard ? { one_time_keyboard: true } : {}),
				...(replyPlaceholder ? { input_field_placeholder: replyPlaceholder } : {})
			};
			return;
		}

		value =
			mode === 'remove'
				? { remove_keyboard: true }
				: {
						force_reply: true,
						...(forcePlaceholder ? { input_field_placeholder: forcePlaceholder } : {})
					};
	}

	function addInlineRow() {
		inlineRows.push(newInlineRow());
		commit();
	}

	function addInlineButton(row: InlineRow) {
		row.buttons.push(newInlineButton());
		commit();
	}

	function removeInlineButton(row: InlineRow, buttonIndex: number) {
		row.buttons.splice(buttonIndex, 1);
		commit();
	}

	function removeInlineRow(rowIndex: number) {
		inlineRows.splice(rowIndex, 1);
		commit();
	}

	function addReplyRow() {
		replyRows.push(newReplyRow());
		commit();
	}

	function addReplyButton(row: ReplyRow) {
		row.buttons.push({ id: id('reply-button'), text: '' });
		commit();
	}

	function removeReplyButton(row: ReplyRow, buttonIndex: number) {
		row.buttons.splice(buttonIndex, 1);
		commit();
	}

	function removeReplyRow(rowIndex: number) {
		replyRows.splice(rowIndex, 1);
		commit();
	}

	function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
		const destination = index + direction;
		if (destination < 0 || destination >= items.length) return;
		const [item] = items.splice(index, 1);
		items.splice(destination, 0, item);
		commit();
	}

	function inlineValueLabel(action: InlineAction) {
		if (action === 'url') return 'URL';
		if (action === 'copy_text') return 'Text to copy';
		return 'Callback data';
	}

	function callbackBytes(input: string) {
		return new TextEncoder().encode(input).length;
	}

	function characterCount(input: string) {
		return Array.from(input).length;
	}

	function fieldError(...paths: string[]) {
		for (const path of paths) {
			if (errors[path]) return errors[path];
		}
	}
</script>

<section class="reply-options" aria-labelledby={`${idPrefix}-title`}>
	<div class="section-heading">
		<div>
			<h3 id={`${idPrefix}-title`}>Reply options</h3>
			<p>Attach buttons or control Telegram's reply interface.</p>
		</div>
		<span>reply_markup · optional</span>
	</div>

	<input type="hidden" name="replyMarkup" value={serializedValue} />

	<fieldset class="mode-picker">
		<legend>Behavior</legend>
		{#each ([
			['none', 'None'],
			['inline', 'Inline keyboard'],
			['reply', 'Reply keyboard'],
			['remove', 'Remove keyboard'],
			['force', 'Force reply']
		] as const).filter((option) => allowedModes.includes(option[0])) as option (option[0])}
			<label>
				<input
					type="radio"
					name={`${idPrefix}-mode`}
					value={option[0]}
					checked={mode === option[0]}
					onchange={() => setMode(option[0] as Mode)}
				/>
				<span>{option[1]}</span>
			</label>
		{/each}
	</fieldset>

	{#if firstError}
		<p class="section-error" role="alert">{firstError}</p>
	{/if}

	{#if mode === 'inline'}
		<div class="editor" aria-label="Inline keyboard editor">
			<p class="editor-help">
				URL and copy buttons work immediately. Callback buttons require webhook updates to observe
				the resulting CallbackQuery. Custom emoji icons require an eligible bot or a Premium bot
				owner when sending directly to private, group, or supergroup chats.
			</p>

			{#each inlineRows as row, rowIndex (row.id)}
				<fieldset class="keyboard-row">
					<legend>Row {rowIndex + 1}</legend>
					<div class="row-toolbar">
						<button
							type="button"
							onclick={() => moveItem(inlineRows, rowIndex, -1)}
							disabled={rowIndex === 0}
							aria-label={`Move inline row ${rowIndex + 1} up`}>↑ Row</button
						>
						<button
							type="button"
							onclick={() => moveItem(inlineRows, rowIndex, 1)}
							disabled={rowIndex === inlineRows.length - 1}
							aria-label={`Move inline row ${rowIndex + 1} down`}>↓ Row</button
						>
						<button type="button" class="danger" onclick={() => removeInlineRow(rowIndex)}
							>Remove row</button
						>
					</div>

					<div class="button-list">
						{#each row.buttons as button, buttonIndex (button.id)}
							<div class="button-card">
								<div class="card-heading">
									<strong>Button {buttonIndex + 1}</strong>
									<div class="compact-actions">
										<button
											type="button"
											onclick={() => moveItem(row.buttons, buttonIndex, -1)}
											disabled={buttonIndex === 0}
											aria-label={`Move button ${buttonIndex + 1} left`}>←</button
										>
										<button
											type="button"
											onclick={() => moveItem(row.buttons, buttonIndex, 1)}
											disabled={buttonIndex === row.buttons.length - 1}
											aria-label={`Move button ${buttonIndex + 1} right`}>→</button
										>
										<button
											type="button"
											class="danger"
											onclick={() => removeInlineButton(row, buttonIndex)}
											aria-label={`Remove button ${buttonIndex + 1}`}>×</button
										>
									</div>
								</div>

								<label>
									<span>Label</span>
									<input
										type="text"
										value={button.text}
										oninput={(event) => {
											button.text = event.currentTarget.value;
											commit();
										}}
										aria-invalid={Boolean(
											fieldError(`reply_markup.inline_keyboard[${rowIndex}][${buttonIndex}].text`)
										)}
									/>
								</label>

								<label>
									<span>Style</span>
									<select
										value={button.style}
										onchange={(event) => {
											button.style = event.currentTarget.value as InlineStyle;
											commit();
										}}
										aria-invalid={Boolean(
											fieldError(
												`reply_markup.inline_keyboard[${rowIndex}][${buttonIndex}].style`
											)
										)}
									>
										<option value="default">Telegram default</option>
										<option value="primary">Primary · blue</option>
										<option value="success">Success · green</option>
										<option value="danger">Danger · red</option>
									</select>
								</label>

								<label>
									<span>Custom emoji icon ID <small>optional</small></span>
									<input
										type="text"
										value={button.iconCustomEmojiId}
										oninput={(event) => {
											button.iconCustomEmojiId = event.currentTarget.value;
											commit();
										}}
										aria-invalid={Boolean(
											fieldError(
												`reply_markup.inline_keyboard[${rowIndex}][${buttonIndex}].icon_custom_emoji_id`
											)
										)}
									/>
								</label>

								<label>
									<span>Action</span>
									<select
										value={button.action}
										onchange={(event) => {
											button.action = event.currentTarget.value as InlineAction;
											button.value = '';
											commit();
										}}
									>
										<option value="url">Open URL</option>
										<option value="copy_text">Copy text</option>
										<option value="callback_data">Callback data</option>
									</select>
								</label>

								<label>
									<span>{inlineValueLabel(button.action)}</span>
									<input
										type={button.action === 'url' ? 'url' : 'text'}
										value={button.value}
										oninput={(event) => {
											button.value = event.currentTarget.value;
											commit();
										}}
										aria-invalid={Boolean(
											fieldError(
												button.action === 'copy_text'
													? `reply_markup.inline_keyboard[${rowIndex}][${buttonIndex}].copy_text.text`
													: `reply_markup.inline_keyboard[${rowIndex}][${buttonIndex}].${button.action}`
											)
										)}
									/>
								</label>

								{#if button.action === 'copy_text'}
									{@const copyLength = characterCount(button.value)}
									<small class:limit-exceeded={copyLength > 256}
										>{copyLength}/256 characters</small
									>
								{:else if button.action === 'callback_data'}
									{@const byteLength = callbackBytes(button.value)}
									<small class:limit-exceeded={byteLength > 64}
										>{characterCount(button.value)} characters · {byteLength}/64 bytes</small
									>
								{/if}
							</div>
						{/each}
					</div>

					<button type="button" class="add-button" onclick={() => addInlineButton(row)}
						>+ Add button</button
					>
				</fieldset>
			{/each}

			<button type="button" class="add-row" onclick={addInlineRow}>+ Add row</button>
		</div>
	{:else if mode === 'reply'}
		<div class="editor" aria-label="Reply keyboard editor">
			<p class="editor-help">
				Pressing a button sends its label as a visible message. Reply keyboards are unavailable in
				channels.
			</p>

			{#each replyRows as row, rowIndex (row.id)}
				<fieldset class="keyboard-row">
					<legend>Row {rowIndex + 1}</legend>
					<div class="row-toolbar">
						<button
							type="button"
							onclick={() => moveItem(replyRows, rowIndex, -1)}
							disabled={rowIndex === 0}
							aria-label={`Move reply row ${rowIndex + 1} up`}>↑ Row</button
						>
						<button
							type="button"
							onclick={() => moveItem(replyRows, rowIndex, 1)}
							disabled={rowIndex === replyRows.length - 1}
							aria-label={`Move reply row ${rowIndex + 1} down`}>↓ Row</button
						>
						<button type="button" class="danger" onclick={() => removeReplyRow(rowIndex)}
							>Remove row</button
						>
					</div>

					<div class="button-list reply-buttons">
						{#each row.buttons as button, buttonIndex (button.id)}
							<div class="button-card reply-button">
								<label>
									<span>Button {buttonIndex + 1} label</span>
									<input
										type="text"
										value={button.text}
										oninput={(event) => {
											button.text = event.currentTarget.value;
											commit();
										}}
										aria-invalid={Boolean(
											fieldError(`reply_markup.keyboard[${rowIndex}][${buttonIndex}].text`)
										)}
									/>
								</label>
								<div class="compact-actions">
									<button
										type="button"
										onclick={() => moveItem(row.buttons, buttonIndex, -1)}
										disabled={buttonIndex === 0}
										aria-label={`Move reply button ${buttonIndex + 1} left`}>←</button
									>
									<button
										type="button"
										onclick={() => moveItem(row.buttons, buttonIndex, 1)}
										disabled={buttonIndex === row.buttons.length - 1}
										aria-label={`Move reply button ${buttonIndex + 1} right`}>→</button
									>
									<button
										type="button"
										class="danger"
										onclick={() => removeReplyButton(row, buttonIndex)}
										aria-label={`Remove reply button ${buttonIndex + 1}`}>×</button
									>
								</div>
							</div>
						{/each}
					</div>

					<button type="button" class="add-button" onclick={() => addReplyButton(row)}
						>+ Add button</button
					>
				</fieldset>
			{/each}

			<button type="button" class="add-row" onclick={addReplyRow}>+ Add row</button>

			<div class="options-grid">
				<label
					><input
						type="checkbox"
						checked={isPersistent}
						onchange={(event) => {
							isPersistent = event.currentTarget.checked;
							commit();
						}}
					/> Persistent</label
				>
				<label
					><input
						type="checkbox"
						checked={resizeKeyboard}
						onchange={(event) => {
							resizeKeyboard = event.currentTarget.checked;
							commit();
						}}
					/> Resize keyboard</label
				>
				<label
					><input
						type="checkbox"
						checked={oneTimeKeyboard}
						onchange={(event) => {
							oneTimeKeyboard = event.currentTarget.checked;
							commit();
						}}
					/> Hide after use</label
				>
			</div>

			<label class="standalone-field">
				<span>Input placeholder <small>{characterCount(replyPlaceholder)}/64</small></span>
				<input
					type="text"
					value={replyPlaceholder}
					oninput={(event) => {
						replyPlaceholder = event.currentTarget.value;
						commit();
					}}
					aria-invalid={Boolean(fieldError('reply_markup.input_field_placeholder'))}
				/>
			</label>
		</div>
	{:else if mode === 'remove'}
		<div class="mode-note">
			<strong>Remove the current reply keyboard</strong>
			<p>This permanently hides the custom keyboard. The user cannot reopen it.</p>
		</div>
	{:else if mode === 'force'}
		<div class="editor">
			<div class="mode-note">
				<strong>Open Telegram's reply composer</strong>
				<p>The user's response is sent as a normal reply to this message.</p>
			</div>
			<label class="standalone-field">
				<span>Input placeholder <small>{characterCount(forcePlaceholder)}/64</small></span>
				<input
					type="text"
					value={forcePlaceholder}
					oninput={(event) => {
						forcePlaceholder = event.currentTarget.value;
						commit();
					}}
					aria-invalid={Boolean(fieldError('reply_markup.input_field_placeholder'))}
				/>
			</label>
		</div>
	{/if}
</section>

<style>
	.reply-options {
		display: grid;
		gap: 0.9rem;
		border-top: 1px solid var(--border);
		padding-top: 1.1rem;
	}

	.section-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	h3,
	p {
		margin: 0;
	}

	h3 {
		font-size: 0.85rem;
	}

	.section-heading p,
	.editor-help,
	.mode-note p {
		margin-top: 0.25rem;
		color: var(--text-subtle);
		font-size: 0.65rem;
		line-height: 1.45;
	}

	.section-heading > span {
		color: var(--text-subtle);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.61rem;
	}

	.mode-picker,
	.keyboard-row {
		margin: 0;
		border: 1px solid var(--border);
		border-radius: 0.45rem;
		padding: 0.75rem;
	}

	.mode-picker {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem 1rem;
	}

	.mode-picker legend,
	.keyboard-row legend {
		padding: 0 0.3rem;
		font-size: 0.65rem;
		font-weight: 700;
	}

	.mode-picker label,
	.options-grid label {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.68rem;
	}

	.editor {
		display: grid;
		gap: 0.75rem;
	}

	.keyboard-row {
		display: grid;
		gap: 0.65rem;
		background: var(--surface-subtle, var(--surface));
	}

	.row-toolbar,
	.card-heading,
	.compact-actions {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.row-toolbar {
		justify-content: flex-end;
	}

	.card-heading {
		justify-content: space-between;
	}

	.card-heading strong {
		font-size: 0.66rem;
	}

	.button-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
		gap: 0.6rem;
	}

	.button-card {
		display: grid;
		align-content: start;
		gap: 0.55rem;
		border: 1px solid var(--border);
		border-radius: 0.4rem;
		background: var(--surface);
		padding: 0.65rem;
	}

	.button-card label,
	.standalone-field {
		display: grid;
		gap: 0.3rem;
		font-size: 0.64rem;
		font-weight: 650;
	}

	.button-card input,
	.button-card select,
	.standalone-field input {
		width: 100%;
		border: 1px solid var(--border-strong);
		border-radius: 0.35rem;
		background: var(--surface);
		padding: 0.55rem 0.6rem;
		color: var(--text);
		font: inherit;
		font-size: 0.7rem;
	}

	input:focus,
	select:focus,
	button:focus-visible {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px rgba(22, 138, 192, 0.1);
		outline: none;
	}

	input[aria-invalid='true'],
	select[aria-invalid='true'] {
		border-color: var(--danger);
	}

	button {
		border: 1px solid var(--border-strong);
		border-radius: 0.32rem;
		background: var(--surface);
		padding: 0.35rem 0.5rem;
		color: var(--text-muted, var(--text));
		font: inherit;
		font-size: 0.61rem;
		font-weight: 650;
		cursor: pointer;
	}

	button:hover:not(:disabled) {
		border-color: var(--accent);
		color: var(--accent);
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}

	button.danger:hover:not(:disabled) {
		border-color: var(--danger);
		color: var(--danger);
	}

	.add-button,
	.add-row {
		justify-self: start;
	}

	.reply-button {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: end;
	}

	.options-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.1rem;
	}

	.standalone-field small,
	.button-card small {
		color: var(--text-subtle);
		font-size: 0.58rem;
		font-weight: 400;
	}

	.button-card > small {
		justify-self: end;
	}

	.limit-exceeded,
	.section-error {
		color: var(--danger) !important;
	}

	.section-error {
		font-size: 0.65rem;
		font-weight: 650;
	}

	.mode-note {
		border-left: 3px solid var(--accent);
		background: var(--surface-subtle, var(--surface));
		padding: 0.7rem 0.8rem;
		font-size: 0.7rem;
	}

	@media (max-width: 560px) {
		.section-heading {
			flex-direction: column;
			gap: 0.3rem;
		}

		.mode-picker {
			align-items: flex-start;
			flex-direction: column;
		}

		.reply-button {
			grid-template-columns: 1fr;
		}
	}
</style>
