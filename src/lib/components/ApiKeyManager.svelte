<script lang="ts">
	import { Key, Eye, EyeOff, X } from '@lucide/svelte';
	import { onMount } from 'svelte';

	interface Props {
		hasKey: boolean;
		maskedKey: string | null;
		onSetKey: (key: string) => void;
		onClearKey: () => void;
	}

	let { hasKey, maskedKey, onSetKey, onClearKey }: Props = $props();

	let showInput = $state(false);
	let apiKey = $state('');
	let showKey = $state(false);
	let error = $state<string | null>(null);

	function handleSetKey() {
		if (!apiKey.trim()) {
			error = 'Please enter an API key';
			return;
		}

		// Basic validation - Gemini API keys typically start with 'AIza'
		if (!apiKey.startsWith('AIza')) {
			error = 'Invalid API key format. Gemini API keys typically start with "AIza"';
			return;
		}

		onSetKey(apiKey.trim());
		apiKey = '';
		showInput = false;
		showKey = false;
		error = null;
	}

	function handleClearKey() {
		onClearKey();
		apiKey = '';
		showInput = false;
		showKey = false;
		error = null;
	}

	function toggleInput() {
		showInput = !showInput;
		if (!showInput) {
			apiKey = '';
			error = null;
		}
	}

	onMount(() => {
		apiKey = localStorage.getItem('gemini_api_key') || '';
	});
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
	<div class="flex items-center justify-between max-sm:flex-col">
		<div class="flex items-center gap-2">
			<Key class="h-5 w-5 text-primary-600" />
			<h3 class="font-semibold text-gray-900">BYOK Mode (Bring Your Own Key)</h3>
		</div>

		{#if hasKey && maskedKey}
			<div class="flex items-center gap-3">
				<span class="text-sm text-gray-600">
					API Key: <code class="rounded bg-gray-100 px-2 py-1.5">{maskedKey}</code>
				</span>
				<button
					onclick={handleClearKey}
					class="flex cursor-pointer items-center gap-1 rounded-md bg-primary-100 px-3 py-1.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-200"
				>
					<X class="h-4 w-4" />
					Clear
				</button>
			</div>
		{:else}
			<button
				onclick={toggleInput}
				class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
			>
				{showInput ? 'Cancel' : 'Set API Key'}
			</button>
		{/if}
	</div>

	{#if showInput}
		<div class="mt-4 space-y-3">
			<div>
				<label for="api-key" class="mb-1 block text-sm font-medium text-gray-700">
					Gemini API Key
				</label>
				<div class="relative">
					<input
						id="api-key"
						type={showKey ? 'text' : 'password'}
						bind:value={apiKey}
						placeholder="AIza..."
						class="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								handleSetKey();
							}
						}}
					/>
					<button
						type="button"
						onclick={() => (showKey = !showKey)}
						class="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
					>
						{#if showKey}
							<EyeOff class="h-5 w-5" />
						{:else}
							<Eye class="h-5 w-5" />
						{/if}
					</button>
				</div>
				{#if error}
					<p class="mt-1 text-sm text-primary-600">{error}</p>
				{/if}
			</div>

			<div class="rounded-md bg-primary-50 p-3 text-sm text-primary-800">
				<p class="mb-1 font-medium">How to get your API key:</p>
				<ol class="ml-4 list-decimal space-y-1">
					<li>
						Visit <a
							href="https://aistudio.google.com/apikey"
							target="_blank"
							rel="noopener noreferrer"
							class="font-medium underline hover:text-primary-600"
						>
							Google AI Studio
						</a>
					</li>
					<li>Create a new API key or use an existing one</li>
					<li>Copy and paste it here</li>
				</ol>
				<p class="mt-2 text-xs text-primary-700">
					Your API key is stored locally in your browser and never sent to our servers.
				</p>
			</div>

			<button
				onclick={handleSetKey}
				class="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
			>
				Save API Key
			</button>
		</div>
	{/if}

	{#if !hasKey && !showInput}
		<p class="mt-2 text-sm text-gray-600">
			Use your own Gemini API key to grade exams directly in your browser. No data is sent to our
			servers.
		</p>
	{/if}
</div>
