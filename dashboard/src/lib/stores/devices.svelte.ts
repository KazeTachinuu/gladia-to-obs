/**
 * Audio Devices Store
 *
 * Manages the list of available audio input devices and the selected device.
 */

export type AudioDevice = {
	deviceId: string;
	label: string;
};

let devices = $state<AudioDevice[]>([]);
let selectedDeviceId = $state<string>('');

/**
 * Load available audio devices
 */
export async function loadDevices() {
	try {
		// Request microphone permission first
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		stream.getTracks().forEach(track => track.stop());

		// Get device list
		const deviceList = await navigator.mediaDevices.enumerateDevices();
		const audioInputs = deviceList
			.filter(device => device.kind === 'audioinput')
			.map((device, index) => ({
				deviceId: device.deviceId,
				label: device.label || `Microphone ${index + 1}`
			}));

		devices = audioInputs;

		// Set default device if not already set
		if (!selectedDeviceId && audioInputs.length > 0) {
			selectedDeviceId = audioInputs[0].deviceId;
		}
	} catch (error) {
		console.error('Failed to load audio devices:', error);
		devices = [{ deviceId: '', label: 'Default' }];
	}
}

/**
 * Listen for device changes
 */
if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
	navigator.mediaDevices.addEventListener('devicechange', loadDevices);
}

export const devicesStore = {
	get devices() {
		return devices;
	},
	get selectedDeviceId() {
		return selectedDeviceId;
	},
	set selectedDeviceId(value: string) {
		selectedDeviceId = value;
	},
	loadDevices
};
