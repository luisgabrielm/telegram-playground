<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import { untrack } from 'svelte';
	import EmptyResponse from '$lib/components/playground/EmptyResponse.svelte';
	import FormField from '$lib/components/playground/FormField.svelte';
	import MethodLayout from '$lib/components/playground/MethodLayout.svelte';
	import MessageOptionsEditor from '$lib/components/playground/MessageOptionsEditor.svelte';
	import Notice from '$lib/components/playground/Notice.svelte';
	import PayloadPreview from '$lib/components/playground/PayloadPreview.svelte';
	import RequestPanel from '$lib/components/playground/RequestPanel.svelte';
	import ResponsePanel from '$lib/components/playground/ResponsePanel.svelte';
	import SubmitButton from '$lib/components/playground/SubmitButton.svelte';
	import { buildMediaGroupPayload } from '$lib/playground/payload';
	import { buildMessageOptionsPayload } from '$lib/playground/message-options';
	import { createMessageOptionsValue, type TelegramParseMode } from '$lib/message-options';
	import type { MediaGroupFeedback, MethodComponentProps } from '$lib/playground/types';
	import type { MediaGroupItemType } from '$lib/server/methods/media-group';

	type SourceType = 'reference' | 'upload';
	type MediaRow = {
		id: number;
		type: MediaGroupItemType;
		sourceType: SourceType;
		reference: string;
		file: File | null;
		caption: string;
		parseMode: '' | TelegramParseMode;
	};

	let { initialFeedback }: MethodComponentProps = $props();
	const initial = untrack(() =>
		initialFeedback?.action === 'sendMediaGroup'
			? (initialFeedback as MediaGroupFeedback)
			: null
	);
	let pending = $state(false);
	let feedback = $state<MediaGroupFeedback | null>(initial);
	let chatId = $state(initial?.fields?.chatId ?? '');
	let nextRowId = 0;
	let rows = $state<MediaRow[]>(createInitialRows());
	let messageOptions = $state(createMessageOptionsValue(initial?.fields?.messageOptions));
	const requestPreview = $derived.by(() => {
		const preview = buildMediaGroupPayload({
			chatId,
			items: rows.map((row) => ({
				type: row.type,
				sourceType: row.sourceType,
				reference: row.reference,
				file: row.file,
				caption: row.caption
			}))
		});
		const media = (preview.payload.media as Array<Record<string, unknown>>).map((item, index) => ({
			...item,
			...(rows[index]?.caption.trim() && rows[index]?.parseMode
				? { parse_mode: rows[index].parseMode }
				: {})
		}));
		return {
			...preview,
			payload: {
				...preview.payload,
				media,
				...buildMessageOptionsPayload(messageOptions, false)
			}
		};
	});
	const sentMessages = $derived(messageResults(feedback?.response));

	const enhanceForm: SubmitFunction = () => {
		pending = true;
		feedback = null;

		return async ({ result, update }) => {
			try {
				feedback = getFeedback(result);
				if (result.type === 'success') {
					for (const row of rows) row.caption = '';
				}
				await update({ reset: false, invalidateAll: false });
			} finally {
				pending = false;
			}
		};
	};

	function createInitialRows(): MediaRow[] {
		const types = initial?.fields?.itemType ?? [];
		const sourceTypes = initial?.fields?.itemSourceType ?? [];
		const references = initial?.fields?.itemReference ?? [];
		const captions = initial?.fields?.itemCaption ?? [];
		const parseModes = initial?.fields?.itemParseMode ?? [];
		const count = Math.max(2, types.length, sourceTypes.length, references.length, captions.length, parseModes.length);
		return Array.from({ length: Math.min(count, 10) }, (_, index) =>
			createRow(
				isItemType(types[index]) ? types[index] : 'photo',
				sourceTypes[index] === 'upload' ? 'upload' : 'reference',
				references[index] ?? '',
				captions[index] ?? '',
				isParseMode(parseModes[index]) ? parseModes[index] : ''
			)
		);
	}

	function createRow(
		type: MediaGroupItemType = 'photo',
		sourceType: SourceType = 'reference',
		reference = '',
		caption = '',
		parseMode: '' | TelegramParseMode = ''
	): MediaRow {
		return { id: nextRowId++, type, sourceType, reference, file: null, caption, parseMode };
	}

	function isParseMode(value: string | undefined): value is TelegramParseMode {
		return value === 'HTML' || value === 'MarkdownV2';
	}

	function isItemType(value: string | undefined): value is MediaGroupItemType {
		return value === 'photo' || value === 'video' || value === 'audio' || value === 'document';
	}

	function addRow() {
		if (rows.length < 10) rows.push(createRow(rows.at(-1)?.type ?? 'photo'));
	}

	function removeRow(index: number) {
		if (rows.length > 2) rows.splice(index, 1);
	}

	function moveRow(index: number, direction: -1 | 1) {
		const destination = index + direction;
		if (destination < 0 || destination >= rows.length) return;
		[rows[index], rows[destination]] = [rows[destination], rows[index]];
	}

	function getFeedback(result: ActionResult): MediaGroupFeedback | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const value = result.data as MediaGroupFeedback;
		return value.action === 'sendMediaGroup' ? value : null;
	}

	function messageResults(response: unknown): Array<{ message_id: number; chat: { id: number } }> {
		if (!response || typeof response !== 'object' || !('ok' in response) || response.ok !== true) {
			return [];
		}
		const result = 'result' in response ? response.result : null;
		if (!Array.isArray(result)) return [];
		return result.filter(
			(message): message is { message_id: number; chat: { id: number } } =>
				Boolean(
					message &&
						typeof message === 'object' &&
						'message_id' in message &&
						'chat' in message &&
						message.chat &&
						typeof message.chat === 'object' &&
						'id' in message.chat
				)
		);
	}

	function acceptFor(type: MediaGroupItemType) {
		if (type === 'photo') return 'image/*';
		if (type === 'video') return 'video/*';
		if (type === 'audio') return 'audio/*';
		return undefined;
	}
</script>

<MethodLayout
	apiMethod="sendMediaGroup"
	title="Media group"
	description="Send an album containing 2–10 photos, videos, audio files, or documents."
	documentationUrl="https://core.telegram.org/bots/api#sendmediagroup"
>
	{#snippet request()}
		<RequestPanel titleId="send-media-group-request-title" subtitle="Album parameters">
			<form
				method="POST"
				action="?/sendMediaGroup"
				enctype="multipart/form-data"
				use:enhance={enhanceForm}
				aria-busy={pending}
			>
				<FormField
					label="chat_id"
					inputId="media-group-chat-id"
					meta="String · required"
					help="Numeric chat ID or public channel username."
					error={feedback?.fieldErrors?.chatId}
				>
					{#snippet children({ describedBy, invalid })}
						<input
							id="media-group-chat-id"
							name="chatId"
							type="text"
							placeholder="123456789 or @channel"
							bind:value={chatId}
							aria-describedby={describedBy}
							aria-invalid={invalid}
						/>
					{/snippet}
				</FormField>

				<section class="album" aria-labelledby="media-group-items-title">
					<div class="album-heading">
						<div>
							<h3 id="media-group-items-title">media</h3>
							<p>Photo and video can mix. Audio and document albums must contain one type only.</p>
						</div>
						<button type="button" onclick={addRow} disabled={rows.length >= 10 || pending}>Add item</button>
					</div>
					{#if feedback?.fieldErrors?.items}
						<p class="album-error" role="alert">{feedback.fieldErrors.items}</p>
					{/if}

					<div class="items">
						{#each rows as row, index (row.id)}
							<fieldset class="media-item">
								<legend>Item {index + 1}</legend>
								<div class="item-actions">
									<button type="button" onclick={() => moveRow(index, -1)} disabled={index === 0 || pending} aria-label={`Move item ${index + 1} up`}>↑</button>
									<button type="button" onclick={() => moveRow(index, 1)} disabled={index === rows.length - 1 || pending} aria-label={`Move item ${index + 1} down`}>↓</button>
									<button type="button" onclick={() => removeRow(index)} disabled={rows.length <= 2 || pending} aria-label={`Remove item ${index + 1}`}>Remove</button>
								</div>

								<div class="compact-grid">
									<FormField label="type" inputId={`media-group-type-${row.id}`} meta="Required" help="Telegram media type for this album item." error={feedback?.fieldErrors?.[`itemType.${index}`]}>
										{#snippet children({ describedBy, invalid })}
											<select id={`media-group-type-${row.id}`} name="itemType" bind:value={row.type} aria-describedby={describedBy} aria-invalid={invalid}>
												<option value="photo">Photo</option>
												<option value="video">Video</option>
												<option value="audio">Audio</option>
												<option value="document">Document</option>
											</select>
										{/snippet}
									</FormField>

									<FormField label="source" inputId={`media-group-source-${row.id}`} meta="Required" help="Use a Telegram file ID, an HTTP URL, or a local upload.">
										{#snippet children({ describedBy })}
											<select id={`media-group-source-${row.id}`} name="itemSourceType" bind:value={row.sourceType} aria-describedby={describedBy}>
												<option value="reference">URL / file ID</option>
												<option value="upload">Local file</option>
											</select>
										{/snippet}
									</FormField>
								</div>

								<div hidden={row.sourceType !== 'reference'}>
									<FormField label="media" inputId={`media-group-reference-${row.id}`} meta="String · required" help="An HTTP URL or Telegram file_id." error={feedback?.fieldErrors?.[`itemReference.${index}`]}>
										{#snippet children({ describedBy, invalid })}
											<input id={`media-group-reference-${row.id}`} name="itemReference" type="text" placeholder="https://… or file_id" bind:value={row.reference} aria-describedby={describedBy} aria-invalid={invalid} />
										{/snippet}
									</FormField>
								</div>

								{#if row.sourceType === 'upload'}
									<FormField label="media" inputId={`media-group-file-${row.id}`} meta="File · required" help="The file is sent directly to Telegram and is not stored." error={feedback?.fieldErrors?.[`itemFile.${index}`]}>
										{#snippet children({ describedBy, invalid })}
											<input id={`media-group-file-${row.id}`} name={`itemFile.${index}`} type="file" accept={acceptFor(row.type)} onchange={(event) => (row.file = event.currentTarget.files?.[0] ?? null)} aria-describedby={describedBy} aria-invalid={invalid} />
										{/snippet}
									</FormField>
								{/if}

								<FormField label="caption" inputId={`media-group-caption-${row.id}`} meta={`String · optional · ${row.caption.length.toLocaleString()}/1,024`} metaInvalid={!row.parseMode && row.caption.length > 1024} help="Optional caption for this album item. Telegram checks formatted length when a parse mode is selected." error={feedback?.fieldErrors?.[`itemCaption.${index}`]}>
									{#snippet children({ describedBy, invalid })}
										<textarea id={`media-group-caption-${row.id}`} name="itemCaption" rows="2" bind:value={row.caption} aria-describedby={describedBy} aria-invalid={invalid}></textarea>
									{/snippet}
								</FormField>
								<FormField label="parse_mode" inputId={`media-group-parse-mode-${row.id}`} meta="String · optional" help="Telegram parses this item's caption as HTML or MarkdownV2." error={feedback?.fieldErrors?.[`itemParseMode.${index}`]}>
									{#snippet children({ describedBy, invalid })}
										<select id={`media-group-parse-mode-${row.id}`} name="itemParseMode" bind:value={row.parseMode} aria-describedby={describedBy} aria-invalid={invalid}>
											<option value="">None</option>
											<option value="HTML">HTML</option>
											<option value="MarkdownV2">MarkdownV2</option>
										</select>
									{/snippet}
								</FormField>
							</fieldset>
						{/each}
					</div>
				</section>
				<MessageOptionsEditor bind:value={messageOptions} errors={feedback?.messageOptionsErrors} idPrefix="send-media-group-options" showParseMode={false} />

				<PayloadPreview titleId="send-media-group-payload-title" payload={requestPreview.payload} encoding={requestPreview.encoding} />
				<SubmitButton {pending} />
			</form>
		</RequestPanel>
	{/snippet}

	{#snippet response()}
		<ResponsePanel titleId="send-media-group-response-title" status={feedback?.response ? (feedback.success ? 'success' : 'error') : undefined} rawResponse={feedback?.response}>
			{#if feedback?.success && sentMessages.length > 0}
				<Notice kind="success" title="Media group sent">
					<p>{sentMessages.length} messages were accepted for chat <code>{sentMessages[0].chat.id}</code>.</p>
					<ul>
						{#each sentMessages as message (message.message_id)}
							<li><code>#{message.message_id}</code></li>
						{/each}
					</ul>
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
	form, .items { display: grid; gap: 1.15rem; }
	.album { display: grid; gap: 0.8rem; }
	.album-heading { display: flex; align-items: start; justify-content: space-between; gap: 1rem; }
	h3, .album-heading p, .album-error { margin: 0; }
	h3 { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.72rem; }
	.album-heading p { margin-top: 0.25rem; color: var(--text-muted); font-size: 0.65rem; line-height: 1.4; }
	.album-error { color: #b83f4c; font-size: 0.68rem; }
	.media-item { position: relative; display: grid; gap: 1rem; min-width: 0; margin: 0; border: 1px solid var(--border); border-radius: 0.45rem; padding: 0.9rem; }
	.media-item legend { padding: 0 0.3rem; font-size: 0.68rem; font-weight: 750; }
	.item-actions { position: absolute; top: -0.7rem; right: 0.6rem; display: flex; gap: 0.3rem; background: var(--surface); padding: 0 0.2rem; }
	.compact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
	button { border: 1px solid var(--border-strong); border-radius: 0.32rem; background: var(--surface); padding: 0.38rem 0.55rem; color: var(--text); font: inherit; font-size: 0.62rem; font-weight: 700; cursor: pointer; }
	button:disabled { cursor: not-allowed; opacity: 0.45; }
	button:focus-visible { outline: 3px solid rgba(22, 138, 192, 0.18); outline-offset: 2px; }
	input, select, textarea { width: 100%; border: 1px solid var(--border-strong); border-radius: 0.4rem; background: var(--surface); padding: 0.65rem 0.7rem; color: var(--text); font: inherit; font-size: 0.74rem; }
	textarea { resize: vertical; }
	input:focus, select:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(22, 138, 192, 0.1); outline: none; }
	input[aria-invalid='true'], select[aria-invalid='true'], textarea[aria-invalid='true'] { border-color: #d46a74; }
	ul { display: flex; flex-wrap: wrap; gap: 0.45rem; margin: 0.6rem 0 0; padding: 0; list-style: none; }
	@media (max-width: 560px) { .compact-grid { grid-template-columns: 1fr; } .album-heading { align-items: stretch; flex-direction: column; } .album-heading button { align-self: start; } }
</style>
