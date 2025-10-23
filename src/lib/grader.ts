import {
	type GenerateContentParameters,
	type GenerateContentResponseUsageMetadata,
	GoogleGenAI
} from '@google/genai';
import { toGeminiSchema } from 'gemini-zod';
import { z } from 'zod/v3';
import type { GoogleGenAIPool } from './genai-pool';

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
		.describe('The score the student earned for this question (can be partial credit)'),
	position: z
		.object({
			page: z.number().describe('The page number where the answer is located (1-based)'),
			box2d: z
				.array(z.number())
				.describe('The bounding box [ymin, xmin, ymax, xmax] normalized to 0-1000.')
		})
		.describe(
			'The position of the student answer on the answer sheet if exists (if not exists, fill with -1).'
		)
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

export interface WrittenExamGradingOptions {
	questionSheetBase64: string;
	imagesBase64: string[];
	model: string;
}

export interface MultipassWrittenExamGradingOptions extends WrittenExamGradingOptions {
	numRuns: number;
	concurrency: number;
	onProgress?: (progress: {
		type: 'grading' | 'run-completed';
		current: number;
		total: number;
	}) => void;
}

export interface IWrittenExamGrader {
	grade(options: WrittenExamGradingOptions): Promise<GradingResponse>;
	gradeMultipass(options: MultipassWrittenExamGradingOptions): Promise<MultipassGradingResponse>;
}

export class WrittenExamGrader implements IWrittenExamGrader {
	constructor(private ai: GoogleGenAI | GoogleGenAIPool) {}

	public async grade(options: WrittenExamGradingOptions): Promise<GradingResponse> {
		const prompt = `You are an expert teacher grading a student's answer sheet.

I will provide you with:
1. The question sheet (with correct answers) as a PDF
2. ${options.imagesBase64.length} photo(s) of the student's handwritten answer sheet

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

		const gradingResponse = await this.generateContentWithRetry({
			model: options.model,
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
								data: options.questionSheetBase64
							}
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

	public async gradeMultipass(
		options: MultipassWrittenExamGradingOptions
	): Promise<MultipassGradingResponse> {
		const allResults: GradingResult[] = [];
		const totalUsage: GenerateContentResponseUsageMetadata = {
			promptTokenCount: 0,
			candidatesTokenCount: 0,
			thoughtsTokenCount: 0,
			totalTokenCount: 0
		};

		// Run grading multiple times with bounded concurrency using worker loops.
		const runGrading = async (runIndex: number) => {
			console.log(`Grading run ${runIndex + 1} of ${options.numRuns}...`);
			const { result, usage } = await this.grade(options);

			// push result
			allResults.push(result);

			// Accumulate usage
			totalUsage.promptTokenCount =
				(totalUsage.promptTokenCount || 0) + (usage.promptTokenCount || 0);
			totalUsage.candidatesTokenCount =
				(totalUsage.candidatesTokenCount || 0) + (usage.candidatesTokenCount || 0);
			totalUsage.thoughtsTokenCount =
				(totalUsage.thoughtsTokenCount || 0) + (usage.thoughtsTokenCount || 0);
			totalUsage.totalTokenCount = (totalUsage.totalTokenCount || 0) + (usage.totalTokenCount || 0);
			console.log(`Completed grading run ${runIndex + 1}`);

			// Report progress
			if (options.onProgress) {
				options.onProgress({
					type: 'run-completed',
					current: allResults.length,
					total: options.numRuns
				});
			}
		};

		// Shared index for work distribution
		let nextIndex = 0;
		const workers = Array.from(
			{ length: Math.min(options.concurrency, options.numRuns) },
			async () => {
				while (true) {
					const i = nextIndex++;
					if (i >= options.numRuns) break;
					try {
						// for the first batch, add delay for context caching
						if (i > 0 && i < options.concurrency) {
							await new Promise((res) => setTimeout(res, 15_000));
						}
						await runGrading(i);
					} catch (err) {
						console.error(`Grading run ${i + 1} failed:`, err);
						// rethrow so Promise.all below rejects
						throw err;
					}
				}
			}
		);

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
				confidences.push(maxCount / options.numRuns);
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
			runs: options.numRuns,
			results: allResults
		};
	}

	private async generateContentWithRetry(
		request: GenerateContentParameters,
		options?: { retries?: number; baseDelayMs?: number; maxDelayMs?: number }
	) {
		const retries = options?.retries ?? 3;
		const baseDelayMs = options?.baseDelayMs ?? 2_000;
		const maxDelayMs = options?.maxDelayMs ?? 600_000;

		let attempt = 0;
		let lastErr: unknown = null;

		while (attempt <= retries) {
			try {
				return await this.ai.models.generateContent(request);
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
}
