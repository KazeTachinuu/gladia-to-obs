/**
 * Configuration Store
 *
 * Persisted configuration with localStorage.
 * Settings that persist across sessions.
 */

const STORAGE_KEY = 'transcription_config';

interface Config {
	apiKey: string;
	audioSource: string;
	language: string;
	translateTo: string;
	silenceThreshold: number;
	maxDuration: number;
	vocabulary: string;
	fontSize: number;
	posX: number;
	posY: number;
	bgStyle: 'none' | 'box';
}

class ConfigStore {
	apiKey = $state('');
	audioSource = $state('');
	language = $state('fr');
	translateTo = $state('');
	silenceThreshold = $state(0.05);
	maxDuration = $state(5);
	vocabulary = $state('');
	fontSize = $state(52);
	posX = $state(50);
	posY = $state(85);
	bgStyle = $state<'none' | 'box'>('none');

	constructor() {
		// Load configuration on initialization (client-side only)
		if (typeof window !== 'undefined') {
			this.loadConfig();
		}
	}

	/**
	 * Load saved configuration from localStorage
	 */
	loadConfig() {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (!saved) return;

			const config = JSON.parse(saved) as Partial<Config>;

			if (config.apiKey !== undefined) this.apiKey = config.apiKey;
			if (config.audioSource !== undefined) this.audioSource = config.audioSource;
			if (config.language !== undefined) this.language = config.language;
			if (config.translateTo !== undefined) this.translateTo = config.translateTo;
			if (config.silenceThreshold !== undefined)
				this.silenceThreshold = config.silenceThreshold;
			if (config.maxDuration !== undefined) this.maxDuration = config.maxDuration;
			if (config.vocabulary !== undefined) this.vocabulary = config.vocabulary;
			if (config.fontSize !== undefined) this.fontSize = config.fontSize;
			if (config.posX !== undefined) this.posX = config.posX;
			if (config.posY !== undefined) this.posY = config.posY;
			if (config.bgStyle !== undefined) this.bgStyle = config.bgStyle;
		} catch (error) {
			console.error('Failed to load config:', error);
		}
	}

	/**
	 * Save current configuration to localStorage
	 */
	saveConfig() {
		try {
			const config: Config = {
				apiKey: this.apiKey,
				audioSource: this.audioSource,
				language: this.language,
				translateTo: this.translateTo,
				silenceThreshold: this.silenceThreshold,
				maxDuration: this.maxDuration,
				vocabulary: this.vocabulary,
				fontSize: this.fontSize,
				posX: this.posX,
				posY: this.posY,
				bgStyle: this.bgStyle
			};

			localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
		} catch (error) {
			console.error('Failed to save config:', error);
		}
	}

	/**
	 * Update position and save
	 */
	setPosition(x: number, y: number) {
		this.posX = x;
		this.posY = y;
		this.saveConfig();
	}

	/**
	 * Send style updates to overlay via API
	 */
	async sendStyle() {
		try {
			await fetch('/style', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fontSize: this.fontSize,
					posX: this.posX,
					posY: this.posY,
					bgStyle: this.bgStyle
				})
			});
		} catch (error) {
			console.error('Failed to send style update:', error);
		}
	}
}

export const config = new ConfigStore();
