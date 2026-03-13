<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import type { ListGame } from "../../lib/list";
    import Minimap from "./Minimap.svelte";
    import { getTreeOrientation, setTreeOrientation, getViewState, setViewState } from "../../lib/userSettings";
    const VIEW_KEY = "bt_view";

    export let listItems: ListGame[];
    export let onSwap: (indexA: number, indexB: number) => Promise<void>;
    export let onDropFromPool: () => Promise<void>;
    export let onDragStart: (listGame: ListGame, index: number) => void;

    const NODE_W = 130;
    const NODE_H = 60;
    const LEVEL_H = 160;
    const LEAF_GAP = 2;

    // 0=down  1=right  2=up  3=left
    let orientation = 0;

    function rotate(dir: 1 | -1) {
        orientation = ((orientation + dir + 4) % 4) as 0 | 1 | 2 | 3;
        setTreeOrientation(orientation);
        setTimeout(fitView, 10);
    }

    type NodePos = { x: number; y: number; idx: number };
    type EdgeDef = { x1: number; y1: number; x2: number; y2: number };

    function computeLayout(n: number, orient: number): { nodes: NodePos[]; edges: EdgeDef[]; width: number; height: number } {
        if (n === 0) return { nodes: [], edges: [], width: 0, height: 0 };

        const isHoriz = orient === 1 || orient === 3;
        const leafSlot = isHoriz ? (NODE_H + LEAF_GAP) : (NODE_W + LEAF_GAP);
        const levels = Math.ceil(Math.log2(n + 1));
        const totalSpan = n * leafSlot;
        const totalDepth = levels * LEVEL_H;

        const nodes: NodePos[] = new Array(n);
        const edgePairs: { pi: number; ci: number }[] = [];

        // Balanced BST from sorted array [0..n-1]:
        // mid = floor((lo+hi)/2) becomes the root of each subtree.
        // In-order position of node[mid] == mid, so its span position is mid * leafSlot.
        // This guarantees: left subtree < parent < right subtree at every level.
        function build(lo: number, hi: number, depth: number, parentIdx: number | null) {
            if (lo > hi) return;
            const mid = Math.floor((lo + hi) / 2);
            const spanPos = mid * leafSlot + leafSlot / 2;
            const depthPos = depth * LEVEL_H;
            let x: number, y: number;
            if (orient === 0) {
                x = spanPos - NODE_W / 2; y = depthPos;
            } else if (orient === 1) {
                x = depthPos;             y = spanPos - NODE_H / 2;
            } else if (orient === 2) {
                x = spanPos - NODE_W / 2; y = totalDepth - depthPos - NODE_H;
            } else {
                x = totalDepth - depthPos - NODE_W; y = spanPos - NODE_H / 2;
            }
            nodes[mid] = { x, y, idx: mid };
            if (parentIdx !== null) edgePairs.push({ pi: parentIdx, ci: mid });
            build(lo, mid - 1, depth + 1, mid);
            build(mid + 1, hi, depth + 1, mid);
        }

        build(0, n - 1, 0, null);

        const edges: EdgeDef[] = edgePairs.map(({ pi, ci }) => {
            const p = nodes[pi], c = nodes[ci];
            if (orient === 0) return { x1: p.x + NODE_W/2, y1: p.y + NODE_H, x2: c.x + NODE_W/2, y2: c.y };
            if (orient === 1) return { x1: p.x + NODE_W,   y1: p.y + NODE_H/2, x2: c.x,           y2: c.y + NODE_H/2 };
            if (orient === 2) return { x1: p.x + NODE_W/2, y1: p.y,            x2: c.x + NODE_W/2, y2: c.y + NODE_H };
            return                   { x1: p.x,            y1: p.y + NODE_H/2, x2: c.x + NODE_W,   y2: c.y + NODE_H/2 };
        });

        const width  = isHoriz ? totalDepth + NODE_W : totalSpan;
        const height = isHoriz ? totalSpan            : totalDepth + NODE_H;
        return { nodes, edges, width, height };
    }

    $: layout = computeLayout(listItems.length, orientation);

    // Click-to-swap
    let selected: number | null = null;

    async function clickNode(idx: number) {
        if (selected === null) { selected = idx; }
        else if (selected === idx) { selected = null; }
        else { await onSwap(selected, idx); selected = null; }
    }

    let dragSourceIdx: number | null = null;

    // Zoom / pan
    let zoom = 1;
    let panX = 20;
    let panY = 20;
    let isPanning = false;
    let lastMouse = { x: 0, y: 0 };
    let viewportEl: HTMLElement;
    $: viewW = viewportEl?.clientWidth ?? 800;
    $: viewH = viewportEl?.clientHeight ?? 600;

    function fitView() {
        if (!viewportEl || !layout.width) return;
        const vw = viewportEl.clientWidth;
        const vh = viewportEl.clientHeight;
        const fitZoom = Math.min(1, (vw - 40) / canvasW, (vh - 40) / canvasH);
        zoom = fitZoom;
        panX = (vw - canvasW * fitZoom) / 2;
        panY = (vh - canvasH * fitZoom) / 2;
    }

    let saveTimer: ReturnType<typeof setTimeout>;
    function saveView() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => setViewState(VIEW_KEY, { panX, panY, zoom }), 300);
    }

    function onWheel(e: WheelEvent) {
        e.preventDefault();
        const newZoom = Math.max(0.15, Math.min(3, zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
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
        if ((e.target as HTMLElement).closest(".bt-node, .bt-controls")) return;
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

    onMount(() => {
        window.addEventListener("mouseup", onMouseUp);
        orientation = getTreeOrientation() as 0 | 1 | 2 | 3;
        const saved = getViewState(VIEW_KEY);
        if (saved) { panX = saved.panX; panY = saved.panY; zoom = saved.zoom; }
        else setTimeout(fitView, 50);
    });
    onDestroy(() => { window.removeEventListener("mouseup", onMouseUp); });

    $: canvasW = layout.width + 80;
    $: canvasH = layout.height + 40;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="bt-viewport"
    bind:this={viewportEl}
    on:wheel|preventDefault={onWheel}
    on:mousedown={onMouseDown}
    on:mousemove={onMouseMove}
    on:drop|preventDefault|stopPropagation={onDropFromPool}
    on:dragover|preventDefault
>
    <div
        class="bt-canvas"
        style="width:{canvasW}px; height:{canvasH}px; transform: translate({panX}px,{panY}px) scale({zoom}); transform-origin: top left;"
    >
        <svg class="bt-svg" width={canvasW} height={canvasH}>
            {#each layout.edges as e}
                <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="rgba(157,111,255,0.35)" stroke-width="2" />
            {/each}
        </svg>

        {#each layout.nodes as node, i}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                class="bt-node"
                class:selected={selected === i}
                style="left:{node.x}px; top:{node.y}px; width:{NODE_W}px; height:{NODE_H}px;"
                draggable="true"
                on:dragstart|stopPropagation={() => { dragSourceIdx = i; onDragStart(listItems[i], i); }}
                on:dragend={() => { dragSourceIdx = null; }}
                on:drop|preventDefault|stopPropagation={async () => { if (dragSourceIdx !== null && dragSourceIdx !== i) { await onSwap(dragSourceIdx, i); } dragSourceIdx = null; }}
                on:dragover|preventDefault
                on:click={() => clickNode(i)}
            >
                <span class="bt-rank">#{i + 1}</span>
                {#if listItems[i]?.game.cover_art}
                    <img class="bt-cover" src={listItems[i].game.cover_art} alt={listItems[i].game.name} />
                {:else}
                    <div class="bt-cover bt-cover-empty"></div>
                {/if}
                <span class="bt-name">{listItems[i]?.game.name ?? ""}</span>
            </div>
        {/each}
    </div>

    <!-- Rotation controls -->
    <div class="bt-controls">
        <button class="bt-rot-btn" on:click={() => rotate(1)} title="Rotate counter-clockwise">↺</button>
        <button class="bt-rot-btn" on:click={() => rotate(-1)}  title="Rotate clockwise">↻</button>
    </div>

    <Minimap
        canvasW={canvasW} canvasH={canvasH}
        viewW={viewW} viewH={viewH}
        {panX} {panY} {zoom}
        onJump={(nx, ny) => { panX = nx; panY = ny; }}
    />

    <div class="bt-hint">
        {#if selected !== null}
            <span class="hint-active">#{selected + 1} selected — click another node to swap</span>
        {:else}
            <span>Click two nodes to swap · Scroll to zoom · Drag to pan</span>
        {/if}
    </div>
</div>

<style>
    .bt-viewport {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        cursor: grab;
        user-select: none;
    }

    .bt-viewport:active { cursor: grabbing; }

    .bt-canvas {
        position: absolute;
        top: 0;
        left: 0;
    }

    .bt-svg {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
    }

    .bt-node {
        position: absolute;
        display: flex;
        align-items: flex-start;
        gap: 0.4rem;
        padding: 0 0.6rem;
        background: var(--card-bg);
        border: 1.5px solid var(--border-color);
        border-radius: 8px;
        cursor: pointer;
        transition: border-color 0.15s, background 0.15s;
        overflow: hidden;
    }

    .bt-node:hover {
        border-color: var(--accent);
        background: rgba(157, 111, 255, 0.08);
    }

    .bt-node.selected {
        border-color: var(--accent);
        background: rgba(157, 111, 255, 0.2);
        box-shadow: 0 0 0 2px rgba(157, 111, 255, 0.4);
    }

    .bt-rank {
        font-size: 0.72rem;
        font-weight: 700;
        color: var(--text-muted);
        flex-shrink: 0;
        font-variant-numeric: tabular-nums;
    }

    .bt-cover {
        width: 2rem;
        height: calc(60px - 16px);
        object-fit: cover;
        border-radius: 3px;
        flex-shrink: 0;
    }

    .bt-cover-empty { background: rgba(255, 255, 255, 0.05); }

    .bt-name {
        font-size: 0.78rem;
        font-weight: 500;
        overflow: hidden;
        flex: 1;
        min-width: 0;
    }

    .bt-controls {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        display: flex;
        gap: 0.35rem;
        z-index: 2;
    }

    .bt-rot-btn {
        background: rgba(6, 0, 18, 0.65);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 6px;
        color: var(--text-muted);
        font-size: 1.1rem;
        width: 32px;
        height: 32px;
        padding: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
        transition: color 0.15s, border-color 0.15s;
    }

    .bt-rot-btn:hover {
        color: var(--text-color);
        border-color: var(--accent);
        filter: none;
    }

    .bt-hint {
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
