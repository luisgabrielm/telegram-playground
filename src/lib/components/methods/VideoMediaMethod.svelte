<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import { untrack } from 'svelte';
	import ReplyMarkupEditor from '$lib/components/reply-markup/ReplyMarkupEditor.svelte';
	import MessageOptionsEditor from '$lib/components/playground/MessageOptionsEditor.svelte';
	import EmptyResponse from '$lib/components/playground/EmptyResponse.svelte';
	import FormField from '$lib/components/playground/FormField.svelte';
	import MethodLayout from '$lib/components/playground/MethodLayout.svelte';
	import Notice from '$lib/components/playground/Notice.svelte';
	import PayloadPreview from '$lib/components/playground/PayloadPreview.svelte';
	import RequestPanel from '$lib/components/playground/RequestPanel.svelte';
	import ResponsePanel from '$lib/components/playground/ResponsePanel.svelte';
	import SubmitButton from '$lib/components/playground/SubmitButton.svelte';
	import { createMessageOptionsValue } from '$lib/message-options';
	import { buildMessageOptionsPayload } from '$lib/playground/message-options';
	import { restoreReplyMarkup } from '$lib/playground/reply-markup';
	import type { MediaFeedback, MethodComponentProps } from '$lib/playground/types';
	import type { TelegramReplyMarkup } from '$lib/reply-markup';

	type Action = 'sendVideo' | 'sendVideoNote';
	type VideoFeedback = MediaFeedback & { action: Action };
	type Props = MethodComponentProps & { kind: 'video' | 'videoNote' };

	let { initialFeedback, kind }: Props = $props();
	const isNote = untrack(() => kind === 'videoNote');
	const action: Action = isNote ? 'sendVideoNote' : 'sendVideo';
	const initial = untrack(() => {
		const candidate = initialFeedback as unknown as VideoFeedback | null;
		return candidate?.action === action ? candidate : null;
	});
	let pending = $state(false);
	let feedback = $state<VideoFeedback | null>(initial);
	let chatId = $state(initial?.fields?.chatId ?? '');
	let sourceType: 'reference' | 'upload' = $state(
		initial?.fields?.sourceType === 'upload' ? 'upload' : 'reference'
	);
	let mediaReference = $state(initial?.fields?.mediaReference ?? '');
	let mediaFile = $state<File | null>(null);
	let thumbnailFile = $state<File | null>(null);
	let caption = $state(initial?.fields?.caption ?? '');
	let duration = $state(initial?.fields?.duration ?? '');
	let width = $state(initial?.fields?.width ?? '');
	let height = $state(initial?.fields?.height ?? '');
	let length = $state(initial?.fields?.length ?? '');
	let supportsStreaming = $state(initial?.fields?.supportsStreaming === 'true');
	let hasSpoiler = $state(initial?.fields?.hasSpoiler === 'true');
	let messageOptions = $state(createMessageOptionsValue(initial?.fields?.messageOptions));
	let replyMarkup = $state<TelegramReplyMarkup | undefined>(
		restoreReplyMarkup(initial?.fields?.replyMarkup)
	);
	const mediaField = isNote ? 'videoNote' : 'video';
	const mediaError = $derived(
		(feedback?.fieldErrors as Record<string, string | undefined> | undefined)?.[mediaField]
	);
	const mediaFormName = isNote ? 'videoNoteFile' : 'videoFile';
	const referenceFormName = isNote ? 'videoNoteReference' : 'videoReference';
	const sentMessage = $derived(messageResult(feedback?.response));
	const requestPreview = $derived(buildPreview());

	const enhanceForm: SubmitFunction = () => {
		pending = true;
		feedback = null;
		return async ({ result, update }) => {
			try {
				feedback = getFeedback(result);
				if (result.type === 'success' && !isNote) caption = '';
				await update({ reset: false, invalidateAll: false });
			} finally {
				pending = false;
			}
		};
	};

	function getFeedback(result: ActionResult): VideoFeedback | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const value = result.data as VideoFeedback;
		return value.action === action ? value : null;
	}

	function buildPreview() {
		const payload: Record<string, unknown> = {
			chat_id: chatId.trim(),
			[isNote ? 'video_note' : 'video']:
				sourceType === 'upload' ? filePreview(mediaFile) : mediaReference.trim()
		};
		if (!isNote && caption.trim()) payload.caption = caption;
		if (hasValue(duration)) payload.duration = numericPreview(duration);
		if (isNote && hasValue(length)) payload.length = numericPreview(length);
		if (!isNote && hasValue(width)) payload.width = numericPreview(width);
		if (!isNote && hasValue(height)) payload.height = numericPreview(height);
		if (sourceType === 'upload' && thumbnailFile) payload.thumbnail = filePreview(thumbnailFile);
		if (!isNote && supportsStreaming) payload.supports_streaming = true;
		if (!isNote && hasSpoiler) payload.has_spoiler = true;
		if (replyMarkup) payload.reply_markup = replyMarkup;
		Object.assign(payload, buildMessageOptionsPayload(messageOptions, !isNote));
		return { encoding: sourceType === 'upload' ? ('multipart' as const) : ('json' as const), payload };
	}

	function filePreview(file: File | null) {
		return {
			$file: file
				? {
						name: file.name,
						type: file.type || 'application/octet-stream',
						size: file.size,
						last_modified: new Date(file.lastModified).toISOString()
					}
				: null
		};
	}

	function numericPreview(value: string | number) {
		const number = Number(value);
		return Number.isFinite(number) ? number : value;
	}

	function hasValue(value: string | number) {
		return typeof value === 'number' || Boolean(value.trim());
	}

	function messageResult(response: unknown): { message_id: number; chat: { id: number } } | null {
		if (!response || typeof response !== 'object' || !('ok' in response) || response.ok !== true) return null;
		const result = 'result' in response ? response.result : null;
		if (!result || typeof result !== 'object' || !('message_id' in result) || !('chat' in result)) return null;
		const chat = result.chat;
		if (!chat || typeof chat !== 'object' || !('id' in chat)) return null;
		return result as { message_id: number; chat: { id: number } };
	}
</script>

<MethodLayout
	apiMethod={action}
	title={isNote ? 'Video note' : 'Video'}
	description={isNote
		? 'Send a round MPEG-4 video note from a Telegram file ID or local file.'
		: 'Send an MPEG-4 video from a local file, HTTP URL, or Telegram file ID.'}
	documentationUrl={`https://core.telegram.org/bots/api#${action.toLowerCase()}`}
>
	{#snippet request()}
		<RequestPanel titleId={`${action}-request-title`} subtitle="Required and optional parameters">
			<form method="POST" action={`?/${action}`} enctype="multipart/form-data" use:enhance={enhanceForm} aria-busy={pending}>
				<FormField label="chat_id" inputId={`${action}-chatId`} meta="String · required" help="Numeric chat ID or public channel username." error={feedback?.fieldErrors?.chatId}>
					{#snippet children({ describedBy, invalid })}
						<input id={`${action}-chatId`} name="chatId" type="text" placeholder="123456789 or @channel" bind:value={chatId} aria-describedby={describedBy} aria-invalid={invalid} />
					{/snippet}
				</FormField>

				<fieldset>
					<legend>{isNote ? 'video_note' : 'video'} source</legend>
					<label><input type="radio" name="sourceType" value="reference" bind:group={sourceType} /> Telegram file ID{isNote ? '' : ' / URL'}</label>
					<label><input type="radio" name="sourceType" value="upload" bind:group={sourceType} /> Local file</label>
				</fieldset>

				{#if sourceType === 'reference'}
					<FormField label={isNote ? 'video_note' : 'video'} inputId={`${action}-reference`} meta="String · required" help={isNote ? 'A reusable Telegram file_id. The API does not accept URLs for video notes.' : 'An HTTP URL or reusable Telegram file_id.'} error={mediaError}>
						{#snippet children({ describedBy, invalid })}
							<input id={`${action}-reference`} name={referenceFormName} type="text" placeholder={isNote ? 'Telegram file_id' : 'https://… or file_id'} bind:value={mediaReference} aria-describedby={describedBy} aria-invalid={invalid} />
						{/snippet}
					</FormField>
				{:else}
					<FormField label={isNote ? 'video_note' : 'video'} inputId={`${action}-file`} meta="File · required · max 50 MB" help="MPEG-4 file sent directly to Telegram and not stored locally." error={mediaError}>
						{#snippet children({ describedBy, invalid })}
							<input id={`${action}-file`} name={mediaFormName} type="file" accept="video/mp4" onchange={(event) => (mediaFile = event.currentTarget.files?.[0] ?? null)} aria-describedby={describedBy} aria-invalid={invalid} />
						{/snippet}
					</FormField>

					<FormField label="thumbnail" inputId={`${action}-thumbnail`} meta="JPEG · optional · under 200 kB" help="Custom thumbnail, at most 320 × 320 pixels. Telegram only uses it with an uploaded video." error={feedback?.fieldErrors?.thumbnail}>
						{#snippet children({ describedBy, invalid })}
							<input id={`${action}-thumbnail`} name="thumbnailFile" type="file" accept="image/jpeg" onchange={(event) => (thumbnailFile = event.currentTarget.files?.[0] ?? null)} aria-describedby={describedBy} aria-invalid={invalid} />
						{/snippet}
					</FormField>
				{/if}

				{#if !isNote}
					<FormField label="caption" inputId={`${action}-caption`} meta={`String · optional · ${caption.length.toLocaleString()}/1,024`} metaInvalid={caption.length > 1024} help="Optionally format this caption with the parse mode under Message options." error={feedback?.fieldErrors?.caption}>
						{#snippet children({ describedBy, invalid })}
							<textarea id={`${action}-caption`} name="caption" rows="4" bind:value={caption} aria-describedby={describedBy} aria-invalid={invalid}></textarea>
						{/snippet}
					</FormField>
				{/if}

				<div class="number-grid">
					<FormField label="duration" inputId={`${action}-duration`} meta="Integer · optional" help={isNote ? 'Duration in seconds, from 0 to 60.' : 'Duration in whole seconds.'} error={feedback?.fieldErrors?.duration}>
						{#snippet children({ describedBy, invalid })}
							<input id={`${action}-duration`} name="duration" type="number" min="0" max={isNote ? 60 : undefined} step="1" bind:value={duration} aria-describedby={describedBy} aria-invalid={invalid} />
						{/snippet}
					</FormField>
					{#if isNote}
						<FormField label="length" inputId={`${action}-length`} meta="Integer · optional" help="Video width and height (diameter) in pixels." error={feedback?.fieldErrors?.length}>
							{#snippet children({ describedBy, invalid })}
								<input id={`${action}-length`} name="length" type="number" min="1" step="1" bind:value={length} aria-describedby={describedBy} aria-invalid={invalid} />
							{/snippet}
						</FormField>
					{:else}
						<FormField label="width" inputId={`${action}-width`} meta="Integer · optional" help="Video width in pixels." error={feedback?.fieldErrors?.width}>
							{#snippet children({ describedBy, invalid })}
								<input id={`${action}-width`} name="width" type="number" min="0" step="1" bind:value={width} aria-describedby={describedBy} aria-invalid={invalid} />
							{/snippet}
						</FormField>
						<FormField label="height" inputId={`${action}-height`} meta="Integer · optional" help="Video height in pixels." error={feedback?.fieldErrors?.height}>
							{#snippet children({ describedBy, invalid })}
								<input id={`${action}-height`} name="height" type="number" min="0" step="1" bind:value={height} aria-describedby={describedBy} aria-invalid={invalid} />
							{/snippet}
						</FormField>
					{/if}
				</div>

				{#if !isNote}
					<div class="checks">
						<label><input type="checkbox" name="supportsStreaming" value="true" bind:checked={supportsStreaming} /> Suitable for streaming</label>
						<label><input type="checkbox" name="hasSpoiler" value="true" bind:checked={hasSpoiler} /> Cover with a spoiler animation</label>
					</div>
				{/if}

				<ReplyMarkupEditor bind:value={replyMarkup} errors={feedback?.replyMarkupErrors} idPrefix={`${action}-reply`} />
				<MessageOptionsEditor bind:value={messageOptions} errors={feedback?.messageOptionsErrors} idPrefix={`${action}-options`} showParseMode={!isNote} />
				<PayloadPreview titleId={`${action}-payload-title`} payload={requestPreview.payload} encoding={requestPreview.encoding} />
				<SubmitButton {pending} />
			</form>
		</RequestPanel>
	{/snippet}

	{#snippet response()}
		<ResponsePanel titleId={`${action}-response-title`} status={feedback?.response ? (feedback.success ? 'success' : 'error') : undefined} rawResponse={feedback?.response}>
			{#if feedback?.success && sentMessage}
				<Notice kind="success" title={`${isNote ? 'Video note' : 'Video'} sent`}><p>Message <code>#{sentMessage.message_id}</code> was accepted for chat <code>{sentMessage.chat.id}</code>.</p></Notice>
			{:else if feedback?.error}
				<Notice kind="error" title="Request failed"><p>{feedback.error}</p></Notice>
			{:else}
				<EmptyResponse />
			{/if}
		</ResponsePanel>
	{/snippet}
</MethodLayout>

<style>
	form { display: grid; gap: 1.15rem; }
	fieldset { display: flex; gap: 1rem; border: 0; margin: 0; padding: 0; }
	legend { margin-bottom: 0.45rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.72rem; font-weight: 700; }
	fieldset label, .checks label { display: flex; align-items: center; gap: 0.35rem; color: var(--text-muted); font-size: 0.7rem; }
	.number-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8rem; }
	.checks { display: flex; flex-wrap: wrap; gap: 1rem; }
	input:not([type='radio']):not([type='checkbox']), textarea { width: 100%; border: 1px solid var(--border-strong); border-radius: 0.4rem; background: var(--surface); padding: 0.7rem 0.75rem; color: var(--text); font: inherit; font-size: 0.78rem; }
	textarea { resize: vertical; }
	input:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(22, 138, 192, 0.1); outline: none; }
	input[aria-invalid='true'], textarea[aria-invalid='true'] { border-color: #d46a74; }
	@media (max-width: 600px) { .number-grid { grid-template-columns: 1fr; } fieldset { align-items: flex-start; flex-direction: column; gap: 0.45rem; } }
</style>
