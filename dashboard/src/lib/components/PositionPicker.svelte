<script lang="ts">
	import { RotateCcw } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';

	const DEFAULT_X = 50;
	const DEFAULT_Y = 85;

	let {
		posX = $bindable(DEFAULT_X),
		posY = $bindable(DEFAULT_Y),
		onchange,
	}: {
		posX?: number;
		posY?: number;
		onchange?: () => void;
	} = $props();

	function resetPosition() {
		posX = DEFAULT_X;
		posY = DEFAULT_Y;
		onchange?.();
	}

	let container: HTMLDivElement | null = $state(null);
	let isDragging = $state(false);

	function updatePosition(clientX: number, clientY: number) {
		if (!container) return;

		const rect = container.getBoundingClientRect();
		const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
		const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

		posX = Math.round(x * 10) / 10;
		posY = Math.round(y * 10) / 10;
		onchange?.();
	}

	function handleMouseDown(e: MouseEvent) {
		isDragging = true;
		updatePosition(e.clientX, e.clientY);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		updatePosition(e.clientX, e.clientY);
	}

	function handleMouseUp() {
		isDragging = false;
	}

	$effect(() => {
		if (isDragging) {
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('mouseup', handleMouseUp);

			return () => {
				window.removeEventListener('mousemove', handleMouseMove);
				window.removeEventListener('mouseup', handleMouseUp);
			};
		}
	});
</script>

<div class="w-full">
	<div
		bind:this={container}
		role="button"
		tabindex="0"
		onmousedown={handleMouseDown}
		class="bg-muted relative w-full cursor-crosshair overflow-hidden rounded-md border"
		style="aspect-ratio: 16 / 9;"
	>
		<!-- Position indicator -->
		<div
			class="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
			style="left: {posX}%; top: {posY}%;"
		>
			<div class="bg-primary size-3 rounded-full shadow-lg"></div>
			<div class="bg-background text-foreground rounded px-2 py-1 text-xs font-medium shadow-lg">
				Subtitle
			</div>
		</div>
	</div>
	<div class="mt-2 flex items-center justify-between">
		<span class="text-muted-foreground text-xs">
			Position: {posX.toFixed(1)}%, {posY.toFixed(1)}%
		</span>
		<Button variant="ghost" size="sm" class="h-7 px-2 text-xs" onclick={resetPosition}>
			<RotateCcw class="mr-1 size-3" />
			Reset
		</Button>
	</div>
</div>
