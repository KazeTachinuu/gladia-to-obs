/**
 * AudioWorklet Processor
 *
 * This code runs in the browser's audio thread to capture and resample
 * microphone input to 16kHz PCM for the Gladia API.
 *
 * It's embedded as a string and loaded dynamically via Blob URL
 * since AudioWorklet modules must be loaded from a URL.
 */

export const AUDIO_PROCESSOR = `
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
