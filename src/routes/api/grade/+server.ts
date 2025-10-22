import { env } from '$env/dynamic/private';
import { GoogleGenAIPool } from '$lib/genai-pool';
import { WrittenExamGrader } from '$lib/grader';
import { GoogleGenAI } from '@google/genai';
import { json, type RequestHandler } from '@sveltejs/kit';

const pool = new GoogleGenAIPool(GoogleGenAI);

const keys = env.GEMINI_API_KEY.split(',')
	.map((k) => k.trim())
	.filter((k) => k);
for (const key of keys) {
	pool.add({
		apiKey: key,
		httpOptions: {
			baseUrl: env.GEMINI_API_BASE_URL // Work with custom base URL if needed
		}
	});
}

const AI_GRADER_SERVER_ENABLED = env.AI_GRADER_SERVER_ENABLED === 'true' || false;
const AI_GRADER_MODEL = env.AI_GRADER_MODEL || 'gemini-2.5-pro';
const AI_GRADER_PRO_CONCURRENCY = parseInt(env.AI_GRADER_PRO_CONCURRENCY || '5', 10) || 5;
const AI_GRADER_PRO_RUNS = parseInt(env.AI_GRADER_PRO_RUNS || '5', 10) || 5;

const grader = new WrittenExamGrader(pool);

export const POST: RequestHandler = async ({ request }) => {
	if (!AI_GRADER_SERVER_ENABLED) {
		return json({ error: 'AI grading server mode is disabled' }, { status: 403 });
	}

	try {
		const { questionSheet, images, proMode } = await request.json();

		if (!questionSheet || typeof questionSheet !== 'string') {
			return json({ error: 'Missing or invalid questionSheet (PDF base64)' }, { status: 400 });
		}

		if (!images || !Array.isArray(images) || images.length === 0) {
			return json({ error: 'Missing images. Images must be a non-empty array.' }, { status: 400 });
		}

		// Remove data URL prefix if present from question sheet
		const questionSheetBase64 = questionSheet.replace(/^data:application\/pdf;base64,/, '');

		// Remove data URL prefix if present from all images
		const imagesBase64 = images.map((image: string) =>
			image.replace(/^data:image\/\w+;base64,/, '')
		);

		// Use multipass grading if Pro mode is enabled
		const result = proMode
			? await grader.gradeMultipass({
					questionSheetBase64,
					imagesBase64,
					model: AI_GRADER_MODEL,
					numRuns: AI_GRADER_PRO_RUNS,
					concurrency: AI_GRADER_PRO_CONCURRENCY
				})
			: await grader.grade({
					questionSheetBase64,
					imagesBase64,
					model: AI_GRADER_MODEL
				});

		console.log('Grading usage:', result.usage);
		return json(result);
	} catch (error) {
		console.error('Grading error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to grade answer sheet' },
			{ status: 500 }
		);
	}
};
