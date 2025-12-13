<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Textarea } from '$lib/components/ui/textarea';
	import { settingsStore } from '$lib/stores/settings.svelte';

	type Props = {
		onSettingChange: () => void;
	};

	let { onSettingChange }: Props = $props();

	const { settings } = $derived(settingsStore);
</script>

<Card>
	<CardHeader>
		<CardTitle>Custom Vocabulary</CardTitle>
	</CardHeader>
	<CardContent class="space-y-3">
		<Textarea
			bind:value={settings.vocabulary}
			rows={6}
			placeholder="Enter names, brands, technical terms, acronyms...&#10;&#10;Example: Gladia, OBS, VMix, ChatGPT, OpenAI"
			onblur={() => {
				settingsStore.update({ vocabulary: settings.vocabulary });
				onSettingChange();
			}}
		/>
		<p class="text-muted-foreground text-xs">
			Separate words with commas. This improves recognition of specific terms.
		</p>
	</CardContent>
</Card>
