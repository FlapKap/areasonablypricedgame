<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import type { ListGame } from "../../lib/list";
    import Minimap from "./Minimap.svelte";
    import { getViewState, setViewState } from "../../lib/userSettings";
    const VIEW_KEY = "spiral_view";

    export let listItems: ListGame[];
    export let onSwap: (indexA: number, indexB: number) => Promise<void>;
    export let onDropFromPool: (targetIndex: number) => Promise<void>;
    export let onDragStart: (listGame: ListGame, index: number) => void;

    const CARD_W = 148;
    const CARD_H = 68;

    // Archimedean spiral: r = R_MIN + R_PER_RAD * θ
    const ITEMS_PER_REV = 6;
    const ANGLE_STEP = (2 * Math.PI) / ITEMS_PER_REV;
    const R_PER_RAD = 32;   // px per radian — wider spiral arms
    const R_MIN = 90;        // inner gap so #1 isn't buried at dead center

    // Max jitter added by naturalOffset (for canvas sizing)
    const MAX_DRIFT = 90;

    // Slow rotation: radians per second
    const ROT_SPEED = 0.04;

    let rotationAngle = 0;
    let rafId: number;
    let lastTime: number | null = null;

    function tick(ts: number) {
        if (lastTime !== null) rotationAngle += ROT_SPEED * (ts - lastTime) / 1000;
        lastTime = ts;
        rafId = requestAnimationFrame(tick);
    }

    // ── Fixed canvas sized from max radius so it never resizes each frame ──
    // Reactive on listItems.length only; stable during rotation.
    $: maxR = R_MIN + R_PER_RAD * (listItems.length * ANGLE_STEP) + MAX_DRIFT + CARD_W / 2;
    $: canvasSize = Math.max(600, Math.ceil((maxR + 30) * 2));

    // Deterministic per-game scatter — FNV-1a hash of the game id
    function naturalOffset(id: string): { dx: number; dy: number; dAngle: number; dr: number } {
        let h = 2166136261;
        for (let i = 0; i < id.length; i++) {
            h ^= id.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        // Use 4 separate byte lanes
        const dx     = ((h         & 0xFF) / 255 - 0.5) * 80;   // ±40 px
        const dy     = (((h >>  8) & 0xFF) / 255 - 0.5) * 80;   // ±40 px
        const dAngle = (((h >> 16) & 0xFF) / 255 - 0.5) * 0.55; // ±0.27 rad arc shift
        const dr     = (((h >> 24) & 0xFF) / 255 - 0.5) * 60;   // ±30 px radial jitter
        return { dx, dy, dAngle, dr };
    }

    function spiralPos(i: number, baseAngle: number, id: string) {
        const off = naturalOffset(id);
        const theta = baseAngle + i * ANGLE_STEP + off.dAngle;
        const r = R_MIN + R_PER_RAD * theta + off.dr;
        return {
            x: r * Math.cos(theta) + off.dx,
            y: r * Math.sin(theta) + off.dy,
        };
    }

    // Positions relative to canvas center
    $: positions = listItems.map((lg, i) => spiralPos(i, rotationAngle, lg.game.id));

    // Decorative spiral guide path (no jitter, stable center)
    $: spiralPath = (() => {
        if (listItems.length < 2) return "";
        const half = canvasSize / 2;
        const pts: string[] = [];
        const steps = listItems.length * 10;
        for (let s = 0; s <= steps; s++) {
            const theta = rotationAngle + (s / steps) * (listItems.length - 1) * ANGLE_STEP;
            const r = R_MIN + R_PER_RAD * theta;
            const x = half + r * Math.cos(theta);
            const y = half + r * Math.sin(theta);
            pts.push(`${s === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
        }
        return pts.join(" ");
    })();

    // Click-to-swap
    let selected: number | null = null;

    async function clickNode(idx: number) {
        if (selected === null) { selected = idx; }
        else if (selected === idx) { selected = null; }
        else { await onSwap(selected, idx); selected = null; }
    }

    let dragSourceIdx: number | null = null;

    // Zoom / pan + fit-to-view
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let lastMouse = { x: 0, y: 0 };
    let viewportEl: HTMLElement;
    $: viewW = viewportEl?.clientWidth ?? 800;
    $: viewH = viewportEl?.clientHeight ?? 600;

    function fitView() {
        if (!viewportEl || !canvasSize) return;
        const vw = viewportEl.clientWidth;
        const vh = viewportEl.clientHeight;
        const z = Math.min(1, (vw - 20) / canvasSize, (vh - 20) / canvasSize);
        zoom = z;
        panX = (vw - canvasSize * z) / 2;
        panY = (vh - canvasSize * z) / 2;
    }

    let saveTimer: ReturnType<typeof setTimeout>;
    function saveView() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => setViewState(VIEW_KEY, { panX, panY, zoom }), 300);
    }

    function onWheel(e: WheelEvent) {
        e.preventDefault();
        const newZoom = Math.max(0.1, Math.min(4, zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
        const rect = viewportEl.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const cx = (mx - panX) / zoom;
        const cy = (my - panY) / zoom;
        panX = mx - cx * newZoom;
        panY = my - cy * newZoom;
        zoom = newZoom;
        saveView();
    }

    function onMouseDown(e: MouseEvent) {
        if ((e.target as HTMLElement).closest(".sp-node")) return;
        isPanning = true;
        lastMouse = { x: e.clientX, y: e.clientY };
    }

    function onMouseMove(e: MouseEvent) {
        if (!isPanning) return;
        panX += e.clientX - lastMouse.x;
        panY += e.clientY - lastMouse.y;
        lastMouse = { x: e.clientX, y: e.clientY };
    }

    function onMouseUp() {
        if (isPanning) saveView();
        isPanning = false;
    }

    // Track the most recently added item for the enter-orbit animation
    let latestAdded: number | null = null;

    async function handleDrop(e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (!viewportEl) return;
        // Convert screen → canvas-center-relative coords
        const rect = viewportEl.getBoundingClientRect();
        const viewX = e.clientX - rect.left;
        const viewY = e.clientY - rect.top;
        const canvasX = (viewX - panX) / zoom;
        const canvasY = (viewY - panY) / zoom;
        const cx = canvasX - canvasSize / 2;
        const cy = canvasY - canvasSize / 2;
        // Inverse spiral: r = R_MIN + R_PER_RAD * θ → θ = (r - R_MIN) / R_PER_RAD
        const r = Math.sqrt(cx * cx + cy * cy);
        const theta = Math.max(0, (r - R_MIN) / R_PER_RAD);
        // θ = rotationAngle + i * ANGLE_STEP → i = (θ - rotationAngle) / ANGLE_STEP
        const rankFloat = (theta - rotationAngle) / ANGLE_STEP;
        const rank = Math.round(Math.max(0, Math.min(listItems.length, rankFloat)));
        latestAdded = rank;
        await onDropFromPool(rank);
        setTimeout(() => { latestAdded = null; }, 700);
    }

    onMount(() => {
        window.addEventListener("mouseup", onMouseUp);
        rafId = requestAnimationFrame(tick);
        const saved = getViewState(VIEW_KEY);
        if (saved) { panX = saved.panX; panY = saved.panY; zoom = saved.zoom; }
        else setTimeout(fitView, 50);
    });
    onDestroy(() => {
        window.removeEventListener("mouseup", onMouseUp);
        cancelAnimationFrame(rafId);
    });
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="sp-viewport"
    bind:this={viewportEl}
    on:wheel|preventDefault={onWheel}
    on:mousedown={onMouseDown}
    on:mousemove={onMouseMove}
    on:drop={handleDrop}
    on:dragover|preventDefault
>
    <div
        class="sp-canvas"
        style="width:{canvasSize}px; height:{canvasSize}px; transform: translate({panX}px,{panY}px) scale({zoom}); transform-origin: top left;"
    >
        <!-- Decorative spiral guideline -->
        {#if spiralPath}
            <svg class="sp-svg" width={canvasSize} height={canvasSize}>
                <path d={spiralPath} fill="none" stroke="rgba(157,111,255,0.12)" stroke-width="1.5" />
            </svg>
        {/if}

        <!-- Nodes — positioned from canvas center -->
        {#each positions as pos, i}
            {@const nx = canvasSize / 2 + pos.x - CARD_W / 2}
            {@const ny = canvasSize / 2 + pos.y - CARD_H / 2}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                class="sp-node"
                class:selected={selected === i}
                class:entering={latestAdded === i}
                style="left:{nx}px; top:{ny}px; width:{CARD_W}px; height:{CARD_H}px;"
                draggable="true"
                on:dragstart|stopPropagation={() => { dragSourceIdx = i; onDragStart(listItems[i], i); }}
                on:dragend={() => { dragSourceIdx = null; }}
                on:drop|preventDefault|stopPropagation={async () => { if (dragSourceIdx !== null && dragSourceIdx !== i) { await onSwap(dragSourceIdx, i); } dragSourceIdx = null; }}
                on:dragover|preventDefault
                on:click={() => clickNode(i)}
            >
                <span class="sp-rank">#{i + 1}</span>
                {#if listItems[i]?.game.cover_art}
                    <img class="sp-cover" src={listItems[i].game.cover_art} alt={listItems[i].game.name} />
                {:else}
                    <div class="sp-cover sp-cover-empty"></div>
                {/if}
                <span class="sp-name">{listItems[i]?.game.name ?? ""}</span>
            </div>
        {/each}
    </div>

    <Minimap
        canvasW={canvasSize} canvasH={canvasSize}
        {viewW} {viewH}
        {panX} {panY} {zoom}
        onJump={(nx, ny) => { panX = nx; panY = ny; }}
    />

    <div class="sp-hint">
        {#if selected !== null}
            <span class="hint-active">#{selected + 1} selected — click another to swap</span>
        {:else}
            <span>Click two nodes to swap · Scroll to zoom · Drag background to pan</span>
        {/if}
    </div>
</div>

<style>
    .sp-viewport {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        cursor: grab;
        user-select: none;
    }

    .sp-viewport:active { cursor: grabbing; }

    .sp-canvas {
        position: absolute;
        top: 0;
        left: 0;
    }

    .sp-svg {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
    }

    .sp-node {
        position: absolute;
        display: flex;
        align-items: flex-start;
        gap: 0.4rem;
        padding: 0 0.6rem;
        background: var(--card-bg);
        border: 1.5px solid var(--border-color);
        border-radius: 8px;
        cursor: pointer;
        overflow: hidden;
        transition: border-color 0.15s, background 0.15s;
    }

    .sp-node:hover {
        border-color: var(--accent);
        background: rgba(157, 111, 255, 0.08);
    }

    .sp-node.selected {
        border-color: var(--accent);
        background: rgba(157, 111, 255, 0.2);
        box-shadow: 0 0 0 2px rgba(157, 111, 255, 0.4);
    }

    @keyframes enter-orbit {
        0%   { transform: scale(0.1); opacity: 0; box-shadow: 0 0 0 0 rgba(157,111,255,0); }
        60%  { transform: scale(1.12); opacity: 1; box-shadow: 0 0 24px 4px rgba(157,111,255,0.5); }
        100% { transform: scale(1);   opacity: 1; box-shadow: 0 0 0 0 rgba(157,111,255,0); }
    }

    .sp-node.entering {
        animation: enter-orbit 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        z-index: 10;
        border-color: var(--accent);
    }

    .sp-rank {
        font-size: 0.72rem;
        font-weight: 700;
        color: var(--text-muted);
        flex-shrink: 0;
        font-variant-numeric: tabular-nums;
    }

    .sp-cover {
        width: 2rem;
        height: calc(68px - 16px);
        object-fit: cover;
        border-radius: 3px;
        flex-shrink: 0;
    }

    .sp-cover-empty { background: rgba(255, 255, 255, 0.05); }

    .sp-name {
        font-size: 0.78rem;
        font-weight: 500;
        overflow: hidden;
        flex: 1;
        min-width: 0;
    }

    .sp-hint {
        position: absolute;
        bottom: 0.75rem;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.72rem;
        color: var(--text-muted);
        background: rgba(6, 0, 18, 0.7);
        padding: 4px 12px;
        border-radius: 20px;
        pointer-events: none;
        white-space: nowrap;
    }

    .hint-active { color: var(--accent); }
</style>
