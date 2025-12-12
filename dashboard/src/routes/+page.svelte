<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Mic, Play, Square, AlertCircle } from 'lucide-svelte';

	// UI Components
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Accordion from '$lib/components/ui/accordion';

	// Custom Components
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import PasswordInput from '$lib/components/PasswordInput.svelte';
	import PositionPicker from '$lib/components/PositionPicker.svelte';
	import SliderWithValue from '$lib/components/SliderWithValue.svelte';
	import CodeBlock from '$lib/components/CodeBlock.svelte';

	// Stores
	import { devicesStore } from '$lib/stores/devices.svelte';
	import { transcriptionStore } from '$lib/stores/transcription.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	// Audio processor code
	const AUDIO_PROCESSOR = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(0);
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

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

	// State
	const { settings } = $derived(settingsStore);
	const { state } = $derived(transcriptionStore);
	const { devices } = $derived(devicesStore);

	let isRunning = $state(false);
	let settingsChanged = $state(false);
	let networkUrl = $state('Detecting...');

	// Get current port from browser location (default 8080)
	const port = typeof window !== 'undefined' ? (window.location.port || '8080') : '8080';
	const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';
	const localOverlayUrl = `${baseUrl}/overlay`;

	// Audio/WebSocket state (not reactive)
	let ws: WebSocket | null = null;
	let audioContext: AudioContext | null = null;
	let audioStream: MediaStream | null = null;
	let workletNode: AudioWorkletNode | null = null;

	// Language options
	const languages = [
		{ value: 'fr', label: 'French' },
		{ value: 'en', label: 'English' },
		{ value: 'es', label: 'Spanish' },
		{ value: 'de', label: 'German' },
		{ value: 'it', label: 'Italian' },
		{ value: 'pt', label: 'Portuguese' },
		{ value: 'ja', label: 'Japanese' },
		{ value: 'zh', label: 'Chinese' },
		{ value: 'ko', label: 'Korean' },
		{ value: 'ar', label: 'Arabic' }
	];

	const translateOptions = [
		{ value: '', label: 'No translation' },
		...languages
	];

	// Helper functions
	function getResponseSpeedHint(value: number): string {
		if (value <= 0.1) return 'Very fast';
		if (value <= 0.3) return 'Fast';
		if (value <= 0.5) return 'Balanced';
		if (value <= 1) return 'Natural';
		return 'Slow';
	}

	function getMaxSegmentHint(value: number): string {
		if (value <= 10) return 'Short';
		if (value <= 20) return 'Medium';
		if (value <= 40) return 'Long';
		return 'Very long';
	}

	// Network IP detection via server endpoint
	async function detectNetworkIP() {
		try {
			const response = await fetch(`${baseUrl}/network-ip`);
			const data = await response.json();
			if (data.ip) {
				networkUrl = `http://${data.ip}:${port}/overlay`;
			} else {
				networkUrl = 'Unavailable';
			}
		} catch {
			networkUrl = 'Unavailable';
		}
	}

	// API calls
	async function sendStyle() {
		try {
			await fetch(`${baseUrl}/style`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fontSize: settings.fontSize,
					posX: settings.positionX,
					posY: settings.positionY,
					bgStyle: settings.bgStyle
				})
			});
		} catch (error) {
			console.error('Failed to send style:', error);
		}
	}

	async function broadcast(text: string) {
		try {
			await fetch(`${baseUrl}/broadcast`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text })
			});
		} catch (error) {
			console.error('Failed to broadcast:', error);
		}
	}

	// Audio setup
	async function setupAudio(): Promise<void> {
		if (!navigator.mediaDevices?.getUserMedia) {
			throw new Error('MEDIA_NOT_SUPPORTED');
		}
		if (!window.AudioWorklet) {
			throw new Error('WORKLET_NOT_SUPPORTED');
		}

		audioContext = new AudioContext();

		const constraints: MediaStreamConstraints = {
			audio: {
				channelCount: 1,
				echoCancellation: true,
				noiseSuppression: true,
				...(devicesStore.selectedDeviceId && {
					deviceId: { exact: devicesStore.selectedDeviceId }
				})
			}
		};

		try {
			audioStream = await navigator.mediaDevices.getUserMedia(constraints);
		} catch (error: any) {
			if (error.name === 'NotAllowedError') throw new Error('MIC_DENIED');
			if (error.name === 'NotFoundError') throw new Error('MIC_NOT_FOUND');
			throw new Error('MIC_ERROR');
		}

		// Load audio worklet
		const blob = new Blob([AUDIO_PROCESSOR], { type: 'application/javascript' });
		const url = URL.createObjectURL(blob);
		await audioContext.audioWorklet.addModule(url);
		URL.revokeObjectURL(url);

		// Create worklet node
		workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
		workletNode.port.onmessage = (event) => {
			if (ws?.readyState === WebSocket.OPEN) {
				ws.send(new Uint8Array(event.data));
			}
		};

		// Connect audio
		audioContext.createMediaStreamSource(audioStream).connect(workletNode);
	}

	// Stop audio
	function stopAudio() {
		workletNode?.disconnect();
		audioContext?.close().catch(() => {});
		audioStream?.getTracks().forEach((track) => track.stop());

		ws?.close();

		workletNode = null;
		audioContext = null;
		audioStream = null;
		ws = null;
	}

	// Start transcription
	async function startTranscription() {
		const apiKey = settings.apiKey.trim();
		if (!apiKey) {
			transcriptionStore.setError('API key required');
			toast.error('Please enter your Gladia API key');
			return;
		}

		transcriptionStore.setStatus('connecting', 'Connecting...');
		transcriptionStore.setPreview('Connecting to Gladia...');

		try {
			// Build request body
			const body: any = {
				encoding: 'wav/pcm',
				sample_rate: 16000,
				bit_depth: 16,
				channels: 1,
				endpointing: settings.silenceThreshold,
				maximum_duration_without_endpointing: settings.maxDuration,
				language_config: { languages: [settings.language] }
			};

			// Add vocabulary if provided
			const words = settings.vocabulary
				.split(/[,;]+/)
				.map((w) => w.trim())
				.filter((w) => w);

			if (words.length > 0) {
				body.realtime_processing = {
					custom_vocabulary: true,
					custom_vocabulary_config: { vocabulary: words }
				};
			}

			// Add translation if selected
			if (settings.translateTo) {
				body.realtime_processing = body.realtime_processing || {};
				body.realtime_processing.translation = true;
				body.realtime_processing.translation_config = {
					target_languages: [settings.translateTo],
					model: 'enhanced'
				};
			}

			// Create Gladia session
			const response = await fetch('https://api.gladia.io/v2/live', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-gladia-key': apiKey
				},
				body: JSON.stringify(body)
			});

			if (!response.ok) {
				if (response.status === 401) throw new Error('Invalid API key');
				if (response.status === 402) throw new Error('Insufficient credits');
				throw new Error(`API error: ${response.status}`);
			}

			const { url } = await response.json();

			// Connect WebSocket
			ws = new WebSocket(url);

			ws.onopen = async () => {
				try {
					transcriptionStore.setPreview('Initializing audio...');
					await setupAudio();

					isRunning = true;
					settingsChanged = false;
					transcriptionStore.start();
					transcriptionStore.setStatus('live', 'Live');
					transcriptionStore.setPreview('Listening...');
					toast.success('Transcription started');
				} catch (error: any) {
					const errorMessages: Record<string, string> = {
						MIC_DENIED: 'Microphone access denied. Please allow microphone access in your browser settings.',
						MIC_NOT_FOUND: 'No microphone found. Please connect a microphone.',
						MEDIA_NOT_SUPPORTED: 'Browser not supported. Please use Chrome, Edge, or Safari.',
						WORKLET_NOT_SUPPORTED: 'Browser outdated. Please update your browser.'
					};

					const message = errorMessages[error.message] || error.message;
					transcriptionStore.setError(message);
					toast.error(message);
					stopTranscription();
				}
			};

			ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data);
					let text: string | null = null;

					if (message.type === 'translation' && message.data?.translated_utterance?.text) {
						text = message.data.translated_utterance.text.trim();
					} else if (
						message.type === 'transcript' &&
						message.data?.utterance?.text &&
						message.data.is_final &&
						!settings.translateTo
					) {
						text = message.data.utterance.text.trim();
					}

					if (text) {
						transcriptionStore.setPreview(text);
						broadcast(text);
					}
				} catch (error) {
					console.error('Failed to parse message:', error);
				}
			};

			ws.onerror = () => {
				transcriptionStore.setError('Connection failed');
				toast.error('Connection to Gladia failed');
				stopTranscription();
			};

			ws.onclose = (event) => {
				if (isRunning && event.code !== 1000) {
					transcriptionStore.setError(`Disconnected (code: ${event.code})`);
					toast.error('Connection lost');
				}
				stopTranscription();
			};
		} catch (error: any) {
			transcriptionStore.setError(error.message);
			toast.error(error.message);
		}
	}

	// Stop transcription
	function stopTranscription() {
		stopAudio();
		isRunning = false;
		settingsChanged = false;
		transcriptionStore.stop();
		transcriptionStore.setStatus('idle', 'Ready');
		transcriptionStore.setPreview('Click "Start Transcription" to begin');
		toast.info('Transcription stopped');
	}

	// Restart transcription
	async function restartTranscription() {
		stopTranscription();
		await new Promise((resolve) => setTimeout(resolve, 300));
		startTranscription();
	}

	// Initialize
	onMount(() => {
		devicesStore.loadDevices();
		detectNetworkIP();
		sendStyle(); // Send initial style
	});

	// Called when a setting that requires restart is changed
	function onRestartSettingChange() {
		if (isRunning) {
			settingsChanged = true;
		}
	}

	// Called when a style setting is changed (no restart needed)
	function onStyleSettingChange() {
		sendStyle();
	}
</script>

<svelte:head>
	<title>Live Transcription Dashboard</title>
</svelte:head>

<!-- Header -->
<header class="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
		<div class="flex items-center gap-3">
			<Mic class="size-6" />
			<h1 class="text-lg font-semibold">Live Transcription</h1>
		</div>
		<StatusBadge status={state.status} text={state.statusText} />
	</div>
</header>

<!-- Main Content -->
<main class="container mx-auto max-w-6xl p-4 md:p-6">
	<div class="grid gap-6 md:grid-cols-[1fr_320px]">
		<!-- Left Column -->
		<div class="space-y-6">
			<!-- Controls Card -->
			<Card>
				<CardContent class="space-y-4 pt-6">
					<div class="grid gap-4 sm:grid-cols-2">
						<!-- Audio Source -->
						<div class="space-y-2">
							<Label>Audio Source</Label>
							<Select.Root
								type="single"
								bind:value={devicesStore.selectedDeviceId}
								onValueChange={() => onRestartSettingChange()}
							>
								<Select.Trigger class="w-full">
									{devices.find(d => d.deviceId === devicesStore.selectedDeviceId)?.label ?? 'Select device'}
								</Select.Trigger>
								<Select.Content>
									{#each devices as device}
										<Select.Item value={device.deviceId} label={device.label}>{device.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<!-- Language -->
						<div class="space-y-2">
							<Label>Language</Label>
							<Select.Root
								type="single"
								bind:value={settings.language}
								onValueChange={(v) => { settingsStore.update({ language: v }); onRestartSettingChange(); }}
							>
								<Select.Trigger class="w-full">
									{languages.find(l => l.value === settings.language)?.label ?? 'Select language'}
								</Select.Trigger>
								<Select.Content>
									{#each languages as lang}
										<Select.Item value={lang.value} label={lang.label}>{lang.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					</div>

					<!-- Translate To -->
					<div class="space-y-2">
						<Label>Translate to <span class="text-muted-foreground text-xs">(optional)</span></Label>
						<Select.Root
							type="single"
							bind:value={settings.translateTo}
							onValueChange={(v) => { settingsStore.update({ translateTo: v }); onRestartSettingChange(); }}
						>
							<Select.Trigger class="w-full">
								{translateOptions.find(t => t.value === settings.translateTo)?.label ?? 'No translation'}
							</Select.Trigger>
							<Select.Content>
								{#each translateOptions as option}
									<Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<!-- Start/Stop Button -->
					<Button
						variant={isRunning ? 'destructive' : 'default'}
						size="lg"
						class="w-full"
						onclick={isRunning ? stopTranscription : startTranscription}
					>
						{#if isRunning}
							<Square class="size-5" />
							Stop
						{:else}
							<Play class="size-5" />
							Start Transcription
						{/if}
					</Button>

					<!-- Feedback Banner -->
					{#if settingsChanged}
						<div class="flex items-center justify-between gap-3 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
							<div class="flex items-center gap-2">
								<AlertCircle class="size-4 text-yellow-500" />
								<span>Settings changed - Restart to apply</span>
							</div>
							<Button variant="secondary" size="sm" onclick={restartTranscription}>
								Restart now
							</Button>
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Preview Card -->
			<Card>
				<CardHeader>
					<div class="flex items-center justify-between">
						<CardTitle>Live Preview</CardTitle>
						<span class="font-mono text-sm tabular-nums">{state.elapsedTime}</span>
					</div>
				</CardHeader>
				<CardContent>
					<div class="bg-muted/50 min-h-[100px] rounded-md p-4 text-center {state.status === 'live' ? 'text-foreground' : 'text-muted-foreground'}">
						{#if state.status === 'error'}
							<div class="text-destructive">
								<strong>{state.errorMessage}</strong>
							</div>
						{:else}
							{state.previewText}
						{/if}
					</div>
				</CardContent>
			</Card>

			<!-- OBS Setup Card -->
			<Card>
				<CardHeader>
					<CardTitle>OBS Browser Source</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<CodeBlock value={localOverlayUrl} label="This computer" />
					<CodeBlock value={networkUrl} label="Network (same WiFi)" />
					<p class="text-muted-foreground text-xs">
						Set resolution to 1920×1080. <a href="{localOverlayUrl}?bg" target="_blank" class="text-primary hover:underline">Preview overlay</a>
					</p>
				</CardContent>
			</Card>
		</div>

		<!-- Right Column -->
		<div class="space-y-6">
			<!-- API Key Card -->
			<Card>
				<CardContent class="space-y-4 pt-6">
					<div class="space-y-2">
						<Label>API Key</Label>
						<PasswordInput
							bind:value={settings.apiKey}
							placeholder="Enter Gladia API key"
							onblur={() => settingsStore.update({ apiKey: settings.apiKey })}
						/>
					</div>
					<p class="text-muted-foreground text-xs">
						Get your key at <a href="https://gladia.io" target="_blank" class="text-primary hover:underline">gladia.io</a>
					</p>
				</CardContent>
			</Card>

			<!-- Display Card -->
			<Card>
				<CardHeader>
					<CardTitle>Display</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="space-y-2">
						<Label>Position</Label>
						<PositionPicker
							bind:posX={settings.positionX}
							bind:posY={settings.positionY}
							onchange={() => { settingsStore.update({ positionX: settings.positionX, positionY: settings.positionY }); onStyleSettingChange(); }}
						/>
					</div>

					<SliderWithValue
						bind:value={settings.fontSize}
						min={24}
						max={80}
						step={2}
						label="Size"
						unit="px"
						onchange={() => { settingsStore.update({ fontSize: settings.fontSize }); onStyleSettingChange(); }}
					/>

					<div class="space-y-2">
						<Label>Style</Label>
						<Select.Root
							type="single"
							bind:value={settings.bgStyle}
							onValueChange={(v) => { settingsStore.update({ bgStyle: v as 'none' | 'box' }); onStyleSettingChange(); }}
						>
							<Select.Trigger class="w-full">
								{settings.bgStyle === 'none' ? 'Outline (Netflix style)' : 'Background box'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="none" label="Outline (Netflix style)">Outline (Netflix style)</Select.Item>
								<Select.Item value="box" label="Background box">Background box</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				</CardContent>
			</Card>

			<!-- Advanced Settings -->
			<Accordion.Root type="single" collapsible>
				<Accordion.Item value="advanced">
					<Card>
						<Accordion.Trigger class="px-6 py-4 hover:no-underline">
							<CardTitle>Advanced</CardTitle>
						</Accordion.Trigger>
						<Accordion.Content>
							<CardContent class="space-y-4 pt-2">
								<SliderWithValue
									bind:value={settings.silenceThreshold}
									min={0.01}
									max={2}
									step={0.01}
									label="Response speed"
									unit="s"
									hint={getResponseSpeedHint}
									onchange={() => { settingsStore.update({ silenceThreshold: settings.silenceThreshold }); onRestartSettingChange(); }}
								/>

								<SliderWithValue
									bind:value={settings.maxDuration}
									min={5}
									max={60}
									step={1}
									label="Max segment"
									unit="s"
									hint={getMaxSegmentHint}
									onchange={() => { settingsStore.update({ maxDuration: settings.maxDuration }); onRestartSettingChange(); }}
								/>

								<div class="space-y-2">
									<Label>Custom vocabulary</Label>
									<Textarea
										bind:value={settings.vocabulary}
										rows={2}
										placeholder="Names, brands, technical terms..."
										onblur={() => { settingsStore.update({ vocabulary: settings.vocabulary }); onRestartSettingChange(); }}
									/>
									<p class="text-muted-foreground text-xs">Separate words with commas</p>
								</div>
							</CardContent>
						</Accordion.Content>
					</Card>
				</Accordion.Item>
			</Accordion.Root>
		</div>
	</div>
</main>
