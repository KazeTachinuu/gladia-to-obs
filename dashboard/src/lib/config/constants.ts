// Audio encoding settings for Gladia API
export const AUDIO = {
	SAMPLE_RATE: 16000,
	BIT_DEPTH: 16,
	CHANNELS: 1,
} as const;

// Language options
export const LANGUAGES = [
	{ value: 'auto', label: 'Automatic (detect language)' },
	{ value: 'fr', label: 'French' },
	{ value: 'en', label: 'English' },
	{ value: 'es', label: 'Spanish' },
	{ value: 'de', label: 'German' },
	{ value: 'it', label: 'Italian' },
	{ value: 'pt', label: 'Portuguese' },
	{ value: 'ja', label: 'Japanese' },
	{ value: 'zh', label: 'Chinese' },
	{ value: 'ko', label: 'Korean' },
	{ value: 'ar', label: 'Arabic' },
] as const;

export const LANGUAGE_CODES = LANGUAGES.filter((l) => l.value !== 'auto').map((l) => l.value);

export const TRANSLATE_OPTIONS = [
	{ value: '', label: 'No translation' },
	...LANGUAGES.filter((l) => l.value !== 'auto'),
] as const;

// Gladia API
export const GLADIA_API_URL = 'https://api.gladia.io/v2/live';

// PCM Audio processor (runs in AudioWorklet)
export const AUDIO_PROCESSOR_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input?.[0]) return true;

    const samples = input[0];
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
