export const AUDIO_PROCESSOR = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(0);
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const samples = input[0];

    // Resample to 16kHz
    const ratio = sampleRate / 16000;
    const outputLen = Math.floor(samples.length / ratio);
    const pcm = new Int16Array(outputLen);

    for (let i = 0; i < outputLen; i++) {
      const srcIdx = i * ratio;
      const floor = Math.floor(srcIdx);
      const frac = srcIdx - floor;
      const s1 = samples[floor] || 0;
      const s2 = samples[floor + 1] || s1;
      const sample = s1 + frac * (s2 - s1);
      pcm[i] = Math.round(Math.max(-1, Math.min(1, sample)) * 32767);
    }

    this.port.postMessage(pcm.buffer, [pcm.buffer]);
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
`;
