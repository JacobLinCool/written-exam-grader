import { GoogleGenAI, type GoogleGenAIOptions } from '@google/genai';

/**
 * A pool manager for multiple GoogleGenAI instances to distribute requests.
 * Each instance can be configured with different API keys or settings.
 * Requests are distributed in a round-robin fashion.
 *
 * Suppor the methods and properties of GoogleGenAI directly on the pool,
 * forwarding calls to the next instance in the pool.
 *
 * Support Cloudflare AI Gateway by adding a custom header with the instance ID.
 */
export class GoogleGenAIPool {
	private pool: [id: string, genai: GoogleGenAI][] = [];
	private index = 0;
	constructor(private GenAICtor: typeof GoogleGenAI) {}

	/**
	 * Add a new GoogleGenAI instance to the pool.
	 * For instance id, use the provided one, or derive from the API key, or generate a unique one.
	 * @param opt Configuration options for the GoogleGenAI instance.
	 * @param id Custom identifier for the instance.
	 * @returns The current GoogleGenAIPool instance for chaining.
	 */
	public add(opt: GoogleGenAIOptions, id?: string): this {
		const genaiId =
			id ||
			opt.apiKey?.slice(-8) ||
			`genai-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

		const genai = new this.GenAICtor({
			...opt,
			httpOptions: {
				...opt.httpOptions,
				headers: {
					...opt.httpOptions?.headers,
					'cf-aig-metadata': JSON.stringify({ id: genaiId })
				}
			}
		});
		this.pool.push([genaiId, genai]);
		return this;
	}

	/**
	 * Remove a GoogleGenAI instance from the pool.
	 * @param id The identifier of the instance to remove.
	 * @returns True if the instance was removed, false if not found.
	 */
	public delete(id: string): boolean {
		const idx = this.pool.findIndex(([genaiId]) => genaiId === id);
		if (idx !== -1) {
			this.pool.splice(idx, 1);
			return true;
		}
		return false;
	}

	/**
	 * Get the next GoogleGenAI instance from the pool.
	 * @returns The next GoogleGenAI instance.
	 * @throws Error if no instances are available.
	 */
	public getNext(): GoogleGenAI {
		if (this.pool.length === 0) {
			throw new Error('No GoogleGenAI instances in the pool.');
		}
		const [, genai] = this.pool[this.index];
		this.index = (this.index + 1) % this.pool.length;
		return genai;
	}

	/**
	 * Get the number of GoogleGenAI instances in the pool.
	 * @returns The number of instances in the pool.
	 */
	public get size(): number {
		return this.pool.length;
	}

	/**
	 * Get the IDs of all GoogleGenAI instances in the pool.
	 * @returns An array of instance IDs.
	 */
	public get ids(): string[] {
		return this.pool.map(([id]) => id);
	}

	public get models(): GoogleGenAI['models'] {
		return this.getNext().models;
	}

	public get live(): GoogleGenAI['live'] {
		return this.getNext().live;
	}

	public get batches(): GoogleGenAI['batches'] {
		return this.getNext().batches;
	}

	public get chats(): GoogleGenAI['chats'] {
		return this.getNext().chats;
	}

	public get caches(): GoogleGenAI['caches'] {
		return this.getNext().caches;
	}

	public get files(): GoogleGenAI['files'] {
		return this.getNext().files;
	}

	public get operations(): GoogleGenAI['operations'] {
		return this.getNext().operations;
	}

	public get authTokens(): GoogleGenAI['authTokens'] {
		return this.getNext().authTokens;
	}

	public get tunings(): GoogleGenAI['tunings'] {
		return this.getNext().tunings;
	}

	public get vertexai(): GoogleGenAI['vertexai'] {
		return this.getNext().vertexai;
	}
}
