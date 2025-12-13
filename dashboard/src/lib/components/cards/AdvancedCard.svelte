<script lang="ts">
	import { Card, CardContent, CardTitle } from '$lib/components/ui/card';
	import * as Accordion from '$lib/components/ui/accordion';
	import SliderWithValue from '$lib/components/SliderWithValue.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	type Props = {
		onSettingChange: () => void;
	};

	let { onSettingChange }: Props = $props();

	const { settings } = $derived(settingsStore);

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
						hint={getResponseSpeedHint}
						onchange={() => {
							settingsStore.update({ silenceThreshold: settings.silenceThreshold });
							onSettingChange();
						}}
					/>

					<SliderWithValue
						bind:value={settings.maxDuration}
						min={5}
						max={60}
						step={1}
						label="Max segment"
						unit="s"
						hint={getMaxSegmentHint}
						onchange={() => {
							settingsStore.update({ maxDuration: settings.maxDuration });
							onSettingChange();
						}}
					/>
				</CardContent>
			</Accordion.Content>
		</Card>
	</Accordion.Item>
</Accordion.Root>
