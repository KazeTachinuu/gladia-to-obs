<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { transcriptionStore } from '$lib/stores/transcription.svelte';

	const { state } = $derived(transcriptionStore);
</script>

<Card>
	<CardHeader>
		<div class="flex items-center justify-between">
			<CardTitle>Live Preview</CardTitle>
			<span class="font-mono text-sm tabular-nums">{state.elapsedTime}</span>
		</div>
	</CardHeader>
	<CardContent>
		<div
			class="bg-muted/50 min-h-[100px] rounded-md p-4 text-center {state.status === 'live'
				? 'text-foreground'
				: 'text-muted-foreground'}"
		>
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
