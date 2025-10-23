import { browser } from '$app/environment';
import { page } from '$app/state';
import { WrittenExamGrader } from '$lib/grader';
import { GoogleGenAI } from '@google/genai';

/**
 * Client-side grader that runs entirely in the browser using user's own API key
 */
export class ClientGrader {
	private grader: WrittenExamGrader | null = null;
	private apiKey: string | null = $state(null);
	public maskedApiKey: string | null = $derived.by(() => {
		if (!this.apiKey) return null;
		const keyLength = this.apiKey.length;
		if (keyLength <= 8) return '****';
		return this.apiKey.slice(0, 4) + '****' + this.apiKey.slice(-4);
	});

	constructor() {
		// Load API key from localStorage if available
		if (browser) {
			this.apiKey = localStorage.getItem('gemini_api_key');
			if (this.apiKey) {
				this.initializeGrader(this.apiKey);
			}
		}
	}

	/**
	 * Set the API key and initialize the grader
	 */
	public setApiKey(apiKey: string): void {
		this.apiKey = apiKey;
		if (browser) {
			localStorage.setItem('gemini_api_key', apiKey);
		}
		this.initializeGrader(apiKey);
	}

	/**
	 * Clear the API key
	 */
	public clearApiKey(): void {
		this.apiKey = null;
		this.grader = null;
		if (browser) {
			localStorage.removeItem('gemini_api_key');
		}
	}

	/**
	 * Initialize the grader with the API key
	 */
	private initializeGrader(apiKey: string): void {
		const genai = new GoogleGenAI({
			apiKey,
			httpOptions: {
				// Use our proxy endpoint to avoid CORS issues
				baseUrl: page.url.origin + '/api/gemini-proxy',
				headers: {
					'cf-aig-metadata': JSON.stringify({
						service: 'written-exam-grader',
						byok: true
					})
				}
			}
		});
		this.grader = new WrittenExamGrader(genai);
	}

	/**
	 * Grade using client-side API
	 */
	public async grade(options: {
		questionSheetBase64: string;
		imagesBase64: string[];
		model?: string;
	}) {
		if (!this.grader) {
			throw new Error('Grader not initialized. Please set your API key first.');
		}

		return await this.grader.grade({
			questionSheetBase64: options.questionSheetBase64,
			imagesBase64: options.imagesBase64,
			model: options.model || 'gemini-2.5-pro'
		});
	}

	/**
	 * Grade using multipass mode
	 */
	public async gradeMultipass(options: {
		questionSheetBase64: string;
		imagesBase64: string[];
		model?: string;
		numRuns?: number;
		concurrency?: number;
	}) {
		if (!this.grader) {
			throw new Error('Grader not initialized. Please set your API key first.');
		}

		return await this.grader.gradeMultipass({
			questionSheetBase64: options.questionSheetBase64,
			imagesBase64: options.imagesBase64,
			model: options.model || 'gemini-2.5-pro',
			numRuns: options.numRuns || 5,
			concurrency: options.concurrency || 3
		});
	}
}
