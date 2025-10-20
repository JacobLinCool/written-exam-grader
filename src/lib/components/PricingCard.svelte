<script lang="ts">
	import { Badge, Card, Heading } from 'flowbite-svelte';
	import type { PricingInfo } from '$lib/types';

	type Props = {
		pricing: PricingInfo;
	};

	let { pricing }: Props = $props();
</script>

<Card class="mb-4 p-4" size="xl">
	<Heading tag="h4" class="mb-2 text-sm">Estimated Pricing</Heading>
	<div class="flex items-center gap-4 text-sm text-gray-700">
		<Badge color="blue">Input: USD {pricing.inputCost.toFixed(1)}</Badge>
		<Badge color="purple">Output: USD {pricing.outputCost.toFixed(1)}</Badge>
		<Badge color="gray" class="ml-auto">Total: USD {pricing.totalCost.toFixed(1)}</Badge>
	</div>
</Card>
