<script lang="ts">
	import { onMount } from 'svelte';
	import { Camera, Download, UserPlus, Trash2, Check, Video } from '@lucide/svelte';
	import { Button, Card, Badge, Select } from 'flowbite-svelte';
	import JSZip from 'jszip';

	interface StudentShots {
		studentNumber: number;
		images: string[]; // Base64 encoded images
	}

	let videoStream = $state<MediaStream | null>(null);
	let showCamera = $state(false);
	let videoElement = $state<HTMLVideoElement>();
	let canvasElement = $state<HTMLCanvasElement>();

	let students = $state<StudentShots[]>([]);
	let currentStudent = $state<StudentShots | null>(null);
	let studentCounter = $state(1);

	// Camera selection
	let availableCameras = $state<MediaDeviceInfo[]>([]);
	let selectedCameraId = $state<string>('');

	async function loadCameras() {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			availableCameras = devices.filter((device) => device.kind === 'videoinput');
			if (availableCameras.length > 0 && !selectedCameraId) {
				// Try to find rear camera first
				const rearCamera = availableCameras.find(
					(cam) =>
						cam.label.toLowerCase().includes('back') ||
						cam.label.toLowerCase().includes('rear') ||
						cam.label.toLowerCase().includes('environment')
				);
				selectedCameraId = rearCamera?.deviceId || availableCameras[0].deviceId;
			}
		} catch (err) {
			console.error('Error enumerating devices:', err);
		}
	}

	async function startCamera() {
		try {
			// Stop existing stream if any
			if (videoStream) {
				stopCamera();
			}

			const constraints: MediaStreamConstraints = {
				video: selectedCameraId
					? {
							deviceId: { exact: selectedCameraId },
							aspectRatio: { ideal: 9 / 16 }
						}
					: { facingMode: 'environment', aspectRatio: { ideal: 9 / 16 } }
			};

			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			videoStream = stream;
			showCamera = true;

			// Wait for video element to be ready
			setTimeout(() => {
				if (videoElement) {
					videoElement.srcObject = stream;
				}
			}, 0);
		} catch (err) {
			console.error('Error accessing camera:', err);
			alert('Failed to access camera. Please check permissions.');
		}
	}

	function stopCamera() {
		if (videoStream) {
			videoStream.getTracks().forEach((track) => track.stop());
			videoStream = null;
		}
		showCamera = false;
	}

	function startNewStudent() {
		if (currentStudent && currentStudent.images.length === 0) {
			alert('Please take at least one photo before starting a new student.');
			return;
		}

		if (currentStudent) {
			students = [...students, currentStudent];
		}

		currentStudent = {
			studentNumber: studentCounter,
			images: []
		};
		studentCounter++;
	}

	function capturePhoto() {
		if (!videoElement || !canvasElement) return;

		const context = canvasElement.getContext('2d');
		if (!context) return;

		canvasElement.width = videoElement.videoWidth;
		canvasElement.height = videoElement.videoHeight;
		context.drawImage(videoElement, 0, 0);

		const imageData = canvasElement.toDataURL('image/jpeg', 0.9);

		if (!currentStudent) {
			currentStudent = {
				studentNumber: studentCounter,
				images: [imageData]
			};
			studentCounter++;
		} else {
			currentStudent.images = [...currentStudent.images, imageData];
		}
	}

	function removeImage(studentIndex: number | null, imageIndex: number) {
		if (studentIndex === null && currentStudent) {
			currentStudent.images = currentStudent.images.filter((_, i) => i !== imageIndex);
		} else if (studentIndex !== null) {
			students[studentIndex].images = students[studentIndex].images.filter(
				(_, i) => i !== imageIndex
			);
			students = [...students];
		}
	}

	function removeStudent(index: number) {
		students = students.filter((_, i) => i !== index);
	}

	function base64ToBlob(base64: string): Blob {
		const parts = base64.split(';base64,');
		const contentType = parts[0].split(':')[1];
		const raw = window.atob(parts[1]);
		const rawLength = raw.length;
		const uInt8Array = new Uint8Array(rawLength);

		for (let i = 0; i < rawLength; ++i) {
			uInt8Array[i] = raw.charCodeAt(i);
		}

		return new Blob([uInt8Array], { type: contentType });
	}

	async function downloadAsZip() {
		if (students.length === 0 && (!currentStudent || currentStudent.images.length === 0)) {
			alert('No photos to download. Please capture some photos first.');
			return;
		}

		// Add current student if exists
		const allStudents = currentStudent ? [...students, currentStudent] : students;

		if (allStudents.length === 0) {
			alert('No photos to download.');
			return;
		}

		const zip = new JSZip();

		allStudents.forEach((student) => {
			const folderName = `student-${String(student.studentNumber).padStart(3, '0')}`;
			const folder = zip.folder(folderName);

			if (!folder) return;

			student.images.forEach((image, index) => {
				const blob = base64ToBlob(image);
				const fileName = `image-${index + 1}.jpg`;
				folder.file(fileName, blob);
			});
		});

		const content = await zip.generateAsync({ type: 'blob' });
		const url = URL.createObjectURL(content);
		const link = document.createElement('a');
		link.href = url;
		link.download = `answer-sheets-${new Date().toISOString().split('T')[0]}.zip`;
		link.click();
		URL.revokeObjectURL(url);
	}

	function completeSession() {
		if (currentStudent && currentStudent.images.length > 0) {
			students = [...students, currentStudent];
			currentStudent = null;
		}
		downloadAsZip();
	}

	onMount(() => {
		loadCameras();
		return () => {
			stopCamera();
		};
	});

	$effect(() => {
		if (videoElement && videoStream) {
			videoElement.srcObject = videoStream;
		}
	});
</script>

<svelte:head>
	<title>Take Shots - Written Exam Grader</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-primary-50 to-white p-4">
	<div class="mx-auto max-w-6xl">
		<!-- Header -->
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900">Take Answer Sheet Photos</h1>
			<p class="mt-2 text-gray-600">
				Capture student answer sheets and organize them automatically
			</p>
		</div>

		<!-- Summary Stats -->
		<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
			<Card class="p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-gray-600">Completed Students</p>
						<p class="text-2xl font-bold text-primary-600">{students.length}</p>
					</div>
					<Check class="h-8 w-8 text-primary-600" />
				</div>
			</Card>
			<Card class="p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-gray-600">Current Student</p>
						<p class="text-2xl font-bold text-secondary-600">
							{currentStudent ? `#${currentStudent.studentNumber}` : 'None'}
						</p>
					</div>
					<UserPlus class="h-8 w-8 text-secondary-600" />
				</div>
			</Card>
			<Card class="p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-gray-600">Current Photos</p>
						<p class="text-2xl font-bold text-purple-600">
							{currentStudent?.images.length || 0}
						</p>
					</div>
					<Camera class="h-8 w-8 text-purple-600" />
				</div>
			</Card>
		</div>

		<!-- Camera Section -->
		<Card class="mb-6 p-4">
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold">Camera</h2>
					<div class="flex gap-2">
						{#if !showCamera}
							<Button color="primary" onclick={startCamera}>
								<Camera class="mr-2 h-4 w-4" />
								Start Camera
							</Button>
						{:else}
							<Button color="red" onclick={stopCamera}>Stop Camera</Button>
						{/if}
					</div>
				</div>

				<!-- Camera Selection -->
				{#if availableCameras.length > 1}
					<div class="flex items-center gap-3">
						<Video class="h-5 w-5 text-gray-600" />
						<Select bind:value={selectedCameraId} class="flex-1" placeholder="Select camera">
							{#each availableCameras as camera}
								<option value={camera.deviceId}>
									{camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
								</option>
							{/each}
						</Select>
					</div>
				{/if}

				{#if showCamera}
					<div class="relative overflow-hidden rounded-lg bg-black">
						<!-- svelte-ignore a11y_media_has_caption -->
						<video
							bind:this={videoElement}
							autoplay
							playsinline
							class="w-full"
							style="max-height: 60vh;"
						></video>
					</div>

					<div class="flex gap-2">
						<Button color="primary" onclick={capturePhoto} class="flex-1">
							<Camera class="mr-2 h-4 w-4" />
							Capture Photo
						</Button>
						<Button color="secondary" onclick={startNewStudent}>
							<UserPlus class="mr-2 h-4 w-4" />
							Next Student
						</Button>
					</div>
				{/if}
			</div>
		</Card>

		<!-- Current Student Photos -->
		{#if currentStudent && currentStudent.images.length > 0}
			<Card class="mb-6 p-4">
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h2 class="text-xl font-semibold">
							Current Student #{currentStudent.studentNumber}
							<Badge color="primary" class="ml-2">{currentStudent.images.length} photos</Badge>
						</h2>
						<Button color="secondary" onclick={startNewStudent}>
							<UserPlus class="mr-2 h-4 w-4" />
							Finish & Next Student
						</Button>
					</div>

					<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
						{#each currentStudent.images as image, index}
							<div class="group relative overflow-hidden rounded-lg border border-gray-200">
								<img src={image} alt="Page {index + 1}" class="h-48 w-full object-cover" />
								<div class="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/50 p-2">
									<p class="text-xs text-white">Page {index + 1}</p>
								</div>
								<button
									onclick={() => removeImage(null, index)}
									class="absolute top-2 right-2 rounded-full bg-red-500 p-1 opacity-0 transition-opacity group-hover:opacity-100"
								>
									<Trash2 class="h-4 w-4 text-white" />
								</button>
							</div>
						{/each}
					</div>
				</div>
			</Card>
		{/if}

		<!-- Completed Students -->
		{#if students.length > 0}
			<Card class="mb-6 p-4">
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h2 class="text-xl font-semibold">Completed Students</h2>
						<div class="flex gap-2">
							<Button color="primary" onclick={downloadAsZip}>
								<Download class="mr-2 h-4 w-4" />
								Download ZIP
							</Button>
						</div>
					</div>

					<div class="space-y-4">
						{#each students as student, studentIndex}
							<Card class="mb-4 p-4">
								<div class="space-y-3">
									<div class="flex items-center justify-between">
										<h3 class="font-semibold">
											Student #{student.studentNumber}
											<Badge color="primary" class="ml-2">{student.images.length} photos</Badge>
										</h3>
										<Button color="red" size="xs" onclick={() => removeStudent(studentIndex)}>
											<Trash2 class="h-3 w-3" />
										</Button>
									</div>

									<div class="grid grid-cols-4 gap-2 md:grid-cols-6 lg:grid-cols-8">
										{#each student.images as image, imageIndex}
											<div class="group relative overflow-hidden rounded border border-gray-200">
												<img
													src={image}
													alt="Page {imageIndex + 1}"
													class="aspect-[3/4] w-full object-cover"
												/>
												<button
													onclick={() => removeImage(studentIndex, imageIndex)}
													class="absolute top-1 right-1 rounded-full bg-red-500 p-1 opacity-0 transition-opacity group-hover:opacity-100"
												>
													<Trash2 class="h-3 w-3 text-white" />
												</button>
											</div>
										{/each}
									</div>
								</div>
							</Card>
						{/each}
					</div>
				</div>
			</Card>
		{/if}

		<!-- Action Buttons -->
		{#if students.length > 0 || (currentStudent && currentStudent.images.length > 0)}
			<div class="flex justify-center gap-4">
				<Button color="primary" size="lg" onclick={completeSession}>
					<Download class="mr-2 h-5 w-5" />
					Complete & Download All
				</Button>
			</div>
		{/if}
	</div>

	<!-- Hidden canvas for photo capture -->
	<canvas bind:this={canvasElement} class="hidden"></canvas>
</div>
