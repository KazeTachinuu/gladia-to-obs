import { AUDIO_PROCESSOR_CODE } from '$lib/config/constants';

export type AudioError = 'MIC_DENIED' | 'MIC_NOT_FOUND' | 'MIC_ERROR' | 'NOT_SUPPORTED';

export const AUDIO_ERRORS: Record<AudioError, string> = {
	MIC_DENIED: 'Microphone access denied. Please allow microphone access in your browser settings.',
	MIC_NOT_FOUND: 'No microphone found. Please connect a microphone.',
	MIC_ERROR: 'Failed to access microphone.',
	NOT_SUPPORTED: 'Browser not supported. Please use Chrome, Edge, or Safari.',
};

type AudioState = {
	context: AudioContext | null;
	stream: MediaStream | null;
	worklet: AudioWorkletNode | null;
};

let state: AudioState = { context: null, stream: null, worklet: null };

export async function setupAudio(
	deviceId: string | null,
	onData: (data: ArrayBuffer) => void
): Promise<void> {
	if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorklet) {
		throw new Error('NOT_SUPPORTED');
	}

	state.context = new AudioContext();

	const constraints: MediaStreamConstraints = {
		audio: {
			channelCount: 1,
			echoCancellation: true,
			noiseSuppression: true,
			...(deviceId && { deviceId: { exact: deviceId } }),
		},
	};

	try {
		state.stream = await navigator.mediaDevices.getUserMedia(constraints);
	} catch (error: unknown) {
		const err = error as { name?: string };
		if (err.name === 'NotAllowedError') throw new Error('MIC_DENIED');
		if (err.name === 'NotFoundError') throw new Error('MIC_NOT_FOUND');
		throw new Error('MIC_ERROR');
	}

	// Load audio worklet
	const blob = new Blob([AUDIO_PROCESSOR_CODE], { type: 'application/javascript' });
	const url = URL.createObjectURL(blob);
	await state.context.audioWorklet.addModule(url);
	URL.revokeObjectURL(url);

	// Create worklet node
	state.worklet = new AudioWorkletNode(state.context, 'pcm-processor');
	state.worklet.port.onmessage = (event) => onData(event.data);

	// Connect audio pipeline
	state.context.createMediaStreamSource(state.stream).connect(state.worklet);
}

export function stopAudio(): void {
	state.worklet?.disconnect();
	state.context?.close().catch(() => {});
	state.stream?.getTracks().forEach((t) => t.stop());
	state = { context: null, stream: null, worklet: null };
}
