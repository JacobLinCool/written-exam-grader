<script lang="ts">
	import { Badge, Card, Heading, P } from 'flowbite-svelte';
	import { Check, X, Target } from '@lucide/svelte';
	import type { QuestionResult } from '$lib/types';

	type Props = {
		result: QuestionResult;
		confidence?: number;
	};

	let { result, confidence }: Props = $props();

	function getConfidenceColor(conf: number) {
		if (conf >= 0.8) return 'green';
		if (conf >= 0.6) return 'yellow';
		return 'red';
	}
</script>

<Card
	size="xl"
	class="border-2 p-4 {result.isCorrect
		? 'border-green-300 bg-green-50'
		: 'border-red-300 bg-red-50'}"
>
	<div class="mb-2 flex items-center justify-between">
		<Heading tag="h4" class="text-lg">Question {result.questionNumber}</Heading>
		<div class="flex items-center gap-3">
			<Badge color="blue" large>
				{result.earnedScore} / {result.maxScore} pts
			</Badge>
			{#if confidence !== undefined}
				<Badge color={getConfidenceColor(confidence)} large>
					<Target class="mr-1 h-3 w-3" />
					{Math.round(confidence * 100)}% confidence
				</Badge>
			{/if}
			<Badge color={result.isCorrect ? 'green' : 'red'} large>
				{#if result.isCorrect}
					<Check class="mr-1 h-3 w-3" />
					Correct
				{:else}
					<X class="mr-1 h-3 w-3" />
					Incorrect
				{/if}
			</Badge>
		</div>
	</div>

	<div class="space-y-2 text-sm">
		<div>
			<span class="font-semibold text-gray-700">Student's Answer:</span>
			<P class="text-gray-600">{result.studentAnswer}</P>
		</div>
		<div>
			<span class="font-semibold text-gray-700">Correct Answer:</span>
			<P class="text-gray-600">{result.correctAnswer}</P>
		</div>
		<div>
			<span class="font-semibold text-gray-700">Explanation:</span>
			<P class="text-gray-600">{result.explanation}</P>
		</div>
	</div>
</Card>
