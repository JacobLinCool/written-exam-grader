import type { GoogleGenAI } from '@google/genai';
import type { GoogleGenAIPool } from './genai-pool';

export async function generateContentWithRetry(
	ai: GoogleGenAI | GoogleGenAIPool,
	request: Parameters<GoogleGenAI['models']['generateContent']>[0],
	options?: { retries?: number; baseDelayMs?: number; maxDelayMs?: number }
) {
	const retries = options?.retries ?? 3;
	const baseDelayMs = options?.baseDelayMs ?? 2_000;
	const maxDelayMs = options?.maxDelayMs ?? 600_000;

	let attempt = 0;
	let lastErr: unknown = null;

	while (attempt <= retries) {
		try {
			return await ai.models.generateContent(request);
		} catch (err) {
			lastErr = err;
			attempt++;

			// If we've exhausted retries, rethrow
			if (attempt > retries) break;

			// Exponential backoff with full jitter
			const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
			const delay = Math.floor(Math.random() * exp);

			console.warn(
				`generateContent failed on attempt ${attempt} - retrying after ${delay}ms. Error:`,
				err
			);

			await new Promise((res) => setTimeout(res, delay));
		}
	}

	// If lastErr is an Error, rethrow it; otherwise wrap it
	if (lastErr instanceof Error) throw lastErr;
	throw new Error(String(lastErr));
}
