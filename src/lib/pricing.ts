import { type GenerateContentResponseUsageMetadata } from '@google/genai';

const INPUT_TOKEN_PRICE_PER_1M = 1.25;
const CACHED_TOKEN_PRICE_PER_1M = INPUT_TOKEN_PRICE_PER_1M / 10;
const OUTPUT_TOKEN_PRICE_PER_1M = 10.0;

export function calculatePricing(usage: GenerateContentResponseUsageMetadata): {
	inputCost: number;
	cachedCost: number;
	outputCost: number;
	totalCost: number;
} {
	const inputTokens = (usage.promptTokenCount || 0) - (usage.cachedContentTokenCount || 0);
	const cachedTokens = usage.cachedContentTokenCount || 0;
	const outputTokens = (usage.thoughtsTokenCount || 0) + (usage.candidatesTokenCount || 0);

	const inputCost = (inputTokens / 1_000_000) * INPUT_TOKEN_PRICE_PER_1M;
	const cachedCost = (cachedTokens / 1_000_000) * CACHED_TOKEN_PRICE_PER_1M;
	const outputCost = (outputTokens / 1_000_000) * OUTPUT_TOKEN_PRICE_PER_1M;

	const totalCost = inputCost + cachedCost + outputCost;

	return {
		inputCost,
		cachedCost,
		outputCost,
		totalCost
	};
}
