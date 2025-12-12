/**
 * Transcription State Management
 *
 * Manages transcription session state, status, and text output.
 */

export type TranscriptionStatus = 'idle' | 'connecting' | 'live' | 'error' | 'reconnecting';

class TranscriptionStore {
	status = $state<TranscriptionStatus>('idle');
	currentText = $state('');
	startTime = $state<number | null>(null);
	reconnectAttempts = $state(0);

	// Derived state
	elapsed = $derived.by(() => {
		if (!this.startTime) return 0;
		return Date.now() - this.startTime;
	});

	formattedTime = $derived.by(() => {
		const seconds = Math.floor(this.elapsed / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
	});

	/**
	 * Update status
	 */
	updateStatus(newStatus: TranscriptionStatus) {
		this.status = newStatus;
	}

	/**
	 * Broadcast text to overlay via API
	 */
	async broadcast(text: string) {
		this.currentText = text;

		try {
			await fetch('/broadcast', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text })
			});
		} catch (error) {
			console.error('Failed to broadcast text:', error);
		}
	}

	/**
	 * Start a new session
	 */
	start() {
		this.startTime = Date.now();
		this.currentText = '';
		this.status = 'connecting';
		this.reconnectAttempts = 0;
	}

	/**
	 * Reset to idle state
	 */
	reset() {
		this.status = 'idle';
		this.currentText = '';
		this.startTime = null;
		this.reconnectAttempts = 0;
	}

	/**
	 * Increment reconnect attempts
	 */
	incrementReconnect() {
		this.reconnectAttempts++;
	}

	/**
	 * Reset reconnect attempts
	 */
	resetReconnect() {
		this.reconnectAttempts = 0;
	}
}

export const transcription = new TranscriptionStore();
