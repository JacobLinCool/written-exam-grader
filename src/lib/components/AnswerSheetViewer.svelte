<script lang="ts">
	import { Card, Heading } from 'flowbite-svelte';
	import { onMount } from 'svelte';
	import type { QuestionResult } from '$lib/types';

	type Props = {
		images: string[];
		results: QuestionResult[];
		highlightedQuestion?: number;
	};

	let { images, results, highlightedQuestion = $bindable() }: Props = $props();
	let canvases: HTMLCanvasElement[] = [];
	let imageElements: HTMLImageElement[] = [];

	// Draw bounding boxes on canvas
	function drawBoundingBoxes(canvas: HTMLCanvasElement, img: HTMLImageElement, pageNumber: number) {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Set canvas size to match image
		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;

		// Draw the image
		ctx.drawImage(img, 0, 0);

		// Draw bounding boxes for this page
		const pageResults = results.filter((r) => r.position?.page === pageNumber);

		pageResults.forEach((result) => {
			if (!result.position) return;

			const [ymin, xmin, ymax, xmax] = result.position.box2d;
			const width = canvas.width;
			const height = canvas.height;

			// Convert normalized coordinates (0-1000) to pixel coordinates
			const x = (xmin / 1000) * width;
			const y = (ymin / 1000) * height;
			const w = ((xmax - xmin) / 1000) * width;
			const h = ((ymax - ymin) / 1000) * height;

			// Determine color based on correctness and highlight status
			const isHighlighted = highlightedQuestion === result.questionNumber;
			const strokeColor = isHighlighted
				? '#3b82f6' // blue for highlighted
				: result.isCorrect
					? '#22c55e' // green for correct
					: '#ef4444'; // red for incorrect

			const lineWidth = isHighlighted ? 4 : 2;
			const fillOpacity = isHighlighted ? 0.2 : 0.1;

			// Draw bounding box
			ctx.strokeStyle = strokeColor;
			ctx.lineWidth = lineWidth;
			ctx.strokeRect(x, y, w, h);

			// Fill with semi-transparent color
			ctx.fillStyle =
				strokeColor +
				Math.round(fillOpacity * 255)
					.toString(16)
					.padStart(2, '0');
			ctx.fillRect(x, y, w, h);

			// Draw question number label
			const labelPadding = 4;
			const fontSize = Math.max(16, Math.min(24, h / 4));
			ctx.font = `bold ${fontSize}px sans-serif`;
			const label = `Q${result.questionNumber}`;
			const textMetrics = ctx.measureText(label);
			const labelWidth = textMetrics.width + labelPadding * 2;
			const labelHeight = fontSize + labelPadding * 2;

			// Draw label background
			ctx.fillStyle = strokeColor;
			ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight);

			// Draw label text
			ctx.fillStyle = 'white';
			ctx.textBaseline = 'top';
			ctx.fillText(label, x + labelPadding, y - labelHeight + labelPadding);
		});
	}

	function redrawAllCanvases() {
		imageElements.forEach((img, index) => {
			if (img.complete && canvases[index]) {
				drawBoundingBoxes(canvases[index], img, index + 1);
			}
		});
	}

	// Redraw when highlighted question changes
	$effect(() => {
		highlightedQuestion;
		redrawAllCanvases();
	});

	onMount(() => {
		// Draw initial bounding boxes when images load
		imageElements.forEach((img, index) => {
			if (img.complete) {
				drawBoundingBoxes(canvases[index], img, index + 1);
			} else {
				img.onload = () => {
					drawBoundingBoxes(canvases[index], img, index + 1);
				};
			}
		});
	});
</script>

<Card size="xl" class="p-4">
	<Heading tag="h3" class="mb-4">Answer Sheets with Annotations</Heading>
	<div class="space-y-4">
		{#each images as image, index}
			<div class="relative">
				<div class="mb-2 text-sm font-semibold text-gray-700">Page {index + 1}</div>
				<div class="relative overflow-auto rounded-lg border border-gray-300 bg-gray-50">
					<img
						bind:this={imageElements[index]}
						src={image}
						alt="Answer Sheet Page {index + 1}"
						class="hidden"
					/>
					<canvas bind:this={canvases[index]} class="max-w-full"></canvas>
				</div>
			</div>
		{/each}
	</div>
	<div class="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-gray-700">
		<div class="font-semibold">Legend:</div>
		<div class="mt-2 flex flex-wrap gap-4">
			<div class="flex items-center gap-2">
				<div class="h-4 w-4 rounded border-2 border-green-500 bg-green-500/20"></div>
				<span>Correct Answer</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-4 w-4 rounded border-2 border-red-500 bg-red-500/20"></div>
				<span>Incorrect Answer</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-4 w-4 rounded border-4 border-blue-500 bg-blue-500/20"></div>
				<span>Highlighted Question</span>
			</div>
		</div>
	</div>
</Card>
