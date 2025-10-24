<script lang="ts">
	import { Button, Card, Alert, Heading, P } from 'flowbite-svelte';
	import { FileText } from '@lucide/svelte';

	type Props = {
		error: string | null;
		onUpload: (event: Event) => void;
	};

	let { error, onUpload }: Props = $props();
	let questionSheetFileInput = $state<HTMLInputElement>();
</script>

<Card size="xl" class="p-4">
	<Heading tag="h2" class="mb-4">Step 1: Upload Question Sheet</Heading>
	<P class="mb-4 text-gray-600">
		Upload a PDF containing the questions, correct answers, and the mark allocations.
	</P>

	{#if error}
		<Alert color="red" class="mb-4">
			<span class="font-semibold">Error:</span>
			<span class="ml-2">{error}</span>
		</Alert>
	{/if}

	<input
		bind:this={questionSheetFileInput}
		type="file"
		accept="application/pdf"
		onchange={onUpload}
		class="hidden"
	/>
	<Button size="xl" class="w-full" onclick={() => questionSheetFileInput?.click()}>
		<FileText class="mr-2 h-5 w-5" />
		Upload Question Sheet (PDF)
	</Button>
</Card>
