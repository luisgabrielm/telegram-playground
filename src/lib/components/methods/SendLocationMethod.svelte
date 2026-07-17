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
	import { buildSendLocationPayload } from '$lib/playground/payload';
	import { restoreReplyMarkup } from '$lib/playground/reply-markup';
	import type { LocationFeedback, MethodComponentProps } from '$lib/playground/types';
	import type { TelegramReplyMarkup } from '$lib/reply-markup';

	let { initialFeedback }: MethodComponentProps = $props();
	const initial = untrack(() => initialFeedback?.action === 'sendLocation' ? initialFeedback : null);
	let pending = $state(false);
	let feedback = $state<LocationFeedback | null>(initial);
	let chatId = $state(initial?.fields?.chatId ?? '');
	let latitude = $state(initial?.fields?.latitude ?? '');
	let longitude = $state(initial?.fields?.longitude ?? '');
	let horizontalAccuracy = $state(initial?.fields?.horizontalAccuracy ?? '');
	let livePeriod = $state(initial?.fields?.livePeriod ?? '');
	let heading = $state(initial?.fields?.heading ?? '');
	let proximityAlertRadius = $state(initial?.fields?.proximityAlertRadius ?? '');
	let replyMarkup = $state<TelegramReplyMarkup | undefined>(restoreReplyMarkup(initial?.fields?.replyMarkup));
	const requestPayload = $derived(buildSendLocationPayload({ chatId, latitude, longitude, horizontalAccuracy, livePeriod, heading, proximityAlertRadius, replyMarkup }));
	const sentMessage = $derived(messageResult(feedback?.response));

	const enhanceForm: SubmitFunction = () => {
		pending = true; feedback = null;
		return async ({ result, update }) => {
			try { feedback = getFeedback(result); await update({ reset: false, invalidateAll: false }); }
			finally { pending = false; }
		};
	};

	function getFeedback(result: ActionResult): LocationFeedback | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const value = result.data as LocationFeedback;
		return value.action === 'sendLocation' ? value : null;
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

<MethodLayout apiMethod="sendLocation" title="Location" description="Send a static or live geographic point." documentationUrl="https://core.telegram.org/bots/api#sendlocation">
	{#snippet request()}
		<RequestPanel titleId="send-location-request-title" subtitle="Required and optional parameters">
			<form method="POST" action="?/sendLocation" use:enhance={enhanceForm} aria-busy={pending}>
				<FormField label="chat_id" inputId="location-chat-id" meta="String · required" help="Numeric chat ID or public channel username." error={feedback?.fieldErrors?.chatId}>
					{#snippet children({ describedBy, invalid })}<input id="location-chat-id" name="chatId" bind:value={chatId} placeholder="123456789 or @channel" aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
				</FormField>
				<div class="field-grid">
					<FormField label="latitude" inputId="location-latitude" meta="Float · required" help="Decimal degrees from -90 to 90." error={feedback?.fieldErrors?.latitude}>
						{#snippet children({ describedBy, invalid })}<input id="location-latitude" name="latitude" type="number" min="-90" max="90" step="any" bind:value={latitude} placeholder="-23.5505" aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
					</FormField>
					<FormField label="longitude" inputId="location-longitude" meta="Float · required" help="Decimal degrees from -180 to 180." error={feedback?.fieldErrors?.longitude}>
						{#snippet children({ describedBy, invalid })}<input id="location-longitude" name="longitude" type="number" min="-180" max="180" step="any" bind:value={longitude} placeholder="-46.6333" aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
					</FormField>
				</div>
				<FormField label="horizontal_accuracy" inputId="location-accuracy" meta="Float · optional" help="Uncertainty radius from 0 to 1,500 meters." error={feedback?.fieldErrors?.horizontalAccuracy}>
					{#snippet children({ describedBy, invalid })}<input id="location-accuracy" name="horizontalAccuracy" type="number" min="0" max="1500" step="any" bind:value={horizontalAccuracy} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
				</FormField>
				<section class="live-fields" aria-labelledby="location-live-title">
					<div><h3 id="location-live-title">Live location</h3><p>Set a period to enable heading and proximity alerts.</p></div>
					<FormField label="live_period" inputId="location-live-period" meta="Integer · optional" help="60–86,400 seconds, or 2,147,483,647 for indefinite." error={feedback?.fieldErrors?.livePeriod}>
						{#snippet children({ describedBy, invalid })}<input id="location-live-period" name="livePeriod" type="number" step="1" bind:value={livePeriod} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
					</FormField>
					<div class="field-grid">
						<FormField label="heading" inputId="location-heading" meta="Integer · optional" help="Direction from 1 to 360 degrees." error={feedback?.fieldErrors?.heading}>
							{#snippet children({ describedBy, invalid })}<input id="location-heading" name="heading" type="number" min="1" max="360" step="1" bind:value={heading} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
						</FormField>
						<FormField label="proximity_alert_radius" inputId="location-proximity" meta="Integer · optional" help="Alert radius from 1 to 100,000 meters." error={feedback?.fieldErrors?.proximityAlertRadius}>
							{#snippet children({ describedBy, invalid })}<input id="location-proximity" name="proximityAlertRadius" type="number" min="1" max="100000" step="1" bind:value={proximityAlertRadius} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
						</FormField>
					</div>
				</section>
				<ReplyMarkupEditor bind:value={replyMarkup} errors={feedback?.replyMarkupErrors} idPrefix="send-location-reply" />
				<PayloadPreview titleId="send-location-payload-title" payload={requestPayload} />
				<SubmitButton {pending} />
			</form>
		</RequestPanel>
	{/snippet}
	{#snippet response()}
		<ResponsePanel titleId="send-location-response-title" status={feedback?.response ? (feedback.success ? 'success' : 'error') : undefined} rawResponse={feedback?.response}>
			{#if feedback?.success && sentMessage}<Notice kind="success" title="Location sent"><p>Message <code>#{sentMessage.message_id}</code> sent to chat <code>{sentMessage.chat.id}</code>.</p></Notice>
			{:else if feedback?.error}<Notice kind="error" title="Request failed"><p>{feedback.error}</p></Notice>
			{:else}<EmptyResponse />{/if}
		</ResponsePanel>
	{/snippet}
</MethodLayout>

<style>
	form, .live-fields { display: grid; gap: 1.15rem; }
	.field-grid { display: grid; gap: 1.15rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.live-fields { border: 1px solid var(--border); border-radius: 0.45rem; padding: 1rem; }
	.live-fields h3, .live-fields p { margin: 0; }
	.live-fields h3 { font-size: 0.82rem; }
	.live-fields p { color: var(--text-muted); font-size: 0.72rem; margin-top: 0.25rem; }
	input { width: 100%; border: 1px solid var(--border-strong); border-radius: 0.4rem; background: var(--surface); padding: 0.7rem 0.75rem; color: var(--text); font: inherit; font-size: 0.78rem; }
	input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(22, 138, 192, 0.1); outline: none; }
	input[aria-invalid='true'] { border-color: #d46a74; }
	@media (max-width: 620px) { .field-grid { grid-template-columns: 1fr; } }
</style>
