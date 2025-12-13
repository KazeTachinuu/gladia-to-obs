import { AUDIO, GLADIA_API_URL, LANGUAGE_CODES } from '$lib/config/constants';
import type { Settings } from '$lib/stores/settings.svelte';
import { ApiError } from './client';

// Gladia API types
export type GladiaSessionRequest = {
	encoding: 'wav/pcm';
	sample_rate: number;
	bit_depth: number;
	channels: number;
	endpointing: number;
	maximum_duration_without_endpointing: number;
	language_config: { languages: string[]; code_switching?: boolean };
	realtime_processing?: {
		custom_vocabulary?: boolean;
		custom_vocabulary_config?: { vocabulary: string[] };
		translation?: boolean;
		translation_config?: { target_languages: string[]; model: string };
	};
};

export type GladiaSessionResponse = {
	url: string;
};

// Gladia message types (runtime checked, not compile-time discriminated)
export type GladiaMessage = {
	type: string;
	data?: {
		utterance?: { text: string };
		translated_utterance?: { text: string };
		is_final?: boolean;
	};
};

// Build Gladia session request from settings
export function buildSessionRequest(settings: Settings): GladiaSessionRequest {
	const body: GladiaSessionRequest = {
		encoding: 'wav/pcm',
		sample_rate: AUDIO.SAMPLE_RATE,
		bit_depth: AUDIO.BIT_DEPTH,
		channels: AUDIO.CHANNELS,
		endpointing: settings.silenceThreshold,
		maximum_duration_without_endpointing: settings.maxDuration,
		language_config:
			settings.language === 'auto'
				? { languages: [...LANGUAGE_CODES], code_switching: true }
				: { languages: [settings.language] },
	};

	// Custom vocabulary
	const words = settings.vocabulary
		.split(/[,;]+/)
		.map((w) => w.trim())
		.filter(Boolean);

	if (words.length > 0) {
		body.realtime_processing = {
			custom_vocabulary: true,
			custom_vocabulary_config: { vocabulary: words },
		};
	}

	// Translation
	if (settings.translateTo) {
		body.realtime_processing = {
			...body.realtime_processing,
			translation: true,
			translation_config: { target_languages: [settings.translateTo], model: 'enhanced' },
		};
	}

	return body;
}

// Create Gladia session
export async function createSession(apiKey: string, settings: Settings): Promise<string> {
	const body = buildSessionRequest(settings);

	const response = await fetch(GLADIA_API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-gladia-key': apiKey,
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		if (response.status === 401) throw new ApiError(401, 'Invalid API key');
		if (response.status === 402) throw new ApiError(402, 'Insufficient credits');
		throw new ApiError(response.status, `API error: ${response.status}`);
	}

	const data: GladiaSessionResponse = await response.json();
	return data.url;
}

// Extract text from Gladia message
export function extractText(message: GladiaMessage, isTranslating: boolean): string | null {
	if (message.type === 'translation' && message.data?.translated_utterance?.text) {
		return message.data.translated_utterance.text.trim();
	}

	if (
		message.type === 'transcript' &&
		message.data?.utterance?.text &&
		message.data.is_final &&
		!isTranslating
	) {
		return message.data.utterance.text.trim();
	}

	return null;
}
