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
	import { buildAudioAnimationPayload } from '$lib/playground/payload';
	import { buildMessageOptionsPayload } from '$lib/playground/message-options';
	import { restoreReplyMarkup } from '$lib/playground/reply-markup';
	import { createMessageOptionsValue } from '$lib/message-options';
	import type { MediaFeedback, MethodComponentProps } from '$lib/playground/types';
	import type { TelegramReplyMarkup } from '$lib/reply-markup';

	type Action = 'sendAudio' | 'sendAnimation';
	type Props = MethodComponentProps & {
		action: Action;
		title: string;
		description: string;
		mediaName: 'audio' | 'animation';
		accept: string;
		documentationUrl: string;
	};

	let { initialFeedback, action, title, description, mediaName, accept, documentationUrl }: Props =
		$props();
	const initial = untrack(() =>
		initialFeedback?.action === action ? (initialFeedback as MediaFeedback) : null
	);
	let pending = $state(false);
	let feedback = $state<MediaFeedback | null>(initial);
	let chatId = $state(initial?.fields?.chatId ?? '');
	let sourceType: 'reference' | 'upload' = $state(
		initial?.fields?.sourceType === 'upload' ? 'upload' : 'reference'
	);
	let mediaReference = $state(initial?.fields?.mediaReference ?? '');
	let mediaFile = $state<File | null>(null);
	let thumbnailFile = $state<File | null>(null);
	let caption = $state(initial?.fields?.caption ?? '');
	let duration = $state(initial?.fields?.duration ?? '');
	let performer = $state(initial?.fields?.performer ?? '');
	let trackTitle = $state(initial?.fields?.title ?? '');
	let width = $state(initial?.fields?.width ?? '');
	let height = $state(initial?.fields?.height ?? '');
	let hasSpoiler = $state(initial?.fields?.hasSpoiler === 'true');
	let messageOptions = $state(createMessageOptionsValue(initial?.fields?.messageOptions));
	let replyMarkup = $state<TelegramReplyMarkup | undefined>(
		restoreReplyMarkup(initial?.fields?.replyMarkup)
	);
	const sentMessage = $derived(messageResult(feedback?.response));
	const mediaError = $derived(
		feedback?.fieldErrors
			? (feedback.fieldErrors as Record<string, string | undefined>)[mediaName]
			: undefined
	);
	const requestPreview = $derived.by(() => {
		const preview = buildAudioAnimationPayload({
			chatId,
			mediaName,
			sourceType,
			mediaReference,
			file: mediaFile,
			caption,
			duration,
			performer: mediaName === 'audio' ? performer : undefined,
			title: mediaName === 'audio' ? trackTitle : undefined,
			width: mediaName === 'animation' ? width : undefined,
			height: mediaName === 'animation' ? height : undefined,
			thumbnailFile: sourceType === 'upload' ? thumbnailFile : null,
			hasSpoiler: mediaName === 'animation' ? hasSpoiler : undefined,
			replyMarkup
		});
		return {
			...preview,
			payload: { ...preview.payload, ...buildMessageOptionsPayload(messageOptions) }
		};
	});

	const enhanceForm: SubmitFunction = () => {
		pending = true;
		feedback = null;
		return async ({ result, update }) => {
			try {
				feedback = getFeedback(result);
				if (result.type === 'success') caption = '';
				await update({ reset: false, invalidateAll: false });
			} finally {
				pending = false;
			}
		};
	};

	function getFeedback(result: ActionResult): MediaFeedback | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const value = result.data as MediaFeedback;
		return value.action === action ? value : null;
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

<MethodLayout apiMethod={action} {title} {description} {documentationUrl}>
	{#snippet request()}
		<RequestPanel titleId={`${action}-request-title`} subtitle="Required and optional parameters">
			<form method="POST" action={`?/${action}`} enctype="multipart/form-data" use:enhance={enhanceForm} aria-busy={pending}>
				<FormField label="chat_id" inputId={`${action}-chat-id`} meta="String · required" help="Numeric chat ID or public channel username." error={feedback?.fieldErrors?.chatId}>
					{#snippet children({ describedBy, invalid })}
						<input id={`${action}-chat-id`} name="chatId" type="text" placeholder="123456789 or @channel" bind:value={chatId} aria-describedby={describedBy} aria-invalid={invalid} />
					{/snippet}
				</FormField>

				<fieldset class="source-options">
					<legend>{mediaName} source</legend>
					<label><input type="radio" name="sourceType" value="reference" bind:group={sourceType} /> URL / file ID</label>
					<label><input type="radio" name="sourceType" value="upload" bind:group={sourceType} /> Local file</label>
				</fieldset>

				{#if sourceType === 'reference'}
					<FormField label={mediaName} inputId={`${action}-reference`} meta="String · required" help="An HTTP URL or Telegram file_id." error={mediaError}>
						{#snippet children({ describedBy, invalid })}
							<input id={`${action}-reference`} name={`${mediaName}Reference`} type="text" placeholder="https://… or file_id" bind:value={mediaReference} aria-describedby={describedBy} aria-invalid={invalid} />
						{/snippet}
					</FormField>
				{:else}
					<FormField label={mediaName} inputId={`${action}-file`} meta="File · required · max 50 MB" help="The file is sent directly to Telegram and is not stored." error={mediaError}>
						{#snippet children({ describedBy, invalid })}
							<input id={`${action}-file`} name={`${mediaName}File`} type="file" {accept} onchange={(event) => (mediaFile = event.currentTarget.files?.[0] ?? null)} aria-describedby={describedBy} aria-invalid={invalid} />
						{/snippet}
					</FormField>

					<FormField label="thumbnail" inputId={`${action}-thumbnail`} meta="JPEG file · optional · max 200 kB" help="Telegram only accepts a new JPEG thumbnail with a local media upload." error={feedback?.fieldErrors?.thumbnail}>
						{#snippet children({ describedBy, invalid })}
							<input id={`${action}-thumbnail`} name="thumbnailFile" type="file" accept="image/jpeg" onchange={(event) => (thumbnailFile = event.currentTarget.files?.[0] ?? null)} aria-describedby={describedBy} aria-invalid={invalid} />
						{/snippet}
					</FormField>
				{/if}

				<FormField label="caption" inputId={`${action}-caption`} meta={`String · optional · ${caption.length.toLocaleString()}/1,024`} metaInvalid={caption.length > 1024} help="Optionally format this caption with the parse mode under Message options." error={feedback?.fieldErrors?.caption}>
					{#snippet children({ describedBy, invalid })}
						<textarea id={`${action}-caption`} name="caption" rows="3" bind:value={caption} aria-describedby={describedBy} aria-invalid={invalid}></textarea>
					{/snippet}
				</FormField>

				<div class="numeric-grid">
					<FormField label="duration" inputId={`${action}-duration`} meta="Integer · optional" help={`Duration of the ${mediaName} in whole seconds.`} error={feedback?.fieldErrors?.duration}>
						{#snippet children({ describedBy, invalid })}
							<input id={`${action}-duration`} name="duration" type="number" min="0" step="1" bind:value={duration} aria-describedby={describedBy} aria-invalid={invalid} />
						{/snippet}
					</FormField>
					{#if mediaName === 'animation'}
						<FormField label="width" inputId={`${action}-width`} meta="Integer · optional" help="Animation width in pixels." error={feedback?.fieldErrors?.width}>
							{#snippet children({ describedBy, invalid })}<input id={`${action}-width`} name="width" type="number" min="1" step="1" bind:value={width} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
						</FormField>
						<FormField label="height" inputId={`${action}-height`} meta="Integer · optional" help="Animation height in pixels." error={feedback?.fieldErrors?.height}>
							{#snippet children({ describedBy, invalid })}<input id={`${action}-height`} name="height" type="number" min="1" step="1" bind:value={height} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
						</FormField>
					{/if}
				</div>

				{#if mediaName === 'audio'}
					<div class="numeric-grid">
						<FormField label="performer" inputId={`${action}-performer`} meta="String · optional" help="Artist or performer displayed by Telegram." error={feedback?.fieldErrors?.performer}>
							{#snippet children({ describedBy, invalid })}<input id={`${action}-performer`} name="performer" type="text" bind:value={performer} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
						</FormField>
						<FormField label="title" inputId={`${action}-title`} meta="String · optional" help="Track name displayed by Telegram." error={feedback?.fieldErrors?.title}>
							{#snippet children({ describedBy, invalid })}<input id={`${action}-title`} name="title" type="text" bind:value={trackTitle} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
						</FormField>
					</div>
				{:else}
					<label class="check-field"><input type="checkbox" name="hasSpoiler" value="true" bind:checked={hasSpoiler} /><span>Hide the animation behind a spoiler</span></label>
				{/if}

				<ReplyMarkupEditor bind:value={replyMarkup} errors={feedback?.replyMarkupErrors} idPrefix={`${action}-reply`} />
				<MessageOptionsEditor bind:value={messageOptions} errors={feedback?.messageOptionsErrors} idPrefix={`${action}-options`} />
				<PayloadPreview titleId={`${action}-payload-title`} payload={requestPreview.payload} encoding={requestPreview.encoding} />
				<SubmitButton {pending} />
			</form>
		</RequestPanel>
	{/snippet}

	{#snippet response()}
		<ResponsePanel titleId={`${action}-response-title`} status={feedback?.response ? (feedback.success ? 'success' : 'error') : undefined} rawResponse={feedback?.response}>
			{#if feedback?.success && sentMessage}
				<Notice kind="success" title={`${title} sent`}><p>Message <code>#{sentMessage.message_id}</code> was accepted for chat <code>{sentMessage.chat.id}</code>.</p></Notice>
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
	.source-options { display: flex; gap: 1rem; border: 0; margin: 0; padding: 0; }
	legend { margin-bottom: 0.45rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.72rem; font-weight: 700; }
	.source-options label, .check-field { display: flex; align-items: center; gap: 0.4rem; color: var(--text-muted); font-size: 0.7rem; }
	.numeric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 1rem; }
	input:not([type='radio']):not([type='checkbox']), textarea { width: 100%; border: 1px solid var(--border-strong); border-radius: 0.4rem; background: var(--surface); padding: 0.7rem 0.75rem; color: var(--text); font: inherit; font-size: 0.78rem; }
	textarea { resize: vertical; }
	input:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(22, 138, 192, 0.1); outline: none; }
	input[aria-invalid='true'], textarea[aria-invalid='true'] { border-color: #d46a74; }
</style>
