export type QuestionResult = {
	questionNumber: number;
	isCorrect: boolean;
	explanation: string;
	studentAnswer: string;
	correctAnswer: string;
	maxScore: number;
	earnedScore: number;
	position: {
		page: number;
		box2d: number[];
	};
};

export type GradingResult = {
	results: QuestionResult[];
	totalScore: number;
	maxPossibleScore: number;
	comments: string;
	studentId: string;
	confidences?: number[];
	runs?: number;
	allResults?: {
		results: QuestionResult[];
		totalScore: number;
		maxPossibleScore: number;
		comments: string;
	}[];
};

export type SessionResult = GradingResult & {
	timestamp: string;
	pricing?: {
		totalCost: number;
		inputCost: number;
		outputCost: number;
	} | null;
};

export type PricingInfo = {
	totalCost: number;
	inputCost: number;
	outputCost: number;
};
