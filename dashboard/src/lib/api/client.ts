// Centralized API client with consistent error handling

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

function getBaseUrl(): string {
	if (typeof window === 'undefined') return 'http://localhost:8080';
	return window.location.origin;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
	const url = `${getBaseUrl()}${endpoint}`;
	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers,
		},
	});

	if (!response.ok) {
		throw new ApiError(response.status, `Request failed: ${response.status}`);
	}

	return response.json();
}

export const api = {
	get: <T>(endpoint: string) => request<T>(endpoint),

	post: <T>(endpoint: string, body: unknown) =>
		request<T>(endpoint, {
			method: 'POST',
			body: JSON.stringify(body),
		}),

	getBaseUrl,
	getPort: () => (typeof window !== 'undefined' ? window.location.port || '8080' : '8080'),
};
