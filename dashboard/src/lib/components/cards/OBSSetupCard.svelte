<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import CodeBlock from '$lib/components/CodeBlock.svelte';

	type Props = {
		localUrl: string;
		networkUrl: string;
	};

	let { localUrl, networkUrl }: Props = $props();
</script>

<Card>
	<CardHeader>
		<CardTitle>OBS Browser Source</CardTitle>
	</CardHeader>
	<CardContent class="space-y-4">
		<CodeBlock value={localUrl} label="This computer" />
		<CodeBlock value={networkUrl} label="Network (same WiFi)" />
		<p class="text-muted-foreground text-xs">
			Set resolution to 1920×1080.
			<a href="{localUrl}?bg" target="_blank" class="text-primary hover:underline"
				>Preview overlay</a
			>
		</p>
	</CardContent>
</Card>
