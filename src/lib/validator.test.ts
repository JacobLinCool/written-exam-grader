import type { GoogleGenAI } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { ImageValidator } from './validator';

describe('ImageValidator', () => {
	it('should validate valid answer sheet images', async () => {
		// Mock GoogleGenAI
		const mockGenAI = {
			models: {
				generateContent: vi.fn().mockResolvedValue({
					text: JSON.stringify({
						isValid: true,
						reason: 'Images appear to be student answer sheets with handwritten content',
						confidence: 0.95
					}),
					usageMetadata: {}
				})
			}
		} as unknown as GoogleGenAI;

		const validator = new ImageValidator(mockGenAI);

		const result = await validator.validate({
			imagesBase64: ['base64encodedimage1', 'base64encodedimage2']
		});

		expect(result.isValid).toBe(true);
		expect(result.confidence).toBeGreaterThan(0.9);
		expect(mockGenAI.models.generateContent).toHaveBeenCalledOnce();
	});

	it('should invalidate non-answer sheet images', async () => {
		// Mock GoogleGenAI
		const mockGenAI = {
			models: {
				generateContent: vi.fn().mockResolvedValue({
					text: JSON.stringify({
						isValid: false,
						reason: 'Images appear to be group photos or dinner pictures, not answer sheets',
						confidence: 0.98
					}),
					usageMetadata: {}
				})
			}
		} as unknown as GoogleGenAI;

		const validator = new ImageValidator(mockGenAI);

		const result = await validator.validate({
			imagesBase64: ['base64encodedgroupphoto']
		});

		expect(result.isValid).toBe(false);
		expect(result.reason).toContain('group photos');
		expect(result.confidence).toBeGreaterThan(0.9);
	});

	it('should use custom model when specified', async () => {
		const mockGenAI = {
			models: {
				generateContent: vi.fn().mockResolvedValue({
					text: JSON.stringify({
						isValid: true,
						reason: 'Valid answer sheet',
						confidence: 0.9
					}),
					usageMetadata: {}
				})
			}
		} as unknown as GoogleGenAI;

		const validator = new ImageValidator(mockGenAI);

		await validator.validate({
			imagesBase64: ['base64encodedimage'],
			model: 'gemini-custom-model'
		});

		expect(mockGenAI.models.generateContent).toHaveBeenCalledWith(
			expect.objectContaining({
				model: 'gemini-custom-model'
			})
		);
	});

	it('should retry on failure', async () => {
		let callCount = 0;
		const mockGenAI = {
			models: {
				generateContent: vi.fn().mockImplementation(() => {
					callCount++;
					if (callCount < 2) {
						throw new Error('Network error');
					}
					return Promise.resolve({
						text: JSON.stringify({
							isValid: true,
							reason: 'Valid after retry',
							confidence: 0.9
						}),
						usageMetadata: {}
					});
				})
			}
		} as unknown as GoogleGenAI;

		const validator = new ImageValidator(mockGenAI);

		const result = await validator.validate({
			imagesBase64: ['base64encodedimage']
		});

		expect(result.isValid).toBe(true);
		expect(callCount).toBe(2); // First call failed, second succeeded
	});
});
