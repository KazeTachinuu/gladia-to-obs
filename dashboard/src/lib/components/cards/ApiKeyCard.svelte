<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import PasswordInput from '$lib/components/PasswordInput.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	const { settings } = $derived(settingsStore);
</script>

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
			Get your key at
			<a href="https://gladia.io" target="_blank" class="text-primary hover:underline">gladia.io</a>
		</p>
	</CardContent>
</Card>
