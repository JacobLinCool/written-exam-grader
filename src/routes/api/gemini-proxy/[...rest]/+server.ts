import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { type RequestHandler } from '@sveltejs/kit';

/**
 * Proxy endpoint for Gemini API calls to avoid CORS issues in BYOK mode.
 *
 * This endpoint acts as a transparent proxy - it forwards requests to the Gemini API
 * using the user's API key provided in the request headers.
 *
 * IMPORTANT: The server does NOT store or log any data. All exam content and API keys
 * are only used transiently to forward the request to Google's Gemini API.
 *
 * The Google GenAI SDK will use this endpoint as the baseUrl, and will construct
 * the full API paths (like /v1beta/models/gemini-2.5-pro:generateContent).
 */

// Handle all HTTP methods
const handler: RequestHandler = async ({ request, url, params }) => {
	try {
		// Get the base URL from environment or use default
		let baseUrl = env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com';
		if (!baseUrl.endsWith('/')) {
			// Ensure trailing slash for proper URL construction
			baseUrl += '/';
		}

		// Build the target URL - use the same path as the incoming request
		const targetUrl = new URL(params.rest + url.search, baseUrl);

		// Prepare new request (only changing the url)
		const newRequest = new Request(targetUrl.toString(), request);

		// Forward the request to Gemini API
		let response = await fetch(newRequest);
		response = new Response(response.body, response);
		response.headers.set('Access-Control-Allow-Origin', '*');
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', '*');

		// set-cookie domain fix (if any cookies are set)
		const setCookie = response.headers.get('set-cookie');
		if (setCookie) {
			// Modify domain to match our server's domain
			const modifiedSetCookie = setCookie.replace(/Domain=[^;]+;/i, `Domain=${url.hostname};`);
			response.headers.set('set-cookie', modifiedSetCookie);
		}

		if (dev) {
			response.headers.delete('Content-Encoding');
		}

		return response;
	} catch (error) {
		console.error('Gemini proxy error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to proxy request to Gemini API',
				details: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};

// Export for all methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;

// Handle CORS preflight
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
			'Access-Control-Allow-Headers': '*'
		}
	});
};
