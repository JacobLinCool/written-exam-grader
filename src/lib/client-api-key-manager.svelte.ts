import { browser } from '$app/environment';

export const GEMINI_API_KEY_STORAGE_KEY = 'gemini_api_key';

export class ClientApiKeyManager {
	#apiKey: string | null = $state(null);
	public apiKey: string | null = $derived(this.#apiKey);
	public maskedApiKey: string | null = $derived.by(() => {
		if (!this.#apiKey) return null;
		const keyLength = this.#apiKey.length;
		if (keyLength <= 8) return '****';
		return this.#apiKey.slice(0, 4) + '****' + this.#apiKey.slice(-4);
	});

	constructor() {
		// Load API key from localStorage if available
		if (browser) {
			this.#apiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
		}
	}

	/**
	 * Set the API key and initialize the grader
	 */
	public setApiKey(apiKey: string): void {
		this.#apiKey = apiKey;
		if (browser) {
			localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, apiKey);
		}
	}

	/**
	 * Clear the API key
	 */
	public clearApiKey(): void {
		this.#apiKey = null;
		if (browser) {
			localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
		}
	}
}
