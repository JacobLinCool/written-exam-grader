<script lang="ts">
	import type { GradingResult, PricingInfo } from '$lib/types';
	import { LoaderCircle, CircleCheckBig, CircleX } from '@lucide/svelte';

	// Grading job type
	export type GradingJob = {
		id: string;
		studentId: string;
		images: string[];
		status: 'pending' | 'grading' | 'completed' | 'error';
		result?: GradingResult;
		pricing?: PricingInfo | null;
		error?: string;
		timestamp: number;
	};

	interface Props {
		jobs: GradingJob[];
		onViewResult: (job: GradingJob) => void;
		onRetry: (job: GradingJob) => void;
	}

	let { jobs, onViewResult, onRetry }: Props = $props();
</script>

{#if jobs.length > 0}
	<div class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
		<h3 class="mb-3 text-lg font-semibold text-gray-900">Grading Queue</h3>
		<div class="space-y-2">
			{#each jobs as job (job.id)}
				<div
					class="flex items-center justify-between rounded-lg border p-3 {job.status === 'completed'
						? 'border-green-200 bg-green-50'
						: job.status === 'error'
							? 'border-red-200 bg-red-50'
							: 'border-blue-200 bg-blue-50'}"
				>
					<div class="flex items-center gap-3">
						{#if job.status === 'grading' || job.status === 'pending'}
							<LoaderCircle class="h-5 w-5 animate-spin text-blue-600" />
						{:else if job.status === 'completed'}
							<CircleCheckBig class="h-5 w-5 text-green-600" />
						{:else if job.status === 'error'}
							<CircleX class="h-5 w-5 text-red-600" />
						{/if}
						<div>
							<div class="font-medium text-gray-900">{job.studentId}</div>
							<div class="text-sm text-gray-600">
								{job.images.length}
								{job.images.length === 1 ? 'image' : 'images'}
								{#if job.status === 'grading'}
									- Grading...
								{:else if job.status === 'pending'}
									- Pending...
								{:else if job.status === 'completed' && job.result}
									- Score: {job.result.totalScore}/{job.result.maxPossibleScore}
								{:else if job.status === 'error'}
									- Error: {job.error}
								{/if}
							</div>
						</div>
					</div>
					<div class="flex gap-2">
						{#if job.status === 'completed'}
							<button
								onclick={() => onViewResult(job)}
								class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
							>
								View Result
							</button>
						{:else if job.status === 'error'}
							<button
								onclick={() => onRetry(job)}
								class="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
							>
								Retry
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
