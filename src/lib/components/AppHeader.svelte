<script lang="ts">
	import { Button, Badge, Heading } from 'flowbite-svelte';
	import { Download, RefreshCw } from '@lucide/svelte';

	type Props = {
		resultsCount: number;
		onDownload: () => void;
		onReset: () => void;
	};

	let { resultsCount, onDownload, onReset }: Props = $props();
</script>

<div class="mb-8">
	<Heading tag="h1" class="mb-4 text-center">Written Exam Grader</Heading>
	{#if resultsCount > 0}
		<div class="mt-4 flex flex-wrap items-center justify-center gap-4">
			<Badge color="blue" large class="px-4 py-2">Graded: {resultsCount} student(s)</Badge>
			<Button color="green" onclick={onDownload}>
				<Download class="mr-2 h-4 w-4" />
				Download All Results
			</Button>
			<Button color="alternative" onclick={onReset}>
				<RefreshCw class="mr-2 h-4 w-4" />
				Start New Session
			</Button>
		</div>
	{/if}
</div>
