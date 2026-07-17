<script lang="ts">
	import AudioAnimationMethod from './AudioAnimationMethod.svelte';
	import type { MethodComponentProps } from '$lib/playground/types';
	let props: MethodComponentProps = $props();
</script>

<AudioAnimationMethod
	{...props}
	action="sendAnimation"
	title="Animation"
	description="Send a GIF or silent H.264/MPEG-4 animation."
	mediaName="animation"
	accept="image/gif,video/mp4,.gif,.mp4"
	documentationUrl="https://core.telegram.org/bots/api#sendanimation"
/>
