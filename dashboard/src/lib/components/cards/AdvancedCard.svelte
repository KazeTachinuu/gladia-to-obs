<script lang="ts">
	import { Card, CardContent, CardTitle } from '$lib/components/ui/card';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Button } from '$lib/components/ui/button';
	import SliderWithValue from '$lib/components/SliderWithValue.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { RotateCcw } from 'lucide-svelte';

	type Props = {
		onSettingChange: () => void;
	};

	let { onSettingChange }: Props = $props();

	const { settings } = $derived(settingsStore);

	// Gladia recommended defaults for live captions
	const GLADIA_DEFAULTS = {
		silenceThreshold: 0.3,
		maxDuration: 5
	};

	function resetToGladiaDefaults() {
		settingsStore.update(GLADIA_DEFAULTS);
		onSettingChange();
	}

	function getResponseSpeedHint(value: number): string {
		if (value <= 0.1) return 'Very fast';
		if (value <= 0.3) return 'Fast';
		if (value <= 0.5) return 'Balanced';
		if (value <= 1) return 'Natural';
		return 'Slow';
	}

	function getMaxSegmentHint(value: number): string {
		if (value <= 8) return 'Short';
		if (value <= 14) return 'Medium';
		return 'Long';
	}
</script>

<Accordion.Root type="multiple">
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
						logarithmic
						hint={getResponseSpeedHint}
						onchange={() => {
							settingsStore.update({ silenceThreshold: settings.silenceThreshold });
							onSettingChange();
						}}
					/>

					<SliderWithValue
						bind:value={settings.maxDuration}
						min={5}
						max={20}
						step={1}
						label="Max segment"
						unit="s"
						hint={getMaxSegmentHint}
						onchange={() => {
							settingsStore.update({ maxDuration: settings.maxDuration });
							onSettingChange();
						}}
					/>

					<Button variant="outline" size="sm" class="w-full" onclick={resetToGladiaDefaults}>
						<RotateCcw class="mr-2 h-4 w-4" />
						Reset to Gladia defaults (0.3s / 5s)
					</Button>
				</CardContent>
			</Accordion.Content>
		</Card>
	</Accordion.Item>
</Accordion.Root>
