<script lang="ts">
	import { Button, Card, Alert, Heading, P, Badge } from 'flowbite-svelte';
	import { Plus, Sparkles } from '@lucide/svelte';
	import type { GradingResult, PricingInfo } from '$lib/types';
	import QuestionResultCard from './QuestionResultCard.svelte';
	import PricingCard from './PricingCard.svelte';
	import AnswerSheetViewer from './AnswerSheetViewer.svelte';

	type Props = {
		gradingResult: GradingResult;
		pricing: PricingInfo | null;
		answerSheetImages?: string[];
		onNext: () => void;
	};

	let { gradingResult, pricing, answerSheetImages, onNext }: Props = $props();
	let highlightedQuestion = $state<number | undefined>(undefined);

	function handleViewPosition(questionNumber: number, page: number, box2d: number[]) {
		highlightedQuestion = questionNumber;
		// Scroll to the answer sheet viewer
		setTimeout(() => {
			const viewer = document.getElementById('answer-sheet-viewer');
			if (viewer) {
				viewer.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}, 100);
	}
</script>

<div class="space-y-4">
	<Card size="xl" class="p-4">
		<div class="mb-4 flex items-center justify-between">
			<Heading tag="h2">Grading Results</Heading>
			<Button onclick={onNext}>
				<Plus class="mr-2 h-4 w-4" />
				Grade Next Student
			</Button>
		</div>

		<Alert color="blue" class="mb-6">
			<span class="font-semibold">Student:</span>
			<span class="ml-2">{gradingResult.studentId}</span>
			{#if gradingResult.runs}
				<Badge color="purple" class="ml-3">
					<Sparkles class="mr-1 h-3 w-3" />
					Pro Mode ({gradingResult.runs} runs)
				</Badge>
			{/if}
		</Alert>

		<div
			class="mb-6 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-center text-white shadow-lg"
		>
			<div class="text-5xl font-bold">
				{gradingResult.totalScore} / {gradingResult.maxPossibleScore}
			</div>
			<div class="mt-2 text-lg">
				{Math.round((gradingResult.totalScore / gradingResult.maxPossibleScore) * 100)}%
			</div>
		</div>

		{#if pricing}
			<PricingCard {pricing} />
		{/if}

		<Alert color="blue" class="mb-6">
			<Heading tag="h3" class="mb-2 text-base">Overall Comments:</Heading>
			<P class="text-gray-700">{gradingResult.comments}</P>
		</Alert>

		{#if answerSheetImages && answerSheetImages.length > 0}
			<div id="answer-sheet-viewer" class="mb-6">
				<AnswerSheetViewer
					images={answerSheetImages}
					results={gradingResult.results}
					bind:highlightedQuestion
				/>
			</div>
		{/if}

		<Heading tag="h3" class="mb-3">Question-by-Question Results:</Heading>
		<div class="space-y-4">
			{#each gradingResult.results as result, index (result.questionNumber)}
				<QuestionResultCard
					{result}
					confidence={gradingResult.confidences?.[index]}
					allResults={gradingResult.allResults?.map((r) => r.results[index]).filter(Boolean)}
					onViewPosition={(page, box2d) => handleViewPosition(result.questionNumber, page, box2d)}
				/>
			{/each}
		</div>
	</Card>
</div>
