import { env } from '$env/dynamic/private';
import { type GenerateContentResponseUsageMetadata, GoogleGenAI } from '@google/genai';
import { toGeminiSchema } from 'gemini-zod';
import { z } from 'zod/v3';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const AI_GRADER_MODEL = env.AI_GRADER_MODEL || 'gemini-2.5-pro';

const QuestionResult = z.object({
	questionNumber: z.number().describe('The question number'),
	isCorrect: z.boolean().describe('Whether the answer is correct'),
	explanation: z.string().describe('Explanation of why the answer is correct or incorrect'),
	studentAnswer: z.string().describe('What the student wrote'),
	correctAnswer: z.string().describe('The correct answer'),
	maxScore: z
		.number()
		.describe('The maximum score for this question as shown in the question sheet'),
	earnedScore: z
		.number()
		.describe('The score the student earned for this question (can be partial credit)')
});

const GradingResult = z.object({
	results: z.array(QuestionResult),
	totalScore: z
		.number()
		.describe('The total score earned by the student (sum of all earned scores)'),
	maxPossibleScore: z.number().describe('The maximum possible score (sum of all max scores)'),
	comments: z.string().describe("Overall comments about the student's performance")
});

export type QuestionResult = z.infer<typeof QuestionResult>;
export type GradingResult = z.infer<typeof GradingResult>;
export interface GradingResponse {
	result: GradingResult;
	usage: GenerateContentResponseUsageMetadata;
}
export interface MultipassGradingResponse extends GradingResponse {
	confidences: number[];
	runs: number;
	results: GradingResult[];
}

export async function gradeAnswerSheet(
	questionSheetBase64: string,
	imagesBase64: string[]
): Promise<GradingResponse> {
	const prompt = `You are an expert teacher grading a student's answer sheet.

I will provide you with:
1. The question sheet (with correct answers) as a PDF
2. ${imagesBase64.length} photo(s) of the student's handwritten answer sheet

Your task:
- Extract all questions, their correct answers, AND THE SCORE/POINTS for each question from the question sheet PDF
- Read the student's handwritten answers from the photo(s) - the answers may be spread across multiple images
- Compare each answer and determine if it's correct
- Assign a score for each question (can be partial credit)
- Provide concise explanations for each grade if the answer is incorrect or partially correct
- Calculate the total score (sum of all earned scores)

Please be fair and understanding:
- Accept answers that are semantically equivalent even if worded differently
- For math problems, accept different solution methods if they arrive at the correct answer
- Give partial credit when the student shows correct work or partial understanding
- Be specific about what was correct or incorrect in the student's answer
- If answers are spread across multiple images, combine them logically

Return a structured result with:
- For each question: question number, correctness, explanation, student's answer, correct answer, max score for the question, and earned score
- Total score earned (sum of all earned scores)
- Maximum possible score (sum of all max scores)
- Overall comments about the student's performance

IMPORTANT: Extract the score/points for each question from the question sheet. The total score may not be 100.`;

	console.log('Sending grading request to grading model...');

	const gradingResponse = await generateContentWithRetry({
		model: AI_GRADER_MODEL,
		contents: [
			{
				role: 'user',
				parts: [
					{
						text: prompt
					},
					{
						inlineData: {
							mimeType: 'application/pdf',
							data: questionSheetBase64
						}
					},
					...imagesBase64.map((imgBase64) => ({
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
			responseSchema: toGeminiSchema(GradingResult)
		}
	});

	if (!gradingResponse.text) {
		throw new Error('No content received from grading model');
	}
	if (!gradingResponse.usageMetadata) {
		throw new Error('No usage metadata received from grading model');
	}

	const result = GradingResult.parse(JSON.parse(gradingResponse.text));

	result.maxPossibleScore = result.results.reduce((acc, curr) => acc + curr.maxScore, 0);
	result.totalScore = result.results.reduce((acc, curr) => acc + curr.earnedScore, 0);

	return {
		result,
		usage: gradingResponse.usageMetadata
	};
}

export async function gradeAnswerSheetMultipass(
	questionSheetBase64: string,
	imagesBase64: string[],
	numRuns: number = 3
): Promise<MultipassGradingResponse> {
	const allResults: GradingResult[] = [];
	const totalUsage: GenerateContentResponseUsageMetadata = {
		promptTokenCount: 0,
		candidatesTokenCount: 0,
		totalTokenCount: 0
	};

	// Run grading multiple times with bounded concurrency using worker loops.
	const concurrency = 3;

	const runGrading = async (runIndex: number) => {
		console.log(`Grading run ${runIndex + 1} of ${numRuns}...`);
		const { result, usage } = await gradeAnswerSheet(questionSheetBase64, imagesBase64);

		// push result
		allResults.push(result);

		// Accumulate usage
		totalUsage.promptTokenCount =
			(totalUsage.promptTokenCount || 0) + (usage.promptTokenCount || 0);
		totalUsage.candidatesTokenCount =
			(totalUsage.candidatesTokenCount || 0) + (usage.candidatesTokenCount || 0);
		totalUsage.totalTokenCount = (totalUsage.totalTokenCount || 0) + (usage.totalTokenCount || 0);
	};

	// Shared index for work distribution
	let nextIndex = 0;
	const workers = Array.from({ length: Math.min(concurrency, numRuns) }, async () => {
		while (true) {
			const i = nextIndex++;
			if (i >= numRuns) break;
			try {
				await runGrading(i);
			} catch (err) {
				console.error(`Grading run ${i + 1} failed:`, err);
				// rethrow so Promise.all below rejects
				throw err;
			}
		}
	});

	await Promise.all(workers);

	// Group results by question number
	const questionMap = new Map<number, QuestionResult[]>();
	for (const gradingResult of allResults) {
		for (const questionResult of gradingResult.results) {
			if (!questionMap.has(questionResult.questionNumber)) {
				questionMap.set(questionResult.questionNumber, []);
			}
			questionMap.get(questionResult.questionNumber)!.push(questionResult);
		}
	}

	// Perform majority voting on each question
	const finalResults: QuestionResult[] = [];
	const confidences: number[] = [];

	for (const [, results] of Array.from(questionMap.entries()).sort((a, b) => a[0] - b[0])) {
		// Count occurrences of each earned score
		const scoreCount = new Map<number, { count: number; result: QuestionResult }>();

		for (const result of results) {
			const score = result.earnedScore;
			if (!scoreCount.has(score)) {
				scoreCount.set(score, { count: 0, result });
			}
			scoreCount.get(score)!.count++;
		}

		// Find the score with the highest count (majority vote)
		let maxCount = 0;
		let majorityResult: QuestionResult | null = null;
		const candidatesWithMaxCount: Array<{ score: number; result: QuestionResult }> = [];

		for (const [score, { count, result }] of scoreCount.entries()) {
			if (count > maxCount) {
				maxCount = count;
				candidatesWithMaxCount.length = 0;
				candidatesWithMaxCount.push({ score, result });
			} else if (count === maxCount) {
				candidatesWithMaxCount.push({ score, result });
			}
		}

		// If there's a tie (all candidates have the same count), select the middle score
		if (candidatesWithMaxCount.length > 1) {
			candidatesWithMaxCount.sort((a, b) => a.score - b.score);
			const middleIndex = Math.floor(candidatesWithMaxCount.length / 2);
			majorityResult = candidatesWithMaxCount[middleIndex].result;
		} else if (candidatesWithMaxCount.length === 1) {
			majorityResult = candidatesWithMaxCount[0].result;
		}

		if (majorityResult) {
			finalResults.push(majorityResult);
			// Calculate confidence as the ratio of majority votes
			confidences.push(maxCount / numRuns);
		}
	}

	// Calculate final scores
	const totalScore = finalResults.reduce((acc, curr) => acc + curr.earnedScore, 0);
	const maxPossibleScore = finalResults.reduce((acc, curr) => acc + curr.maxScore, 0);

	// Generate overall comments based on all runs
	const comments = allResults[0].comments;

	const finalResult: GradingResult = {
		results: finalResults,
		totalScore,
		maxPossibleScore,
		comments
	};

	return {
		result: finalResult,
		usage: totalUsage,
		confidences,
		runs: numRuns,
		results: allResults
	};
}

async function generateContentWithRetry(
	request: Parameters<typeof ai.models.generateContent>[0],
	options?: { retries?: number; baseDelayMs?: number; maxDelayMs?: number }
) {
	const retries = options?.retries ?? 3;
	const baseDelayMs = options?.baseDelayMs ?? 5_000;
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
			// delay = random(0, min(maxDelay, baseDelay * 2^(attempt)))
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
