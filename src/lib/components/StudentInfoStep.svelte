<script lang="ts">
	import { Button, Card, Input, Label, Alert, Heading } from 'flowbite-svelte';
	import { ArrowLeft, ArrowRight } from '@lucide/svelte';

	type Props = {
		studentId: string;
		error: string | null;
		showBackButton: boolean;
		onBack: () => void;
		onContinue: () => void;
		onStudentIdChange: (value: string) => void;
	};

	let { studentId, error, showBackButton, onBack, onContinue, onStudentIdChange }: Props = $props();

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			onContinue();
		}
	}
</script>

<Card size="xl" class="p-4">
	<div class="mb-4 flex items-center justify-between">
		<Heading tag="h2">Step 2: Enter Student Information</Heading>
		{#if showBackButton}
			<Button color="light" onclick={onBack}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back
			</Button>
		{/if}
	</div>

	{#if error}
		<Alert color="red" class="mb-4">
			<span class="font-semibold">Error:</span>
			<span class="ml-2">{error}</span>
		</Alert>
	{/if}

	<div class="space-y-4">
		<div>
			<Label for="studentId" class="mb-2">Student ID or Name</Label>
			<Input
				id="studentId"
				type="text"
				value={studentId}
				oninput={(e) => onStudentIdChange((e.target as HTMLInputElement).value)}
				placeholder="Enter student ID or name"
				size="lg"
				onkeydown={handleKeyDown}
			/>
		</div>

		<Button size="xl" class="w-full" onclick={onContinue}>
			Continue
			<ArrowRight class="ml-2 h-5 w-5" />
		</Button>
	</div>
</Card>
