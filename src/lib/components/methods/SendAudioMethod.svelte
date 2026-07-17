<script lang="ts">
	import AudioAnimationMethod from './AudioAnimationMethod.svelte';
	import type { MethodComponentProps } from '$lib/playground/types';
	let props: MethodComponentProps = $props();
</script>

<AudioAnimationMethod
	{...props}
	action="sendAudio"
	title="Audio"
	description="Send an MP3 or M4A track with music-player metadata."
	mediaName="audio"
	accept="audio/mpeg,audio/mp4,.mp3,.m4a"
	documentationUrl="https://core.telegram.org/bots/api#sendaudio"
/>
