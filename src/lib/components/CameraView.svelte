<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { Camera } from '@lucide/svelte';

	type Props = {
		videoElement: HTMLVideoElement | undefined;
		onCapture: () => void;
		onCancel: () => void;
	};

	let { videoElement = $bindable(), onCapture, onCancel }: Props = $props();
</script>

<div class="space-y-4">
	<video
		bind:this={videoElement}
		autoplay
		playsinline
		class="w-full rounded-lg border-2 border-gray-300"
	>
		<track kind="captions" />
	</video>
	<div class="flex gap-2">
		<Button class="flex-1" onclick={onCapture}>
			<Camera class="mr-2 h-4 w-4" />
			Capture Photo
		</Button>
		<Button color="light" onclick={onCancel}>Cancel</Button>
	</div>
</div>
