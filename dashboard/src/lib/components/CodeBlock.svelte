<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";
	import Label from "$lib/components/ui/label/label.svelte";
	import { Copy, Check } from "@lucide/svelte";
	import { toast } from "svelte-sonner";

	let {
		value,
		label,
	}: {
		value: string;
		label?: string;
	} = $props();

	let copied = $state(false);

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			toast.success('Copied to clipboard');

			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			toast.error('Failed to copy');
		}
	}
</script>

<div class="space-y-2">
	{#if label}
		<Label>{label}</Label>
	{/if}
	<div class="bg-muted relative rounded-md border">
		<div class="overflow-x-auto p-3 pr-12">
			<code class="text-foreground text-sm font-mono">{value}</code>
		</div>
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			class="absolute right-2 top-2"
			onclick={copyToClipboard}
		>
			{#if copied}
				<Check class="text-green-500 size-4" />
			{:else}
				<Copy class="text-muted-foreground size-4" />
			{/if}
		</Button>
	</div>
</div>
