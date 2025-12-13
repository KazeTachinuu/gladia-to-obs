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
		logarithmic = false,
		onchange,
	}: {
		value?: number;
		min?: number;
		max?: number;
		step?: number;
		label: string;
		hint?: (value: number) => string;
		unit?: string;
		logarithmic?: boolean;
		onchange?: () => void;
	} = $props();

	// Logarithmic scale conversion functions
	function valueToSlider(val: number): number {
		if (!logarithmic) return val;
		const logMin = Math.log(min);
		const logMax = Math.log(max);
		return (Math.log(val) - logMin) / (logMax - logMin) * 100;
	}

	function sliderToValue(slider: number): number {
		if (!logarithmic) return slider;
		const logMin = Math.log(min);
		const logMax = Math.log(max);
		const logValue = logMin + (slider / 100) * (logMax - logMin);
		const rawValue = Math.exp(logValue);
		// Round to step precision
		return Math.round(rawValue / step) * step;
	}

	let sliderValue = $state([value]);

	$effect(() => {
		sliderValue = [logarithmic ? valueToSlider(value) : value];
	});

	$effect(() => {
		const newValue = logarithmic ? sliderToValue(sliderValue[0]) : sliderValue[0];
		if (Math.abs(newValue - value) > step / 2) {
			value = newValue;
			onchange?.();
		}
	});

	// Round to avoid floating point display issues like 0.8200000000000001
	const displayValue = $derived(Number(value.toFixed(2)) + unit);
	const hintText = $derived(hint ? hint(value) : null);

	// For logarithmic sliders, we use 0-100 range internally
	const sliderMin = $derived(logarithmic ? 0 : min);
	const sliderMax = $derived(logarithmic ? 100 : max);
	const sliderStep = $derived(logarithmic ? 0.1 : step);
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
	<Slider type="multiple" bind:value={sliderValue} min={sliderMin} max={sliderMax} step={sliderStep} />
</div>
