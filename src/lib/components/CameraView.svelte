<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { Camera, X } from '@lucide/svelte';

	type Props = {
		videoElement: HTMLVideoElement | undefined;
		capturedCount?: number;
		onCapture: () => void;
		onCancel: () => void;
	};

	let { videoElement = $bindable(), capturedCount = 0, onCapture, onCancel }: Props = $props();
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
	{#if capturedCount > 0}
		<div class="text-center text-sm font-medium text-gray-700">
			{capturedCount}
			{capturedCount === 1 ? 'photo' : 'photos'} captured
		</div>
	{/if}
	<div class="flex gap-2">
		<Button class="flex-1" onclick={onCapture}>
			<Camera class="mr-2 h-4 w-4" />
			Capture Photo
		</Button>
		<Button color="light" onclick={onCancel}>
			<X class="mr-2 h-4 w-4" />
			Done
		</Button>
	</div>
</div>
