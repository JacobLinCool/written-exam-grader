import { GoogleGenAI } from '@google/genai';
import { toGeminiSchema } from 'gemini-zod';
import { z } from 'zod/v3';
import type { GoogleGenAIPool } from './genai-pool';
import { generateContentWithRetry } from './retry';

const ValidationResult = z.object({
	isValid: z.boolean().describe('Whether the images appear to be student answer sheets'),
	reason: z
		.string()
		.describe(
			'Explanation of why the images are valid or invalid. If invalid, explain what type of images were detected instead.'
		),
	confidence: z.number().min(0).max(1).describe('Confidence level of the validation (0-1)')
});

export type ValidationResult = z.infer<typeof ValidationResult>;

export interface ImageValidationOptions {
	imagesBase64: string[];
	model?: string;
}

export interface IImageValidator {
	validate(options: ImageValidationOptions): Promise<ValidationResult>;
}

export class ImageValidator implements IImageValidator {
	constructor(private ai: GoogleGenAI | GoogleGenAIPool) {}

	public async validate(options: ImageValidationOptions): Promise<ValidationResult> {
		const model = options.model || 'gemini-2.0-flash';

		const prompt = `You are an expert at analyzing images to determine if they are student answer sheets for exams.

Your task is to examine ${options.imagesBase64.length} image(s) and determine if they appear to be handwritten exam answer sheets or similar academic work.

Valid answer sheets typically contain:
- Handwritten text or answers
- Question numbers or sections
- Student work on paper
- Mathematical equations, diagrams, or written responses
- Exam-like formatting

Invalid images might be:
- Group photos of people
- Dinner photos or food pictures
- Selfies or portraits
- Screenshots of unrelated content
- Completely blank pages
- Non-academic content

Please analyze all provided images and determine:
1. Whether they appear to be student answer sheets (true/false)
2. A clear explanation of your reasoning
3. Your confidence level (0-1, where 1 is very confident)

Be strict but reasonable - if most images look like answer sheets but one might be unclear, consider the overall set.`;

		console.log('Sending validation request to validation model...');

		const validationResponse = await generateContentWithRetry(this.ai, {
			model,
			contents: [
				{
					role: 'user',
					parts: [
						{
							text: prompt
						},
						...options.imagesBase64.map((imgBase64) => ({
							inlineData: {
								mimeType: 'image/jpeg',
								data: imgBase64
							}
						}))
					]
				}
			],
			config: {
				responseMimeType: 'application/json',
				responseSchema: toGeminiSchema(ValidationResult)
			}
		});

		if (!validationResponse.text) {
			throw new Error('No content received from validation model');
		}

		const result = ValidationResult.parse(JSON.parse(validationResponse.text));
		return result;
	}
}
