type Status = 'idle' | 'connecting' | 'live' | 'error';

let state = $state({
	status: 'idle' as Status,
	statusText: 'Ready',
	previewText: 'Click "Start Transcription" to begin',
	errorMessage: null as string | null,
	startTime: null as number | null,
	elapsedTime: '00:00'
});

let timer: ReturnType<typeof setInterval> | null = null;

const updateTimer = () => {
	if (!state.startTime) return;
	const s = Math.floor((Date.now() - state.startTime) / 1000);
	state.elapsedTime = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export const transcriptionStore = {
	get state() {
		return state;
	},
	setStatus(status: Status, text: string) {
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
		if (timer) clearInterval(timer);
		timer = setInterval(updateTimer, 1000);
	},
	stop() {
		if (timer) clearInterval(timer);
		timer = null;
		state.startTime = null;
		state.elapsedTime = '00:00';
	},
	reset() {
		if (timer) clearInterval(timer);
		timer = null;
		state = {
			status: 'idle',
			statusText: 'Ready',
			previewText: 'Click "Start Transcription" to begin',
			errorMessage: null,
			startTime: null,
			elapsedTime: '00:00'
		};
	}
};
