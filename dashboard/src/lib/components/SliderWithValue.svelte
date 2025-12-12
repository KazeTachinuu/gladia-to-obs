<script lang="ts">
	import Slider from "$lib/components/ui/slider/slider.svelte";
	import Label from "$lib/components/ui/label/label.svelte";

	let {
		value = $bindable(0),
		min = 0,
		max = 100,
		step = 1,
		label,
		hint,
		unit = '',
		onchange,
	}: {
		value?: number;
		min?: number;
		max?: number;
		step?: number;
		label: string;
		hint?: (value: number) => string;
		unit?: string;
		onchange?: () => void;
	} = $props();

	let sliderValue = $state([value]);

	$effect(() => {
		sliderValue = [value];
	});

	$effect(() => {
		if (sliderValue[0] !== value) {
			value = sliderValue[0];
			onchange?.();
		}
	});

	const displayValue = $derived(value + unit);
	const hintText = $derived(hint ? hint(value) : null);
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between gap-4">
		<Label class="text-sm font-medium">{label}</Label>
		<div class="flex items-baseline gap-1">
			<span class="text-sm font-semibold">{displayValue}</span>
			{#if hintText}
				<span class="text-muted-foreground text-xs">({hintText})</span>
			{/if}
		</div>
	</div>
	<Slider bind:value={sliderValue} {min} {max} {step} />
</div>
