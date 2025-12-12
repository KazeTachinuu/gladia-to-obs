<script lang="ts">
	let {
		posX = $bindable(50),
		posY = $bindable(50),
		onchange,
	}: {
		posX?: number;
		posY?: number;
		onchange?: () => void;
	} = $props();

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
	<div class="text-muted-foreground mt-2 text-xs">
		Position: {posX.toFixed(1)}%, {posY.toFixed(1)}%
	</div>
</div>
