<script lang="ts">
	import Badge from "$lib/components/ui/badge/badge.svelte";

	let {
		status,
		text,
	}: {
		status: 'idle' | 'connecting' | 'live' | 'error' | 'reconnecting';
		text?: string;
	} = $props();

	const statusConfig = {
		idle: {
			variant: 'outline' as const,
			dotColor: 'bg-muted-foreground',
			animated: false,
		},
		connecting: {
			variant: 'outline' as const,
			dotColor: 'bg-blue-500',
			animated: false,
		},
		live: {
			variant: 'default' as const,
			dotColor: 'bg-green-500',
			animated: true,
		},
		error: {
			variant: 'destructive' as const,
			dotColor: 'bg-red-500',
			animated: false,
		},
		reconnecting: {
			variant: 'outline' as const,
			dotColor: 'bg-yellow-500',
			animated: true,
		},
	};

	const config = $derived(statusConfig[status]);
	const displayText = $derived(text ?? status.charAt(0).toUpperCase() + status.slice(1));
</script>

<Badge variant={config.variant}>
	<span class={`size-2 rounded-full ${config.dotColor} ${config.animated ? 'animate-pulse' : ''}`}></span>
	<span>{displayText}</span>
</Badge>
