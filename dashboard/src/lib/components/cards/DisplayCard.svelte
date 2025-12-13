<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import PositionPicker from '$lib/components/PositionPicker.svelte';
	import SliderWithValue from '$lib/components/SliderWithValue.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	type Props = {
		onStyleChange: () => void;
	};

	let { onStyleChange }: Props = $props();

	const { settings } = $derived(settingsStore);
</script>

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
				onchange={() => {
					settingsStore.update({ positionX: settings.positionX, positionY: settings.positionY });
					onStyleChange();
				}}
			/>
		</div>

		<SliderWithValue
			bind:value={settings.fontSize}
			min={24}
			max={80}
			step={2}
			label="Size"
			unit="px"
			onchange={() => {
				settingsStore.update({ fontSize: settings.fontSize });
				onStyleChange();
			}}
		/>

		<div class="space-y-2">
			<Label>Style</Label>
			<Select.Root
				type="single"
				bind:value={settings.bgStyle}
				onValueChange={(v) => {
					settingsStore.update({ bgStyle: v as 'none' | 'box' });
					onStyleChange();
				}}
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
