<script lang="ts">
	import Input from "$lib/components/ui/input/input.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import { Eye, EyeOff } from "@lucide/svelte";

	let {
		value = $bindable(''),
		placeholder = 'Enter password',
		...restProps
	}: {
		value?: string;
		placeholder?: string;
		[key: string]: unknown;
	} = $props();

	let showPassword = $state(false);

	function toggleVisibility() {
		showPassword = !showPassword;
	}
</script>

<div class="relative">
	<Input
		type={showPassword ? 'text' : 'password'}
		bind:value
		{placeholder}
		class="pr-10"
		{...restProps}
	/>
	<Button
		type="button"
		variant="ghost"
		size="icon-sm"
		class="absolute right-1 top-1/2 -translate-y-1/2"
		onclick={toggleVisibility}
	>
		{#if showPassword}
			<EyeOff class="size-4 text-muted-foreground" />
		{:else}
			<Eye class="size-4 text-muted-foreground" />
		{/if}
	</Button>
</div>
