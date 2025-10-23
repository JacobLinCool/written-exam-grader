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
		GradingQueue,
		GradingResultsView
	} from '$lib/components';
	import type { GradingJob } from '$lib/components/GradingQueue.svelte';
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

	// Grading queue
	let gradingJobs = $state<GradingJob[]>([]);

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
		// Don't stop camera - allow continuous capture for multi-page answer sheets
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

		// Create a grading job
		const jobId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const job: GradingJob = {
			id: jobId,
			studentId: studentId.trim(),
			images: [...capturedImages],
			status: 'pending',
			timestamp: Date.now()
		};

		// Add job to queue
		gradingJobs = [...gradingJobs, job];

		// Reset for next student (non-blocking)
		const currentStudentId = studentId.trim();
		const currentImages = [...capturedImages];
		studentId = '';
		capturedImages = [];
		error = null;
		showCamera = false;
		stopCamera();
		currentStep = 'student'; // Go back to student input immediately

		// Start grading in background
		gradeJob(jobId, currentStudentId, currentImages);
	}

	function retryJob(job: GradingJob) {
		// Reset job status and clear error
		const jobIndex = gradingJobs.findIndex((j) => j.id === job.id);
		if (jobIndex === -1) return;

		gradingJobs[jobIndex].status = 'pending';
		gradingJobs[jobIndex].error = undefined;
		gradingJobs = [...gradingJobs];

		// Retry grading
		gradeJob(job.id, job.studentId, job.images);
	}

	async function gradeJob(jobId: string, studentIdValue: string, images: string[]) {
		// Update job status
		const jobIndex = gradingJobs.findIndex((j) => j.id === jobId);
		if (jobIndex === -1) return;

		gradingJobs[jobIndex].status = 'grading';
		gradingJobs = [...gradingJobs];

		try {
			// Remove data URL prefix if present from question sheet
			const questionSheetBase64 = questionSheet!.replace(/^data:application\/pdf;base64,/, '');

			// Remove data URL prefix if present from all images
			const imagesBase64 = images.map((image: string) =>
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
						questionSheet: questionSheet!,
						images: images,
						proMode,
						numRuns
					})
				});

				if (!response.ok) {
					throw new Error('Failed to grade answer sheet');
				}

				data = await response.json();
			}

			const result: GradingResult = {
				...data.result,
				studentId: studentIdValue,
				confidences: data.confidences,
				runs: data.runs,
				allResults: data.results
			};

			// Calculate pricing from usage metadata
			let pricing: PricingInfo | null = null;
			try {
				const pricingCalc = calculatePricing(data.usage);
				const ceilToFirst = (n: number) => Math.ceil(n * 10) / 10;
				const inputCost = ceilToFirst(pricingCalc.inputCost) + ceilToFirst(pricingCalc.cachedCost);
				const outputCost = ceilToFirst(pricingCalc.outputCost);
				const totalCost = inputCost + outputCost;
				pricing = {
					totalCost,
					inputCost,
					outputCost
				};
			} catch (err) {
				console.error('Failed to calculate pricing', err);
			}

			// Update job with result
			const updatedJobIndex = gradingJobs.findIndex((j) => j.id === jobId);
			if (updatedJobIndex !== -1) {
				gradingJobs[updatedJobIndex].status = 'completed';
				gradingJobs[updatedJobIndex].result = result;
				gradingJobs[updatedJobIndex].pricing = pricing;
				gradingJobs = [...gradingJobs];
			}

			// Save result to session
			allResults = [
				...allResults,
				{
					...data.result,
					studentId: studentIdValue,
					timestamp: new Date().toISOString(),
					pricing
				}
			];
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'An error occurred while grading';
			console.error(err);

			// Update job with error
			const updatedJobIndex = gradingJobs.findIndex((j) => j.id === jobId);
			if (updatedJobIndex !== -1) {
				gradingJobs[updatedJobIndex].status = 'error';
				gradingJobs[updatedJobIndex].error = errorMessage;
				gradingJobs = [...gradingJobs];
			}
		}
	}

	function viewJobResult(job: GradingJob) {
		if (job.result) {
			gradingResult = job.result;
			lastPricing = job.pricing || null;
			currentStep = 'result';
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

		<!-- Grading Queue Status -->
		<GradingQueue jobs={gradingJobs} onViewResult={viewJobResult} onRetry={retryJob} />

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
			<div class="mt-4 rounded-lg border border-gray-200 bg-white p-3 text-center">
				<div class="text-sm text-gray-600">Grading with:</div>
				<div class="mt-1">
					{#if useClientMode}
						<span class="inline-flex items-center gap-1 text-base font-medium text-green-700">
							<Key class="h-4 w-4" /> BYOK
						</span>
					{:else}
						<span class="inline-flex items-center gap-1 text-base font-medium text-blue-700">
							<Cloud class="h-4 w-4" /> Managed
						</span>
					{/if}
				</div>
			</div>
		{:else if currentStep === 'result' && gradingResult}
			<GradingResultsView {gradingResult} pricing={lastPricing} onNext={resetToStudentInput} />
		{/if}
	</div>
</div>
