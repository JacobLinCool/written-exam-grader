<script lang="ts">
	import { Button, Card, Alert, Heading, P, Spinner } from 'flowbite-svelte';
	import { Camera, ArrowLeft, FolderOpen, Check } from '@lucide/svelte';
	import ImageGallery from './ImageGallery.svelte';
	import CameraView from './CameraView.svelte';

	type Props = {
		studentId: string;
		capturedImages: string[];
		showCamera: boolean;
		isGrading: boolean;
		error: string | null;
		videoElement: HTMLVideoElement | undefined;
		canvasElement: HTMLCanvasElement | undefined;
		answerSheetFileInput: HTMLInputElement | undefined;
		onBack: () => void;
		onStartCamera: () => void;
		onStopCamera: () => void;
		onCapturePhoto: () => void;
		onFileSelect: (event: Event) => void;
		onRemoveImage: (index: number) => void;
		onClearAll: () => void;
		onGrade: () => void;
	};

	let {
		studentId,
		capturedImages,
		showCamera,
		isGrading,
		error,
		videoElement = $bindable(),
		canvasElement = $bindable(),
		answerSheetFileInput = $bindable(),
		onBack,
		onStartCamera,
		onStopCamera,
		onCapturePhoto,
		onFileSelect,
		onRemoveImage,
		onClearAll,
		onGrade
	}: Props = $props();
</script>

<Card size="xl" class="p-4">
	<div class="mb-4 flex items-center justify-between">
		<Heading tag="h2">Step 3: Capture Answer Sheet</Heading>
		<Button color="light" onclick={onBack}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back
		</Button>
	</div>

	<Alert color="blue" class="mb-4">
		<span class="font-semibold">Student:</span>
		<span class="ml-2">{studentId}</span>
	</Alert>

	{#if showCamera}
		<CameraView bind:videoElement onCapture={onCapturePhoto} onCancel={onStopCamera} />
	{:else}
		<div class="space-y-4">
			<P class="text-gray-600">
				{capturedImages.length === 0
					? "Take photos of the student's answer sheet"
					: 'Add more images or submit for grading'}
			</P>
			<Button size="xl" class="w-full" onclick={onStartCamera}>
				<Camera class="mr-2 h-5 w-5" />
				{capturedImages.length === 0 ? 'Open Camera' : 'Add Photo'}
			</Button>
			<div class="text-center text-gray-500">or</div>
			<input
				bind:this={answerSheetFileInput}
				type="file"
				accept="image/*"
				multiple
				onchange={onFileSelect}
				class="hidden"
			/>
			<Button size="xl" color="light" class="w-full" onclick={() => answerSheetFileInput?.click()}>
				<FolderOpen class="mr-2 h-5 w-5" />
				{capturedImages.length === 0 ? 'Upload Images' : 'Add More Images'}
			</Button>

			{#if capturedImages.length > 0}
				<div class="pt-2">
					{#if error}
						<Alert color="red" class="mb-4">
							<span class="font-semibold">Error:</span>
							<span class="ml-2">{error}</span>
						</Alert>
					{/if}

					<Button size="xl" color="green" class="w-full" onclick={onGrade} disabled={isGrading}>
						{#if isGrading}
							<Spinner class="mr-2" size="4" />
							Grading...
						{:else}
							<Check class="mr-2 h-5 w-5" />
							Grade Answer Sheet
						{/if}
					</Button>
				</div>
			{/if}
		</div>
	{/if}

	<ImageGallery images={capturedImages} onRemove={onRemoveImage} {onClearAll} />

	<canvas bind:this={canvasElement} class="hidden"></canvas>
</Card>
