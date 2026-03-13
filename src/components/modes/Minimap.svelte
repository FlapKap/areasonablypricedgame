<script lang="ts">
    // canvasW/H: full size of the scrollable canvas
    // viewW/H: size of the viewport element
    // panX/Y: current translate offset
    // zoom: current scale
    export let canvasW: number;
    export let canvasH: number;
    export let viewW: number;
    export let viewH: number;
    export let panX: number;
    export let panY: number;
    export let zoom: number;
    export let onJump: (newPanX: number, newPanY: number) => void;

    const MM_W = 160;
    const MM_H = 120;

    // Scale factor from canvas coords → minimap coords
    $: scaleX = MM_W / canvasW;
    $: scaleY = MM_H / canvasH;

    // Viewport indicator rect in minimap coords
    // The visible area of the canvas in canvas coords is:
    //   x: [-panX/zoom .. (-panX + viewW)/zoom]  (but clamped to canvasW/H)
    $: vpX  = -panX / zoom;
    $: vpY  = -panY / zoom;
    $: vpW  = viewW / zoom;
    $: vpH  = viewH / zoom;
    $: rectX = Math.max(0, vpX * scaleX);
    $: rectY = Math.max(0, vpY * scaleY);
    $: rectW = Math.min(MM_W - rectX, vpW * scaleX);
    $: rectH = Math.min(MM_H - rectY, vpH * scaleY);

    function onMinimapClick(e: MouseEvent) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const mx = (e.clientX - rect.left) / MM_W;
        const my = (e.clientY - rect.top)  / MM_H;
        // Center the canvas at the clicked point
        const cx = mx * canvasW;
        const cy = my * canvasH;
        onJump(viewW / 2 - cx * zoom, viewH / 2 - cy * zoom);
    }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="minimap"
    style="width:{MM_W}px; height:{MM_H}px;"
    on:click={onMinimapClick}
>
    <!-- Viewport indicator -->
    <div
        class="mm-viewport"
        style="left:{rectX}px; top:{rectY}px; width:{Math.max(4, rectW)}px; height:{Math.max(4, rectH)}px;"
    ></div>
</div>

<style>
    .minimap {
        position: absolute;
        bottom: 2.5rem;
        right: 0.75rem;
        background: rgba(6, 0, 18, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        overflow: hidden;
        cursor: crosshair;
        backdrop-filter: blur(4px);
    }

    .mm-viewport {
        position: absolute;
        background: rgba(157, 111, 255, 0.25);
        border: 1px solid rgba(157, 111, 255, 0.6);
        border-radius: 2px;
        pointer-events: none;
    }
</style>
