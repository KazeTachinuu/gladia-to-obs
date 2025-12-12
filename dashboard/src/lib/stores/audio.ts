/**
 * Audio State Management
 *
 * Handles audio capture, processing, and WebSocket connection.
 */

/**
 * AudioWorklet Processor Code
 * This runs in the browser's audio thread to resample microphone input to 16kHz PCM.
 */
const AUDIO_PROCESSOR = `
/**
 * PCM Processor - Resamples audio to 16kHz 16-bit PCM
 * Runs in AudioWorkletGlobalScope
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(0);
  }

  /**
   * Process audio samples from the input
   * @param {Float32Array[][]} inputs - Input audio channels
   * @returns {boolean} - True to keep processor alive
   */
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const samples = input[0];

    // Resample from device sample rate to 16kHz
    const ratio = sampleRate / 16000;
    const outputLen = Math.floor(samples.length / ratio);
    const pcm = new Int16Array(outputLen);

    // Linear interpolation for resampling
    for (let i = 0; i < outputLen; i++) {
      const srcIdx = i * ratio;
      const floor = Math.floor(srcIdx);
      const frac = srcIdx - floor;
      const s1 = samples[floor] || 0;
      const s2 = samples[floor + 1] || s1;
      const sample = s1 + frac * (s2 - s1);
      // Convert float [-1, 1] to 16-bit signed integer
      pcm[i] = Math.round(Math.max(-1, Math.min(1, sample)) * 32767);
    }

    // Send PCM data to main thread
    this.port.postMessage(pcm.buffer, [pcm.buffer]);
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
`;

class AudioStore {
	running = $state(false);
	audioContext = $state<AudioContext | null>(null);
	mediaStream = $state<MediaStream | null>(null);
	workletNode = $state<AudioWorkletNode | null>(null);
	wsConnection = $state<WebSocket | null>(null);

	/**
	 * Setup audio pipeline: MediaStream -> AudioWorklet -> WebSocket
	 */
	async setupAudio(audioSourceId: string, ws: WebSocket) {
		// Check for browser support
		if (!navigator.mediaDevices?.getUserMedia) {
			throw new Error('MEDIA_NOT_SUPPORTED');
		}
		if (!window.AudioWorklet) {
			throw new Error('WORKLET_NOT_SUPPORTED');
		}

		// Create audio context
		this.audioContext = new AudioContext();

		// Configure audio constraints
		const constraints: MediaStreamConstraints = {
			audio: {
				channelCount: 1,
				echoCancellation: true,
				noiseSuppression: true
			} as MediaTrackConstraints
		};

		// Set device if specified
		if (audioSourceId) {
			(constraints.audio as MediaTrackConstraints).deviceId = { exact: audioSourceId };
		}

		// Get media stream
		try {
			this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
		} catch (error) {
			const err = error as DOMException;
			if (err.name === 'NotAllowedError') throw new Error('MIC_DENIED');
			if (err.name === 'NotFoundError') throw new Error('MIC_NOT_FOUND');
			throw new Error('MIC_ERROR');
		}

		// Load AudioWorklet module
		const blob = new Blob([AUDIO_PROCESSOR], { type: 'application/javascript' });
		const url = URL.createObjectURL(blob);
		await this.audioContext.audioWorklet.addModule(url);
		URL.revokeObjectURL(url);

		// Create worklet node and connect to WebSocket
		this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');
		this.workletNode.port.onmessage = (e) => {
			if (ws?.readyState === WebSocket.OPEN) {
				ws.send(new Uint8Array(e.data));
			}
		};

		// Connect audio pipeline: MediaStream -> Worklet
		this.audioContext.createMediaStreamSource(this.mediaStream).connect(this.workletNode);

		this.wsConnection = ws;
		this.running = true;
	}

	/**
	 * Cleanup audio resources
	 */
	cleanup() {
		// Disconnect worklet
		this.workletNode?.disconnect();

		// Close audio context
		this.audioContext?.close().catch(() => {});

		// Stop media stream tracks
		this.mediaStream?.getTracks().forEach((track) => track.stop());

		// Close WebSocket
		if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
			this.wsConnection.close();
		}

		// Reset state
		this.audioContext = null;
		this.mediaStream = null;
		this.workletNode = null;
		this.wsConnection = null;
		this.running = false;
	}
}

export const audio = new AudioStore();
