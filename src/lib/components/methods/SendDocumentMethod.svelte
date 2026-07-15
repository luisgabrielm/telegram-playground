<script lang="ts">
	import MediaMethod from './MediaMethod.svelte';
	import type { MethodComponentProps } from '$lib/playground/types';

	let props: MethodComponentProps = $props();
</script>

<MediaMethod
	{...props}
	action="sendDocument"
	title="Document"
	description="Send a file while preserving its filename and MIME type."
	mediaName="document"
	maxBytes={50 * 1024 * 1024}
	documentationUrl="https://core.telegram.org/bots/api#senddocument"
/>
