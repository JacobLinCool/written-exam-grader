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
export type GradingResponse = {
	result: GradingResult;
	usage: GenerateContentResponseUsageMetadata;
};

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
	const gradingResponse = await ai.models.generateContent({
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

	result.maxPossibleScore = result.results.reduce(
		(acc, curr) => acc + curr.maxScore,
		0
	);
	result.totalScore = result.results.reduce(
		(acc, curr) => acc + curr.earnedScore,
		0
	);

	return {
		result,
		usage: gradingResponse.usageMetadata
	};
}
