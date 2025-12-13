<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Mic } from 'lucide-svelte';

	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import {
		ControlsCard,
		PreviewCard,
		OBSSetupCard,
		ApiKeyCard,
		DisplayCard,
		AdvancedCard,
		VocabularyCard,
	} from '$lib/components/cards';

	import { api } from '$lib/api/client';
	import { devicesStore } from '$lib/stores/devices.svelte';
	import { transcriptionStore } from '$lib/stores/transcription.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import * as transcription from '$lib/services/transcription.svelte';

	const { settings } = $derived(settingsStore);
	const transcriptionState = $derived(transcriptionStore.state);

	let isRunning = $state(false);
	let settingsChanged = $state(false);
	let networkUrl = $state('Detecting...');

	const baseUrl = api.getBaseUrl();
	const port = api.getPort();
	const localOverlayUrl = `${baseUrl}/overlay`;

	async function detectNetworkIP() {
		try {
			const data = await api.get<{ ip: string | null }>('/network-ip');
			networkUrl = data.ip ? `http://${data.ip}:${port}/overlay` : 'Unavailable';
		} catch {
			networkUrl = 'Unavailable';
		}
	}

	async function sendStyle() {
		try {
			await api.post('/style', {
				fontSize: settings.fontSize,
				posX: settings.positionX,
				posY: settings.positionY,
				bgStyle: settings.bgStyle,
			});
		} catch {
			// Style sync is non-critical
		}
	}

	async function handleStart() {
		try {
			await transcription.start(settings, devicesStore.selectedDeviceId);
			isRunning = true;
			settingsChanged = false;
			toast.success('Transcription started');
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	function handleStop() {
		transcription.stop();
		isRunning = false;
		settingsChanged = false;
		toast.info('Transcription stopped');
	}

	async function handleRestart() {
		try {
			await transcription.restart(settings, devicesStore.selectedDeviceId);
			isRunning = true;
			settingsChanged = false;
			toast.success('Transcription restarted');
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	function onRestartSettingChange() {
		if (isRunning) settingsChanged = true;
	}

	onMount(() => {
		devicesStore.loadDevices();
		void detectNetworkIP();
		void sendStyle();
	});
</script>

<svelte:head>
	<title>Live Transcription Dashboard</title>
</svelte:head>

<header
	class="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<div class="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
		<div class="flex items-center gap-3">
			<Mic class="size-6" />
			<h1 class="text-lg font-semibold">Live Transcription</h1>
		</div>
		<StatusBadge status={transcriptionState.status} text={transcriptionState.statusText} />
	</div>
</header>

<main class="container mx-auto max-w-6xl p-4 md:p-6">
	<div class="grid gap-6 md:grid-cols-[1fr_320px]">
		<!-- Left Column -->
		<div class="space-y-6">
			<ControlsCard
				{isRunning}
				{settingsChanged}
				onStart={handleStart}
				onStop={handleStop}
				onRestart={handleRestart}
				onSettingChange={onRestartSettingChange}
			/>
			<PreviewCard />
			<OBSSetupCard localUrl={localOverlayUrl} {networkUrl} />
			<VocabularyCard onSettingChange={onRestartSettingChange} />
		</div>

		<!-- Right Column -->
		<div class="space-y-6">
			<ApiKeyCard />
			<DisplayCard onStyleChange={sendStyle} />
			<AdvancedCard onSettingChange={onRestartSettingChange} />
		</div>
	</div>
</main>
