/**
 * Transcription State Store
 *
 * Manages the global state for the transcription session.
 */

type TranscriptionStatus = 'idle' | 'connecting' | 'live' | 'error';

export type TranscriptionState = {
	status: TranscriptionStatus;
	statusText: string;
	previewText: string;
	errorMessage: string | null;
	startTime: number | null;
	elapsedTime: string;
};

let state = $state<TranscriptionState>({
	status: 'idle',
	statusText: 'Ready',
	previewText: 'Click "Start Transcription" to begin',
	errorMessage: null,
	startTime: null,
	elapsedTime: '00:00'
});

let timerInterval: ReturnType<typeof setInterval> | null = null;

function updateTimer() {
	if (!state.startTime) return;
	const seconds = Math.floor((Date.now() - state.startTime) / 1000);
	const minutes = Math.floor(seconds / 60);
	const secs = seconds % 60;
	state.elapsedTime = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const transcriptionStore = {
	get state() {
		return state;
	},

	setStatus(status: TranscriptionStatus, text: string) {
		state.status = status;
		state.statusText = text;
	},

	setPreview(text: string) {
		state.previewText = text;
	},

	setError(message: string) {
		state.status = 'error';
		state.statusText = 'Error';
		state.errorMessage = message;
	},

	start() {
		state.startTime = Date.now();
		state.elapsedTime = '00:00';
		if (timerInterval) clearInterval(timerInterval);
		timerInterval = setInterval(updateTimer, 1000);
	},

	stop() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
		state.startTime = null;
		state.elapsedTime = '00:00';
	},

	reset() {
		state = {
			status: 'idle',
			statusText: 'Ready',
			previewText: 'Click "Start Transcription" to begin',
			errorMessage: null,
			startTime: null,
			elapsedTime: '00:00'
		};
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}
};
