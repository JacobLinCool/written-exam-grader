<script lang="ts">
	import { Badge, Card, Heading, P, Button } from 'flowbite-svelte';
	import { Check, X, Target, ChevronDown, ChevronUp, MapPin } from '@lucide/svelte';
	import type { QuestionResult } from '$lib/types';

	type Props = {
		result: QuestionResult;
		confidence?: number;
		allResults?: QuestionResult[];
		onViewPosition?: (page: number, box2d: number[]) => void;
	};

	let { result, confidence, allResults, onViewPosition }: Props = $props();
	let isExpanded = $state(false);

	function getConfidenceColor(conf: number) {
		if (conf >= 0.8) return 'green';
		if (conf >= 0.6) return 'yellow';
		return 'red';
	}

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	function handleViewPosition() {
		if (onViewPosition && result.position) {
			onViewPosition(result.position.page, result.position.box2d);
		}
	}
</script>

<Card
	size="xl"
	class="border-2 p-4 {result.isCorrect
		? 'border-green-300 bg-green-50'
		: 'border-red-300 bg-red-50'}"
>
	<button
		onclick={toggleExpanded}
		class="mb-2 flex w-full cursor-pointer items-center justify-between text-left hover:opacity-80"
	>
		<Heading tag="h4" class="text-lg">Question {result.questionNumber}</Heading>
		<div class="flex items-center gap-3">
			<Badge color="blue" large>
				{result.earnedScore} / {result.maxScore}<span class="ml-1 max-sm:hidden">pts</span>
			</Badge>
			{#if confidence !== undefined}
				<Badge color={getConfidenceColor(confidence)} large>
					<Target class="mr-1 h-3 w-3" />
					{Math.round(confidence * 100)}%<span class="ml-1 max-sm:hidden"> confidence</span>
				</Badge>
			{/if}
			<Badge color={result.isCorrect ? 'green' : 'red'} large class="max-sm:hidden">
				{#if result.isCorrect}
					<Check class="mr-1 h-3 w-3" />
					Correct
				{:else}
					<X class="mr-1 h-3 w-3" />
					Incorrect
				{/if}
			</Badge>
			{#if allResults && allResults.length > 0}
				<div class="ml-2">
					{#if isExpanded}
						<ChevronUp class="h-5 w-5" />
					{:else}
						<ChevronDown class="h-5 w-5" />
					{/if}
				</div>
			{/if}
		</div>
	</button>

	<div class="space-y-2 text-sm">
		{#if result.position}
			<div class="mb-3 flex items-center gap-2 rounded-lg bg-gray-100 p-2">
				<MapPin class="h-4 w-4 text-blue-600" />
				<span class="text-xs text-gray-600">
					Page {result.position.page} • Position: [{result.position.box2d
						.map((v) => Math.round(v))
						.join(', ')}]
				</span>
				{#if onViewPosition}
					<Button size="xs" color="blue" class="ml-auto" onclick={handleViewPosition}>
						View on Sheet
					</Button>
				{/if}
			</div>
		{/if}
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

	{#if allResults && allResults.length > 0 && isExpanded}
		<div class="mt-4 border-t pt-4">
			<Heading tag="h5" class="mb-3 text-base">Other Results from Pro Mode Runs:</Heading>
			<div class="space-y-3">
				{#each allResults as otherResult, index}
					<div class="rounded-lg bg-white p-3 shadow-sm">
						<div class="mb-2 flex items-center justify-between">
							<span class="font-semibold text-gray-700">Run {index + 1}</span>
							<div class="flex items-center gap-2">
								<Badge color="blue" size="small">
									{otherResult.earnedScore} / {otherResult.maxScore} pts
								</Badge>
								<Badge color={otherResult.isCorrect ? 'green' : 'red'} size="small">
									{#if otherResult.isCorrect}
										<Check class="mr-1 h-3 w-3" />
										Correct
									{:else}
										<X class="mr-1 h-3 w-3" />
										Incorrect
									{/if}
								</Badge>
							</div>
						</div>
						<div class="space-y-2 text-sm text-gray-600">
							<div>
								<span class="font-medium">Student's Answer:</span>
								<P class="text-gray-500">{otherResult.studentAnswer}</P>
							</div>
							<div>
								<span class="font-medium">Explanation:</span>
								<P class="text-gray-500">{otherResult.explanation}</P>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</Card>
