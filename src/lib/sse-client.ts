export interface SSEEventHandlers {
	onHeartbeat?: (data: { timestamp: number }) => void;
	onProgress?: (data: { type: string; current: number; total: number }) => void;
	onResult?: (data: unknown) => void;
	onError?: (data: { message: string }) => void;
	onDone?: () => void;
}

export class SSEClient {
	private eventSource: EventSource | null = null;

	constructor(
		private url: string,
		private handlers: SSEEventHandlers
	) {}

	connect(): void {
		this.eventSource = new EventSource(this.url);

		if (this.handlers.onHeartbeat) {
			this.eventSource.addEventListener('heartbeat', (event) => {
				const data = JSON.parse(event.data);
				this.handlers.onHeartbeat?.(data);
			});
		}

		if (this.handlers.onProgress) {
			this.eventSource.addEventListener('progress', (event) => {
				const data = JSON.parse(event.data);
				this.handlers.onProgress?.(data);
			});
		}

		if (this.handlers.onResult) {
			this.eventSource.addEventListener('result', (event) => {
				const data = JSON.parse(event.data);
				this.handlers.onResult?.(data);
			});
		}

		if (this.handlers.onError) {
			this.eventSource.addEventListener('error', (event: Event) => {
				if ('data' in event && typeof event.data === 'string') {
					const data = JSON.parse(event.data);
					this.handlers.onError?.(data);
				} else {
					this.handlers.onError?.({ message: 'Connection error' });
				}
				this.close();
			});
		}

		if (this.handlers.onDone) {
			this.eventSource.addEventListener('done', () => {
				this.handlers.onDone?.();
				this.close();
			});
		}

		// Handle connection errors
		this.eventSource.onerror = () => {
			if (this.eventSource?.readyState === EventSource.CLOSED) {
				this.handlers.onError?.({ message: 'Connection closed' });
				this.close();
			}
		};
	}

	close(): void {
		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
		}
	}
}

export async function gradeWithSSE(
	url: string,
	body: {
		questionSheetBase64: string;
		imagesBase64: string[];
		proMode: boolean;
		numRuns?: number;
	},
	headers: Record<string, string>,
	handlers: SSEEventHandlers
): Promise<void> {
	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...headers
			},
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error('No response body');
		}

		const decoder = new TextDecoder();
		let buffer = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n\n');
			buffer = lines.pop() || '';

			let stop = false;
			for (const line of lines) {
				if (!line.trim()) continue;

				const [eventLine, dataLine] = line.split('\n');
				if (!eventLine || !dataLine) continue;

				const event = eventLine.replace('event: ', '');
				const dataStr = dataLine.replace('data: ', '');

				try {
					const data = JSON.parse(dataStr);

					switch (event) {
						case 'heartbeat':
							handlers.onHeartbeat?.(data);
							break;
						case 'progress':
							handlers.onProgress?.(data);
							break;
						case 'result':
							handlers.onResult?.(data);
							break;
						case 'error':
							handlers.onError?.(data);
							throw new Error(data.message);
						case 'done':
							handlers.onDone?.();
							stop = true;
							break;
					}
				} catch (e) {
					console.error('Failed to parse SSE data:', e);
				}

				if (stop) break;
			}

			if (stop) break;
		}
	} catch (error) {
		if (error instanceof Error) {
			handlers.onError?.({ message: error.message });
		} else {
			handlers.onError?.({ message: 'An unknown error occurred: ' + String(error) });
		}
	}
}
