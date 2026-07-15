<script lang="ts">
	import MediaMethod from './MediaMethod.svelte';
	import type { MethodComponentProps } from '$lib/playground/types';

	let props: MethodComponentProps = $props();
</script>

<MediaMethod
	{...props}
	action="sendPhoto"
	title="Photo"
	description="Send a photo from a local file, HTTP URL, or Telegram file ID."
	mediaName="photo"
	accept="image/*"
	maxBytes={10 * 1024 * 1024}
	showSpoiler
	documentationUrl="https://core.telegram.org/bots/api#sendphoto"
/>
