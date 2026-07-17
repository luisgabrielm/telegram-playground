<script lang="ts">
	import VideoMediaMethod from './VideoMediaMethod.svelte';
	import type { MethodComponentProps } from '$lib/playground/types';

	let props: MethodComponentProps = $props();
</script>

<VideoMediaMethod {...props} kind="videoNote" />
