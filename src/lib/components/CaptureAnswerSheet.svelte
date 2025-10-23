<script lang="ts">
	import { Button, Card, Alert, Heading, P, Toggle, Label } from 'flowbite-svelte';
	import { Camera, ArrowLeft, FolderOpen, Check, Sparkles } from '@lucide/svelte';
	import ImageGallery from './ImageGallery.svelte';
	import CameraView from './CameraView.svelte';

	type Props = {
		studentId: string;
		capturedImages: string[];
		showCamera: boolean;
		error: string | null;
		proMode: boolean;
		numRuns: number;
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
		onProModeChange: (value: boolean) => void;
		onNumRunsChange: (value: number) => void;
	};

	let {
		studentId,
		capturedImages,
		showCamera,
		error,
		proMode,
		numRuns,
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
		onGrade,
		onProModeChange,
		onNumRunsChange
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
		<CameraView
			bind:videoElement
			capturedCount={capturedImages.length}
			onCapture={onCapturePhoto}
			onCancel={onStopCamera}
		/>
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

					<!-- Pro Mode Toggle -->
					<Card
						size="xl"
						class="mb-4 bg-gradient-to-r from-purple-50 to-blue-50 p-4 dark:from-purple-900/20 dark:to-blue-900/20"
					>
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<Sparkles class="h-5 w-5 text-purple-600" />
									<Label class="text-base font-semibold">Pro Mode</Label>
								</div>
								<Toggle
									checked={proMode}
									onchange={(e) => onProModeChange(e.currentTarget.checked)}
								/>
							</div>
							<P class="text-sm text-gray-600 dark:text-gray-400">
								{#if proMode}
									Enabled: Runs grading multiple times and uses majority voting for higher accuracy.
								{:else}
									Disabled: Single-pass grading for faster results.
								{/if}
							</P>
							<!-- {#if proMode}
								<div class="flex items-center gap-3">
									<Label for="numRuns" class="text-sm whitespace-nowrap">Number of runs:</Label>
									<input
										id="numRuns"
										type="number"
										min="2"
										max="10"
										value={numRuns}
										oninput={(e) => onNumRunsChange(parseInt(e.currentTarget.value))}
										class="w-20 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
									/>
									<span class="text-xs text-gray-500">Cost: ~{numRuns}x base cost</span>
								</div>
							{/if} -->
						</div>
					</Card>

					<Button size="xl" color="green" class="w-full" onclick={onGrade}>
						<Check class="mr-2 h-5 w-5" />
						Grade Answer Sheet
					</Button>
				</div>
			{/if}
		</div>
	{/if}

	<ImageGallery images={capturedImages} onRemove={onRemoveImage} {onClearAll} />

	<canvas bind:this={canvasElement} class="hidden"></canvas>
</Card>
