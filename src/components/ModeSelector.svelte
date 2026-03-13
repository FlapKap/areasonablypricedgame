<script lang="ts">
    import type { ListMode } from "../lib/pocketbase-types";

    export let current: ListMode = "column-grid";
    export let onChange: (mode: ListMode) => void;

    const modes: { id: ListMode; label: string }[] = [
        { id: "column-grid",    label: "Columns" },
        { id: "row-grid",       label: "Grid" },
        { id: "list",           label: "List" },
        { id: "position-drag",  label: "Badge Rank" },
        { id: "binary-tree",    label: "Tree" },
        { id: "spiral",         label: "Spiral" },
    ];
</script>

<div class="mode-selector">
    {#each modes as mode}
        <button
            class="mode-btn"
            class:active={current === mode.id}
            on:click={() => onChange(mode.id)}
            title={mode.label}
        >
            {mode.label}
        </button>
    {/each}
</div>

<style>
    .mode-selector {
        display: flex;
        gap: 0.35rem;
        flex-wrap: wrap;
    }

    .mode-btn {
        font-size: 0.72rem;
        font-weight: 500;
        padding: 4px 10px;
        background: transparent;
        border: 1px solid var(--border-color);
        color: var(--text-muted);
        border-radius: 20px;
        cursor: pointer;
        white-space: nowrap;
        transition: border-color 0.15s, color 0.15s, background 0.15s;
    }

    .mode-btn:hover {
        border-color: var(--accent);
        color: var(--text-color);
        filter: none;
    }

    .mode-btn.active {
        background: rgba(157, 111, 255, 0.18);
        border-color: var(--accent);
        color: var(--text-color);
        filter: none;
    }
</style>
