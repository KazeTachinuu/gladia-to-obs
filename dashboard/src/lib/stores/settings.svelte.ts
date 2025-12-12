/**
 * Settings Store
 *
 * Manages all user settings with localStorage persistence.
 */

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

const defaultSettings: Settings = {
	apiKey: '',
	language: 'fr',
	translateTo: '',
	silenceThreshold: 0.05,
	maxDuration: 5,
	vocabulary: '',
	fontSize: 52,
	positionX: 50,
	positionY: 85,
	bgStyle: 'none'
};

// Load from localStorage
function loadFromStorage(): Settings {
	if (typeof window === 'undefined') return defaultSettings;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return defaultSettings;
		return { ...defaultSettings, ...JSON.parse(stored) };
	} catch {
		return defaultSettings;
	}
}

// Save to localStorage
function saveToStorage(settings: Settings) {
	if (typeof window === 'undefined') return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch (error) {
		console.error('Failed to save settings:', error);
	}
}

let settings = $state<Settings>(loadFromStorage());

export const settingsStore = {
	get settings() {
		return settings;
	},

	update(partial: Partial<Settings>) {
		settings = { ...settings, ...partial };
		saveToStorage(settings);
	},

	reset() {
		settings = { ...defaultSettings };
		saveToStorage(settings);
	}
};
