/**
 * Audio Devices Management
 *
 * Enumerates and manages audio input devices.
 */

interface AudioDevice {
	deviceId: string;
	label: string;
}

class DevicesStore {
	devices = $state<AudioDevice[]>([]);
	isLoading = $state(false);
	error = $state<string | null>(null);

	/**
	 * Load available audio input devices
	 */
	async loadDevices() {
		this.isLoading = true;
		this.error = null;

		try {
			// Request permission first
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			stream.getTracks().forEach((track) => track.stop());

			// Enumerate devices
			const allDevices = await navigator.mediaDevices.enumerateDevices();
			const audioInputs = allDevices.filter((d) => d.kind === 'audioinput');

			// Map to simpler format
			this.devices = audioInputs.map((d, i) => ({
				deviceId: d.deviceId,
				label: d.label || `Mic ${i + 1}`
			}));
		} catch (error) {
			console.error('Failed to enumerate devices:', error);
			this.error = 'Failed to load audio devices';
			// Fallback to default device
			this.devices = [{ deviceId: '', label: 'Default' }];
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Watch for device changes (plug/unplug)
	 */
	watchDeviceChanges() {
		if (!navigator.mediaDevices?.addEventListener) return;

		navigator.mediaDevices.addEventListener('devicechange', () => {
			this.loadDevices();
		});
	}

	/**
	 * Initialize devices - load and watch for changes
	 */
	async initialize() {
		await this.loadDevices();
		this.watchDeviceChanges();
	}
}

export const devices = new DevicesStore();
