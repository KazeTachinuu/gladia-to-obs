<script lang="ts">
	import { Play, Square, AlertCircle } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { LANGUAGES, TRANSLATE_OPTIONS } from '$lib/config/constants';
	import { devicesStore } from '$lib/stores/devices.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	type Props = {
		isRunning: boolean;
		settingsChanged: boolean;
		onStart: () => void;
		onStop: () => void;
		onRestart: () => void;
		onSettingChange: () => void;
	};

	let { isRunning, settingsChanged, onStart, onStop, onRestart, onSettingChange }: Props =
		$props();

	const { settings } = $derived(settingsStore);
	const { devices } = $derived(devicesStore);
</script>

<Card>
	<CardContent class="space-y-4 pt-6">
		<div class="grid gap-4 sm:grid-cols-2">
			<!-- Audio Source -->
			<div class="space-y-2">
				<Label>Audio Source</Label>
				<Select.Root
					type="single"
					bind:value={devicesStore.selectedDeviceId}
					onValueChange={() => onSettingChange()}
				>
					<Select.Trigger class="w-full">
						{devices.find((d) => d.deviceId === devicesStore.selectedDeviceId)?.label ??
							'Select device'}
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
					onValueChange={(v) => {
						settingsStore.update({ language: v });
						onSettingChange();
					}}
				>
					<Select.Trigger class="w-full">
						{LANGUAGES.find((l) => l.value === settings.language)?.label ?? 'Select language'}
					</Select.Trigger>
					<Select.Content>
						{#each LANGUAGES as lang}
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
				onValueChange={(v) => {
					settingsStore.update({ translateTo: v });
					onSettingChange();
				}}
			>
				<Select.Trigger class="w-full">
					{TRANSLATE_OPTIONS.find((t) => t.value === settings.translateTo)?.label ??
						'No translation'}
				</Select.Trigger>
				<Select.Content>
					{#each TRANSLATE_OPTIONS as option}
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
			onclick={isRunning ? onStop : onStart}
		>
			{#if isRunning}
				<Square class="size-5" />
				Stop
			{:else}
				<Play class="size-5" />
				Start Transcription
			{/if}
		</Button>

		<!-- Settings Changed Banner -->
		{#if settingsChanged}
			<div
				class="flex items-center justify-between gap-3 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm"
			>
				<div class="flex items-center gap-2">
					<AlertCircle class="size-4 text-yellow-500" />
					<span>Settings changed - Restart to apply</span>
				</div>
				<Button variant="secondary" size="sm" onclick={onRestart}>Restart now</Button>
			</div>
		{/if}
	</CardContent>
</Card>
