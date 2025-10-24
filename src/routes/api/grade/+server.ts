import { env } from '$env/dynamic/private';
import { GoogleGenAIPool } from '$lib/genai-pool';
import { WrittenExamGrader } from '$lib/grader';
import { ImageValidator } from '$lib/validator';
import { GoogleGenAI } from '@google/genai';
import { json, type RequestHandler } from '@sveltejs/kit';

const pool = new GoogleGenAIPool(GoogleGenAI);

const keys = (env.GEMINI_API_KEY || '')
	.split(',')
	.map((k) => k.trim())
	.filter((k) => k);
for (const key of keys) {
	pool.add({
		apiKey: key,
		httpOptions: {
			baseUrl: env.GEMINI_API_BASE_URL
			// pool already adds cf-aig-metadata header
		}
	});
}

const AI_GRADER_MODEL = env.AI_GRADER_MODEL || 'gemini-2.5-pro';
const AI_GRADER_PRO_CONCURRENCY = parseInt(env.AI_GRADER_PRO_CONCURRENCY || '5', 10) || 5;
const AI_GRADER_PRO_RUNS = parseInt(env.AI_GRADER_PRO_RUNS || '5', 10) || 5;
const AI_VALIDATOR_MODEL = env.AI_VALIDATOR_MODEL || 'gemini-2.0-flash-exp';

const serverGrader = new WrittenExamGrader(pool);
const serverValidator = new ImageValidator(pool);

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = request.headers.get('X-GOOG-API-KEY');

	let grader: WrittenExamGrader;
	let validator: ImageValidator;
	if (apiKey) {
		// Use BYOK mode with user's API key
		const genai = new GoogleGenAI({
			apiKey,
			httpOptions: {
				baseUrl: env.GEMINI_API_BASE_URL,
				headers: {
					'cf-aig-metadata': JSON.stringify({
						service: 'written-exam-grader',
						byok: true
					})
				}
			}
		});
		grader = new WrittenExamGrader(genai);
		validator = new ImageValidator(genai);
	} else if (keys.length > 0) {
		// Use server-side configured API keys
		grader = serverGrader;
		validator = serverValidator;
	} else {
		return json(
			{ error: 'No API key configured on server, please use BYOK mode with your own API key.' },
			{ status: 400 }
		);
	}

	try {
		const { questionSheetBase64, imagesBase64, proMode } = await request.json();

		if (!questionSheetBase64 || typeof questionSheetBase64 !== 'string') {
			return json({ error: 'Missing or invalid questionSheet (PDF base64)' }, { status: 400 });
		}

		if (!imagesBase64 || !Array.isArray(imagesBase64) || imagesBase64.length === 0) {
			return json({ error: 'Missing images. Images must be a non-empty array.' }, { status: 400 });
		}

		// Create SSE stream
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();

				// Helper to send SSE message
				const sendEvent = (event: string, data: unknown) => {
					const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
					controller.enqueue(encoder.encode(message));
				};

				// Start heartbeat to keep connection alive
				const heartbeatInterval = setInterval(() => {
					sendEvent('heartbeat', { timestamp: Date.now() });
				}, 10000);

				try {
					// Validate images first using a faster model
					console.log('Validating images...');
					sendEvent('progress', { type: 'validating', current: 0, total: 1 });

					const validationResult = await validator.validate({
						imagesBase64,
						model: AI_VALIDATOR_MODEL
					});

					console.log('Validation result:', validationResult);

					if (!validationResult.isValid) {
						sendEvent('error', {
							message: `Invalid images detected: ${validationResult.reason}`
						});
						return;
					}

					// Use multipass grading if Pro mode is enabled
					const result = proMode
						? await grader.gradeMultipass({
								questionSheetBase64,
								imagesBase64,
								model: AI_GRADER_MODEL,
								numRuns: AI_GRADER_PRO_RUNS,
								concurrency: AI_GRADER_PRO_CONCURRENCY,
								onProgress: (progress) => {
									sendEvent('progress', progress);
								}
							})
						: await grader.grade({
								questionSheetBase64,
								imagesBase64,
								model: AI_GRADER_MODEL
							});

					console.log('Grading usage:', result.usage);

					// Send final result
					sendEvent('result', result);
					sendEvent('done', {});
				} catch (error) {
					console.error('Grading error:', error);
					sendEvent('error', {
						message: error instanceof Error ? error.message : 'Failed to grade answer sheet'
					});
				} finally {
					clearInterval(heartbeatInterval);
					controller.close();
				}
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} catch (error) {
		console.error('Request parsing error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to parse request' },
			{ status: 400 }
		);
	}
};
