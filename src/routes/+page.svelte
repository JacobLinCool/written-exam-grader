<script lang="ts">
	import type { GradingResponse } from '$lib/server/grading';
	import { calculatePricing } from '$lib/pricing';
	import { onMount } from 'svelte';

	type QuestionResult = {
		questionNumber: number;
		isCorrect: boolean;
		explanation: string;
		studentAnswer: string;
		correctAnswer: string;
		maxScore: number;
		earnedScore: number;
	};

	type GradingResult = {
		results: QuestionResult[];
		totalScore: number;
		maxPossibleScore: number;
		comments: string;
		studentId: string;
	};

	type SessionResult = GradingResult & {
		timestamp: string;
		pricing?: {
			totalCost: number;
			inputCost: number;
			outputCost: number;
		} | null;
	};

	// Step tracking
	let currentStep = $state<'upload' | 'student' | 'capture' | 'result'>('upload');

	// Question sheet
	let questionSheet = $state<string | null>(null);
	let questionSheetFile = $state<File | null>(null);

	// Student info
	let studentId = $state<string>('');

	// Answer sheet images
	let capturedImages = $state<string[]>([]);

	// Grading
	let isGrading = $state(false);
	let gradingResult = $state<GradingResult | null>(null);
	// Pricing (last grading call)
	let lastPricing = $state<{
		totalCost: number;
		inputCost: number;
		outputCost: number;
	} | null>(null);
	let error = $state<string | null>(null);

	// All session results
	let allResults = $state<SessionResult[]>([]);

	// Camera
	let videoStream = $state<MediaStream | null>(null);
	let showCamera = $state(false);

	let videoElement = $state<HTMLVideoElement>();
	let canvasElement = $state<HTMLCanvasElement>();
	let answerSheetFileInput = $state<HTMLInputElement>();
	let questionSheetFileInput = $state<HTMLInputElement>();

	function handleQuestionSheetUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (file.type !== 'application/pdf') {
			error = 'Please upload a PDF file';
			return;
		}

		questionSheetFile = file;
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
		questionSheetFile = null;
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

		isGrading = true;
		error = null;
		gradingResult = null;

		try {
			const response = await fetch('/api/grade', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					questionSheet,
					studentId: studentId.trim(),
					images: capturedImages
				})
			});

			const data = (await response.json()) as GradingResponse;

			if (!response.ok) {
				throw new Error('Failed to grade answer sheet');
			}

			gradingResult = { ...data.result, studentId: studentId.trim() };

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
		<div class="mb-8">
			<h1 class="text-center text-3xl font-bold text-blue-900">Written Exam Grader</h1>
			{#if allResults.length > 0}
				<div class="mt-4 flex items-center justify-center gap-4">
					<span class="text-gray-600">Graded: {allResults.length} student(s)</span>
					<button
						onclick={downloadResults}
						class="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
					>
						📥 Download All Results
					</button>
					<button
						onclick={resetAll}
						class="rounded bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
					>
						🔄 Start New Session
					</button>
				</div>
			{/if}
		</div>

		{#if currentStep === 'upload'}
			<!-- Step 1: Upload Question Sheet -->
			<div class="rounded-lg bg-white p-6 shadow-lg">
				<h2 class="mb-4 text-xl font-semibold text-gray-800">Step 1: Upload Question Sheet</h2>
				<p class="mb-4 text-gray-600">Upload a PDF containing the questions and correct answers.</p>

				{#if error}
					<div class="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
						<p class="font-semibold">Error:</p>
						<p>{error}</p>
					</div>
				{/if}

				<input
					bind:this={questionSheetFileInput}
					type="file"
					accept="application/pdf"
					onchange={handleQuestionSheetUpload}
					class="hidden"
				/>
				<button
					onclick={() => questionSheetFileInput?.click()}
					class="w-full rounded-lg bg-blue-600 py-4 text-lg font-semibold text-white hover:bg-blue-700 active:scale-95"
				>
					📄 Upload Question Sheet (PDF)
				</button>
			</div>
		{:else if currentStep === 'student'}
			<!-- Step 2: Enter Student ID -->
			<div class="rounded-lg bg-white p-6 shadow-lg">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-800">Step 2: Enter Student Information</h2>
					{#if allResults.length === 0}
						<button
							onclick={resetAll}
							class="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
						>
							Back
						</button>
					{/if}
				</div>

				{#if error}
					<div class="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
						<p class="font-semibold">Error:</p>
						<p>{error}</p>
					</div>
				{/if}

				<div class="space-y-4">
					<div>
						<label for="studentId" class="mb-2 block font-semibold text-gray-700">
							Student ID or Name
						</label>
						<input
							id="studentId"
							type="text"
							bind:value={studentId}
							placeholder="Enter student ID or name"
							class="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
							onkeydown={(e) => e.key === 'Enter' && startGrading()}
						/>
					</div>

					<button
						onclick={startGrading}
						class="w-full rounded-lg bg-blue-600 py-4 text-lg font-semibold text-white hover:bg-blue-700 active:scale-95"
					>
						Continue →
					</button>
				</div>
			</div>
		{:else if currentStep === 'capture'}
			<!-- Step 3: Capture Answer Sheet -->
			<div class="rounded-lg bg-white p-6 shadow-lg">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-800">Step 3: Capture Answer Sheet</h2>
					<button
						onclick={resetToStudentInput}
						class="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
					>
						Back
					</button>
				</div>

				<div class="mb-4 rounded-lg bg-blue-50 p-3">
					<p class="text-sm text-gray-700">
						<span class="font-semibold">Student:</span>
						{studentId}
					</p>
				</div>

				<!-- Display captured images -->
				{#if capturedImages.length > 0}
					<div class="mb-4">
						<div class="mb-2 flex items-center justify-between">
							<h3 class="font-semibold text-gray-800">
								Captured Images ({capturedImages.length})
							</h3>
							<button onclick={retakePhotos} class="text-sm text-red-600 hover:text-red-800">
								Clear All
							</button>
						</div>
						<div class="grid grid-cols-2 gap-2">
							{#each capturedImages as image, index}
								<div class="relative">
									<img
										src={image}
										alt="Answer sheet {index + 1}"
										class="w-full rounded-lg border-2 border-gray-300"
									/>
									<button
										onclick={() => removeImage(index)}
										class="absolute top-1 right-1 rounded-full bg-red-600 p-1 text-white hover:bg-red-700"
										aria-label="Remove image {index + 1}"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fill-rule="evenodd"
												d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
												clip-rule="evenodd"
											/>
										</svg>
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if showCamera}
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
							<button
								onclick={capturePhoto}
								class="flex-1 rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 active:scale-95"
							>
								📸 Capture Photo
							</button>
							<button
								onclick={stopCamera}
								class="rounded-lg bg-gray-200 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-300"
							>
								Cancel
							</button>
						</div>
					</div>
				{:else}
					<div class="space-y-4">
						<p class="text-gray-600">
							{capturedImages.length === 0
								? "Take photos of the student's answer sheet"
								: 'Add more images or submit for grading'}
						</p>
						<button
							onclick={startCamera}
							class="w-full rounded-lg bg-blue-600 py-4 text-lg font-semibold text-white hover:bg-blue-700 active:scale-95"
						>
							📷 {capturedImages.length === 0 ? 'Open Camera' : 'Add Photo'}
						</button>
						<div class="text-center text-gray-500">or</div>
						<input
							bind:this={answerSheetFileInput}
							type="file"
							accept="image/*"
							multiple
							onchange={handleAnswerSheetFileSelect}
							class="hidden"
						/>
						<button
							onclick={() => answerSheetFileInput?.click()}
							class="w-full rounded-lg border-2 border-blue-600 bg-white py-4 text-lg font-semibold text-blue-600 hover:bg-blue-50 active:scale-95"
						>
							📁 {capturedImages.length === 0 ? 'Upload Images' : 'Add More Images'}
						</button>

						{#if capturedImages.length > 0}
							<div class="pt-2">
								{#if error}
									<div class="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
										<p class="font-semibold">Error:</p>
										<p>{error}</p>
									</div>
								{/if}

								<button
									onclick={gradeAnswerSheet}
									disabled={isGrading}
									class="w-full rounded-lg bg-green-600 py-4 text-lg font-semibold text-white hover:bg-green-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isGrading ? '⏳ Grading...' : '✓ Grade Answer Sheet'}
								</button>
							</div>
						{/if}
					</div>
				{/if}

				<canvas bind:this={canvasElement} class="hidden"></canvas>
			</div>
		{:else if currentStep === 'result' && gradingResult}
			<!-- Step 4: Show Results -->
			<div class="space-y-4">
				<div class="rounded-lg bg-white p-6 shadow-lg">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-2xl font-bold text-gray-800">Grading Results</h2>
						<button
							onclick={resetToStudentInput}
							class="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
						>
							Grade Next Student
						</button>
					</div>

					<div class="mb-6 rounded-lg bg-blue-50 p-3">
						<p class="text-sm text-gray-700">
							<span class="font-semibold">Student:</span>
							{gradingResult.studentId}
						</p>
					</div>

					<div
						class="mb-6 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-center text-white"
					>
						<div class="text-5xl font-bold">
							{gradingResult.totalScore} / {gradingResult.maxPossibleScore}
						</div>
						<div class="mt-2 text-lg">
							{Math.round((gradingResult.totalScore / gradingResult.maxPossibleScore) * 100)}%
						</div>
					</div>

					{#if lastPricing}
						<div class="mb-4 rounded-lg bg-white p-4 shadow-sm">
							<h4 class="mb-2 text-sm font-semibold text-gray-800">Estimated Pricing</h4>
							<div class="flex items-center gap-4 text-sm text-gray-700">
								<span>Input: USD {lastPricing.inputCost.toFixed(1)}</span>
								<span>Output: USD {lastPricing.outputCost.toFixed(1)}</span>
								<span class="ml-auto font-bold">Total: USD {lastPricing.totalCost.toFixed(1)}</span>
							</div>
						</div>
					{/if}

					<div class="mb-6 rounded-lg bg-blue-50 p-4">
						<h3 class="mb-2 font-semibold text-gray-800">Overall Comments:</h3>
						<p class="text-gray-700">{gradingResult.comments}</p>
					</div>

					<h3 class="mb-3 text-lg font-semibold text-gray-800">Question-by-Question Results:</h3>
					<div class="space-y-4">
						{#each gradingResult.results as result}
							<div
								class="rounded-lg border-2 p-4 {result.isCorrect
									? 'border-green-300 bg-green-50'
									: 'border-red-300 bg-red-50'}"
							>
								<div class="mb-2 flex items-center justify-between">
									<h4 class="text-lg font-bold text-gray-800">
										Question {result.questionNumber}
									</h4>
									<div class="flex items-center gap-3">
										<span
											class="rounded-full bg-blue-200 px-3 py-1 text-sm font-semibold text-blue-800"
										>
											{result.earnedScore} / {result.maxScore} pts
										</span>
										<span
											class="rounded-full px-3 py-1 text-sm font-semibold {result.isCorrect
												? 'bg-green-200 text-green-800'
												: 'bg-red-200 text-red-800'}"
										>
											{result.isCorrect ? '✓ Correct' : '✗ Incorrect'}
										</span>
									</div>
								</div>

								<div class="space-y-2 text-sm">
									<div>
										<span class="font-semibold text-gray-700">Student's Answer:</span>
										<p class="text-gray-600">{result.studentAnswer}</p>
									</div>
									<div>
										<span class="font-semibold text-gray-700">Correct Answer:</span>
										<p class="text-gray-600">{result.correctAnswer}</p>
									</div>
									<div>
										<span class="font-semibold text-gray-700">Explanation:</span>
										<p class="text-gray-600">{result.explanation}</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
