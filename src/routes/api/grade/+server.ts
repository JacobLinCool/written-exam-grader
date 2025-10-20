import { gradeAnswerSheet, gradeAnswerSheetMultipass } from '$lib/server/grading';
import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { questionSheet, studentId, images, proMode, numRuns } = await request.json();

		if (!questionSheet || typeof questionSheet !== 'string') {
			return json({ error: 'Missing or invalid questionSheet (PDF base64)' }, { status: 400 });
		}

		if (!studentId || typeof studentId !== 'string' || !studentId.trim()) {
			return json({ error: 'Missing or invalid studentId' }, { status: 400 });
		}

		if (!images || !Array.isArray(images) || images.length === 0) {
			return json({ error: 'Missing images. Images must be a non-empty array.' }, { status: 400 });
		}

		// Remove data URL prefix if present from question sheet
		const questionSheetBase64 = questionSheet.replace(/^data:application\/pdf;base64,/, '');

		// Remove data URL prefix if present from all images
		const base64Images = images.map((image: string) =>
			image.replace(/^data:image\/\w+;base64,/, '')
		);

		// Use multipass grading if Pro mode is enabled
		const result = proMode
			? await gradeAnswerSheetMultipass(questionSheetBase64, base64Images, numRuns || 3)
			: await gradeAnswerSheet(questionSheetBase64, base64Images);

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
