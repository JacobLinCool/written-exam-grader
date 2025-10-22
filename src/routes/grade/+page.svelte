<script lang="ts">
	import type { GradingResult, SessionResult, PricingInfo } from '$lib/types';
	import { calculatePricing } from '$lib/pricing';
	import { ClientGrader } from '$lib/client-grader.svelte';
	import { onMount } from 'svelte';
	import {
		ApiKeyManager,
		AppHeader,
		UploadQuestionSheet,
		StudentInfoStep,
		CaptureAnswerSheet,
		GradingResultsView
	} from '$lib/components';
	import { Key, Cloud } from '@lucide/svelte';

	// Step tracking
	let currentStep = $state<'upload' | 'student' | 'capture' | 'result'>('upload');

	// BYOK mode
	let clientGrader = $state<ClientGrader>(new ClientGrader());
	let useClientMode = $state<boolean>(true);

	// Question sheet
	let questionSheet = $state<string | null>(null);

	// Student info
	let studentId = $state<string>('');

	// Pro mode (multipass grading)
	let proMode = $state<boolean>(false);
	let numRuns = $state<number>(5);

	// Answer sheet images
	let capturedImages = $state<string[]>([]);

	// Grading
	let isGrading = $state(false);
	let gradingResult = $state<GradingResult | null>(null);
	let lastPricing = $state<PricingInfo | null>(null);
	let error = $state<string | null>(null);

	// All session results
	let allResults = $state<SessionResult[]>([]);

	// Camera
	let videoStream = $state<MediaStream | null>(null);
	let showCamera = $state(false);

	let videoElement = $state<HTMLVideoElement>();
	let canvasElement = $state<HTMLCanvasElement>();
	let answerSheetFileInput = $state<HTMLInputElement>();

	function handleQuestionSheetUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (file.type !== 'application/pdf') {
			error = 'Please upload a PDF file';
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			questionSheet = e.target?.result as string;
			currentStep = 'student';
			error = null;
		};
		reader.readAsDataURL(file);
	}

	function startGrading() {
		if (!studentId.trim()) {
			error = 'Please enter a student ID or name';
			return;
		}
		currentStep = 'capture';
		error = null;
	}

	function resetToStudentInput() {
		studentId = '';
		capturedImages = [];
		gradingResult = null;
		error = null;
		showCamera = false;
		stopCamera();
		currentStep = 'student';
	}

	function resetAll() {
		questionSheet = null;
		studentId = '';
		capturedImages = [];
		gradingResult = null;
		error = null;
		showCamera = false;
		stopCamera();
		currentStep = 'upload';
	}

	async function startCamera() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' }
			});
			videoStream = stream;
			showCamera = true;
			setTimeout(() => {
				if (videoElement) {
					videoElement.srcObject = stream;
				}
			}, 0);
		} catch (err) {
			error = 'Failed to access camera. Please check permissions.';
			console.error(err);
		}
	}

	function stopCamera() {
		if (videoStream) {
			videoStream.getTracks().forEach((track) => track.stop());
			videoStream = null;
		}
		showCamera = false;
	}

	function capturePhoto() {
		if (!videoElement || !canvasElement) return;

		const context = canvasElement.getContext('2d');
		if (!context) return;

		canvasElement.width = videoElement.videoWidth;
		canvasElement.height = videoElement.videoHeight;
		context.drawImage(videoElement, 0, 0);

		const imageData = canvasElement.toDataURL('image/jpeg', 0.9);
		capturedImages = [...capturedImages, imageData];
		stopCamera();
	}

	function handleAnswerSheetFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (!files || files.length === 0) return;

		Array.from(files).forEach((file) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const imageData = e.target?.result as string;
				capturedImages = [...capturedImages, imageData];
			};
			reader.readAsDataURL(file);
		});

		// Reset input value to allow selecting the same file again
		input.value = '';
	}

	function removeImage(index: number) {
		capturedImages = capturedImages.filter((_, i) => i !== index);
	}

	function retakePhotos() {
		capturedImages = [];
		gradingResult = null;
		error = null;
	}

	async function gradeAnswerSheet() {
		if (!questionSheet || capturedImages.length === 0 || !studentId.trim()) return;

		// Check if we should use client-side grading
		if (useClientMode && !clientGrader.maskedApiKey) {
			error = 'Please set your API key first to use BYOK mode';
			return;
		}

		isGrading = true;
		error = null;
		gradingResult = null;

		try {
			// Remove data URL prefix if present from question sheet
			const questionSheetBase64 = questionSheet.replace(/^data:application\/pdf;base64,/, '');

			// Remove data URL prefix if present from all images
			const imagesBase64 = capturedImages.map((image: string) =>
				image.replace(/^data:image\/\w+;base64,/, '')
			);

			let data: any;

			if (useClientMode) {
				// Client-side grading using user's API key
				const result = proMode
					? await clientGrader.gradeMultipass({
							questionSheetBase64,
							imagesBase64,
							numRuns,
							concurrency: 3
						})
					: await clientGrader.grade({
							questionSheetBase64,
							imagesBase64
						});

				data = {
					result: result.result,
					usage: result.usage,
					confidences: 'confidences' in result ? result.confidences : undefined,
					runs: 'runs' in result ? result.runs : undefined,
					results: 'results' in result ? result.results : undefined
				};
			} else {
				// Server-side grading
				const response = await fetch('/api/grade', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						questionSheet,
						images: capturedImages,
						proMode,
						numRuns
					})
				});

				if (!response.ok) {
					throw new Error('Failed to grade answer sheet');
				}

				data = await response.json();
			}

			gradingResult = {
				...data.result,
				studentId: studentId.trim(),
				confidences: data.confidences,
				runs: data.runs,
				allResults: data.results
			};

			// Calculate pricing from usage metadata and ceil to the first digit
			try {
				const pricing = calculatePricing(data.usage);
				const ceilToFirst = (n: number) => Math.ceil(n * 10) / 10;
				const inputCost = ceilToFirst(pricing.inputCost) + ceilToFirst(pricing.cachedCost);
				const outputCost = ceilToFirst(pricing.outputCost);
				const totalCost = inputCost + outputCost;
				lastPricing = {
					totalCost,
					inputCost,
					outputCost
				};
			} catch (err) {
				console.error('Failed to calculate pricing', err);
				lastPricing = null;
			}

			// Save result to session
			allResults = [
				...allResults,
				{
					...data.result,
					studentId: studentId.trim(),
					timestamp: new Date().toISOString(),
					pricing: lastPricing
				}
			];

			currentStep = 'result';
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred while grading';
			console.error(err);
		} finally {
			isGrading = false;
		}
	}

	function downloadResults() {
		const dataStr = JSON.stringify(allResults, null, 2);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `grading-results-${new Date().toISOString().split('T')[0]}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}

	onMount(() => {
		// Initialize client grader
		clientGrader = new ClientGrader();
		// Auto-enable client mode if API key is already set
		if (clientGrader.maskedApiKey) {
			useClientMode = true;
		}

		return () => {
			stopCamera();
		};
	});
</script>

<svelte:head>
	<title>Written Exam Grader</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
	<div class="mx-auto max-w-2xl">
		<AppHeader resultsCount={allResults.length} onDownload={downloadResults} onReset={resetAll} />

		<!-- API Key Manager -->
		<div class="mb-6">
			<ApiKeyManager
				hasKey={clientGrader.maskedApiKey !== null}
				maskedKey={clientGrader.maskedApiKey}
				onSetKey={(key) => {
					clientGrader.setApiKey(key);
					useClientMode = true;
				}}
				onClearKey={() => {
					clientGrader.clearApiKey();
					useClientMode = false;
				}}
			/>
		</div>

		{#if currentStep === 'upload'}
			<UploadQuestionSheet {error} onUpload={handleQuestionSheetUpload} />
		{:else if currentStep === 'student'}
			<StudentInfoStep
				{studentId}
				{error}
				showBackButton={allResults.length === 0}
				onBack={resetAll}
				onContinue={startGrading}
				onStudentIdChange={(value) => (studentId = value)}
			/>
		{:else if currentStep === 'capture'}
			<CaptureAnswerSheet
				{studentId}
				{capturedImages}
				{showCamera}
				{isGrading}
				{error}
				{proMode}
				{numRuns}
				bind:videoElement
				bind:canvasElement
				bind:answerSheetFileInput
				onBack={resetToStudentInput}
				onStartCamera={startCamera}
				onStopCamera={stopCamera}
				onCapturePhoto={capturePhoto}
				onFileSelect={handleAnswerSheetFileSelect}
				onRemoveImage={removeImage}
				onClearAll={retakePhotos}
				onGrade={gradeAnswerSheet}
				onProModeChange={(value) => (proMode = value)}
				onNumRunsChange={(value) => (numRuns = value)}
			/>

			<!-- Mode Indicator -->
			{#if capturedImages.length > 0}
				<div class="mt-4 flex items-center justify-center gap-2 text-sm">
					<span class="text-gray-600">Grading mode:</span>
					{#if useClientMode}
						<span class="rounded-full bg-green-100 px-3 py-1 font-medium text-green-700">
							<Key class="inline h-5 w-5" /> Client-side (BYOK)
						</span>
					{:else}
						<span class="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">
							<Cloud class="inline h-5 w-5" /> Server-side
						</span>
					{/if}
				</div>
			{/if}
		{:else if currentStep === 'result' && gradingResult}
			<GradingResultsView {gradingResult} pricing={lastPricing} onNext={resetToStudentInput} />
		{/if}
	</div>
</div>
