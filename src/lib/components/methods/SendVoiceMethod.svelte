<script lang="ts">
	import MediaMethod from './MediaMethod.svelte';
	import type { MethodComponentProps } from '$lib/playground/types';

	let props: MethodComponentProps = $props();
</script>

<MediaMethod
	{...props}
	action="sendVoice"
	title="Voice note"
	description="Send a voice note from a local file, HTTP URL, or Telegram file ID."
	mediaName="voice"
	accept="audio/ogg,audio/mpeg,audio/mp4"
	maxBytes={50 * 1024 * 1024}
	showDuration
	documentationUrl="https://core.telegram.org/bots/api#sendvoice"
/>
