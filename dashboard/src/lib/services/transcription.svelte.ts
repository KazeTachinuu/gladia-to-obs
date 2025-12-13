import { api } from '$lib/api/client';
import { createSession, extractText, type GladiaMessage } from '$lib/api/gladia';
import type { Settings } from '$lib/stores/settings.svelte';
import { transcriptionStore } from '$lib/stores/transcription.svelte';
import { AUDIO_ERRORS, setupAudio, stopAudio, type AudioError } from './audio.svelte';

let ws: WebSocket | null = null;
let isRunning = false;

async function broadcast(text: string): Promise<void> {
	try {
		await api.post('/broadcast', { text });
	} catch (error) {
		console.error('Broadcast failed:', error);
	}
}

export async function start(settings: Settings, deviceId: string | null): Promise<void> {
	const apiKey = settings.apiKey.trim();
	if (!apiKey) {
		transcriptionStore.setError('API key required');
		throw new Error('API key required');
	}

	transcriptionStore.setStatus('connecting', 'Connecting...');
	transcriptionStore.setPreview('Connecting to Gladia...');

	try {
		const url = await createSession(apiKey, settings);

		ws = new WebSocket(url);

		ws.onopen = async () => {
			try {
				transcriptionStore.setPreview('Initializing audio...');

				await setupAudio(deviceId, (data) => {
					if (ws?.readyState === WebSocket.OPEN) {
						ws.send(new Uint8Array(data));
					}
				});

				isRunning = true;
				transcriptionStore.start();
				transcriptionStore.setStatus('live', 'Live');
				transcriptionStore.setPreview('Listening...');
			} catch (error) {
				const code = (error as Error).message as AudioError;
				const message = AUDIO_ERRORS[code] || (error as Error).message;
				transcriptionStore.setError(message);
				stop();
			}
		};

		ws.onmessage = (event) => {
			try {
				const message: GladiaMessage = JSON.parse(event.data);
				const text = extractText(message, Boolean(settings.translateTo));
				if (text) {
					transcriptionStore.setPreview(text);
					void broadcast(text);
				}
			} catch {
				// Non-transcript messages (ping, etc.) are expected - ignore silently
			}
		};

		ws.onerror = () => {
			transcriptionStore.setError('Connection failed');
			stop();
		};

		ws.onclose = (event) => {
			if (isRunning && event.code !== 1000) {
				transcriptionStore.setError(`Disconnected (code: ${event.code})`);
			}
			stop();
		};
	} catch (error) {
		transcriptionStore.setError((error as Error).message);
		throw error;
	}
}

export function stop(): void {
	stopAudio();
	ws?.close();
	ws = null;
	isRunning = false;
	transcriptionStore.stop();
	transcriptionStore.setStatus('idle', 'Ready');
	transcriptionStore.setPreview('Click "Start Transcription" to begin');
}

export async function restart(settings: Settings, deviceId: string | null): Promise<void> {
	stop();
	await new Promise((r) => setTimeout(r, 200));
	await start(settings, deviceId);
}

export function getIsRunning(): boolean {
	return isRunning;
}
