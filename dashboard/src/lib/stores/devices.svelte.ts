export type AudioDevice = { deviceId: string; label: string };

let devices = $state<AudioDevice[]>([]);
let selectedDeviceId = $state<string>('');

export async function loadDevices() {
	try {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		stream.getTracks().forEach((track) => track.stop());

		const deviceList = await navigator.mediaDevices.enumerateDevices();
		devices = deviceList
			.filter((d) => d.kind === 'audioinput')
			.map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` }));

		if (!selectedDeviceId && devices.length > 0) selectedDeviceId = devices[0].deviceId;
	} catch {
		devices = [{ deviceId: '', label: 'Default' }];
	}
}

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
