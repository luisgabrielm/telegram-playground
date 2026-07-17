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
	import { buildSendVenuePayload } from '$lib/playground/payload';
	import { restoreReplyMarkup } from '$lib/playground/reply-markup';
	import type { MethodComponentProps, VenueFeedback } from '$lib/playground/types';
	import type { TelegramReplyMarkup } from '$lib/reply-markup';

	let { initialFeedback }: MethodComponentProps = $props();
	const initial = untrack(() => initialFeedback?.action === 'sendVenue' ? initialFeedback : null);
	let pending = $state(false);
	let feedback = $state<VenueFeedback | null>(initial);
	let chatId = $state(initial?.fields?.chatId ?? '');
	let latitude = $state(initial?.fields?.latitude ?? '');
	let longitude = $state(initial?.fields?.longitude ?? '');
	let title = $state(initial?.fields?.title ?? '');
	let address = $state(initial?.fields?.address ?? '');
	let foursquareId = $state(initial?.fields?.foursquareId ?? '');
	let foursquareType = $state(initial?.fields?.foursquareType ?? '');
	let googlePlaceId = $state(initial?.fields?.googlePlaceId ?? '');
	let googlePlaceType = $state(initial?.fields?.googlePlaceType ?? '');
	let replyMarkup = $state<TelegramReplyMarkup | undefined>(restoreReplyMarkup(initial?.fields?.replyMarkup));
	const requestPayload = $derived(buildSendVenuePayload({ chatId, latitude, longitude, title, address, foursquareId, foursquareType, googlePlaceId, googlePlaceType, replyMarkup }));
	const sentMessage = $derived(messageResult(feedback?.response));

	const enhanceForm: SubmitFunction = () => {
		pending = true; feedback = null;
		return async ({ result, update }) => {
			try { feedback = getFeedback(result); await update({ reset: false, invalidateAll: false }); }
			finally { pending = false; }
		};
	};

	function getFeedback(result: ActionResult): VenueFeedback | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const value = result.data as VenueFeedback;
		return value.action === 'sendVenue' ? value : null;
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

<MethodLayout apiMethod="sendVenue" title="Venue" description="Send a named place with an address and optional provider metadata." documentationUrl="https://core.telegram.org/bots/api#sendvenue">
	{#snippet request()}
		<RequestPanel titleId="send-venue-request-title" subtitle="Required and optional parameters">
			<form method="POST" action="?/sendVenue" use:enhance={enhanceForm} aria-busy={pending}>
				<FormField label="chat_id" inputId="venue-chat-id" meta="String · required" help="Numeric chat ID or public channel username." error={feedback?.fieldErrors?.chatId}>
					{#snippet children({ describedBy, invalid })}<input id="venue-chat-id" name="chatId" bind:value={chatId} placeholder="123456789 or @channel" aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
				</FormField>
				<div class="field-grid">
					<FormField label="latitude" inputId="venue-latitude" meta="Float · required" help="Decimal degrees from -90 to 90." error={feedback?.fieldErrors?.latitude}>
						{#snippet children({ describedBy, invalid })}<input id="venue-latitude" name="latitude" type="number" min="-90" max="90" step="any" bind:value={latitude} placeholder="-23.5614" aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
					</FormField>
					<FormField label="longitude" inputId="venue-longitude" meta="Float · required" help="Decimal degrees from -180 to 180." error={feedback?.fieldErrors?.longitude}>
						{#snippet children({ describedBy, invalid })}<input id="venue-longitude" name="longitude" type="number" min="-180" max="180" step="any" bind:value={longitude} placeholder="-46.6559" aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
					</FormField>
				</div>
				<div class="field-grid">
					<FormField label="title" inputId="venue-title" meta="String · required" help="Name shown for the venue." error={feedback?.fieldErrors?.title}>
						{#snippet children({ describedBy, invalid })}<input id="venue-title" name="title" bind:value={title} placeholder="Museum of Art" aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
					</FormField>
					<FormField label="address" inputId="venue-address" meta="String · required" help="Street address shown below the venue." error={feedback?.fieldErrors?.address}>
						{#snippet children({ describedBy, invalid })}<input id="venue-address" name="address" bind:value={address} placeholder="Av. Paulista, 1578" aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
					</FormField>
				</div>
				<section class="provider-fields" aria-labelledby="venue-provider-title">
					<div><h3 id="venue-provider-title">Place providers</h3><p>Optional identifiers and category types from Foursquare or Google Places.</p></div>
					<div class="field-grid">
						<FormField label="foursquare_id" inputId="venue-foursquare-id" meta="String · optional" help="Foursquare place identifier." error={feedback?.fieldErrors?.foursquareId}>
							{#snippet children({ describedBy, invalid })}<input id="venue-foursquare-id" name="foursquareId" bind:value={foursquareId} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
						</FormField>
						<FormField label="foursquare_type" inputId="venue-foursquare-type" meta="String · optional" help="For example, food/coffee." error={feedback?.fieldErrors?.foursquareType}>
							{#snippet children({ describedBy, invalid })}<input id="venue-foursquare-type" name="foursquareType" bind:value={foursquareType} placeholder="food/coffee" aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
						</FormField>
						<FormField label="google_place_id" inputId="venue-google-id" meta="String · optional" help="Google Places identifier." error={feedback?.fieldErrors?.googlePlaceId}>
							{#snippet children({ describedBy, invalid })}<input id="venue-google-id" name="googlePlaceId" bind:value={googlePlaceId} aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
						</FormField>
						<FormField label="google_place_type" inputId="venue-google-type" meta="String · optional" help="A supported Google Places type." error={feedback?.fieldErrors?.googlePlaceType}>
							{#snippet children({ describedBy, invalid })}<input id="venue-google-type" name="googlePlaceType" bind:value={googlePlaceType} placeholder="museum" aria-describedby={describedBy} aria-invalid={invalid} />{/snippet}
						</FormField>
					</div>
				</section>
				<ReplyMarkupEditor bind:value={replyMarkup} errors={feedback?.replyMarkupErrors} idPrefix="send-venue-reply" />
				<PayloadPreview titleId="send-venue-payload-title" payload={requestPayload} />
				<SubmitButton {pending} />
			</form>
		</RequestPanel>
	{/snippet}
	{#snippet response()}
		<ResponsePanel titleId="send-venue-response-title" status={feedback?.response ? (feedback.success ? 'success' : 'error') : undefined} rawResponse={feedback?.response}>
			{#if feedback?.success && sentMessage}<Notice kind="success" title="Venue sent"><p>Message <code>#{sentMessage.message_id}</code> sent to chat <code>{sentMessage.chat.id}</code>.</p></Notice>
			{:else if feedback?.error}<Notice kind="error" title="Request failed"><p>{feedback.error}</p></Notice>
			{:else}<EmptyResponse />{/if}
		</ResponsePanel>
	{/snippet}
</MethodLayout>

<style>
	form, .provider-fields { display: grid; gap: 1.15rem; }
	.field-grid { display: grid; gap: 1.15rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.provider-fields { border: 1px solid var(--border); border-radius: 0.45rem; padding: 1rem; }
	.provider-fields h3, .provider-fields p { margin: 0; }
	.provider-fields h3 { font-size: 0.82rem; }
	.provider-fields p { color: var(--text-muted); font-size: 0.72rem; margin-top: 0.25rem; }
	input { width: 100%; border: 1px solid var(--border-strong); border-radius: 0.4rem; background: var(--surface); padding: 0.7rem 0.75rem; color: var(--text); font: inherit; font-size: 0.78rem; }
	input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(22, 138, 192, 0.1); outline: none; }
	input[aria-invalid='true'] { border-color: #d46a74; }
	@media (max-width: 620px) { .field-grid { grid-template-columns: 1fr; } }
</style>
