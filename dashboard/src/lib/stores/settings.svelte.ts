const STORAGE_KEY = 'transcription_config';

export type Settings = {
	apiKey: string;
	language: string;
	translateTo: string;
	silenceThreshold: number;
	maxDuration: number;
	vocabulary: string;
	fontSize: number;
	positionX: number;
	positionY: number;
	bgStyle: 'none' | 'box';
};

const defaults: Settings = {
	apiKey: '',
	language: 'auto',
	translateTo: '',
	silenceThreshold: 0.05,
	maxDuration: 5,
	vocabulary: '',
	fontSize: 52,
	positionX: 50,
	positionY: 85,
	bgStyle: 'none'
};

const load = (): Settings => {
	if (typeof window === 'undefined') return defaults;
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
	} catch {
		return defaults;
	}
};

const save = (s: Settings) => {
	if (typeof window !== 'undefined') {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
		} catch {}
	}
};

let settings = $state<Settings>(load());

export const settingsStore = {
	get settings() {
		return settings;
	},
	update(partial: Partial<Settings>) {
		settings = { ...settings, ...partial };
		save(settings);
	},
	reset() {
		settings = { ...defaults };
		save(settings);
	}
};
