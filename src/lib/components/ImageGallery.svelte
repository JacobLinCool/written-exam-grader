<script lang="ts">
	import { Button, Heading } from 'flowbite-svelte';
	import { Trash2, X } from '@lucide/svelte';

	type Props = {
		images: string[];
		onRemove: (index: number) => void;
		onClearAll: () => void;
	};

	let { images, onRemove, onClearAll }: Props = $props();
</script>

{#if images.length > 0}
	<div class="my-4">
		<div class="mb-2 flex items-center justify-between">
			<Heading tag="h3" class="text-lg">Captured Images ({images.length})</Heading>
			<Button color="red" size="xs" onclick={onClearAll}>
				<Trash2 class="mr-1 h-3 w-3" />
				Clear All
			</Button>
		</div>
		<div class="grid grid-cols-2 gap-2">
			{#each images as image, index (index)}
				<div class="relative">
					<img
						src={image}
						alt="Answer sheet {index + 1}"
						class="w-full rounded-lg border-2 border-gray-300"
					/>
					<Button
						color="red"
						size="xs"
						class="absolute top-2 right-2 cursor-pointer p-1.5"
						onclick={() => onRemove(index)}
						pill
						aria-label="Remove image {index + 1}"
					>
						<X class="h-3 w-3" />
					</Button>
				</div>
			{/each}
		</div>
	</div>
{/if}
