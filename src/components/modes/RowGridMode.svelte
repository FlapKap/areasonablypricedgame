<script lang="ts">
    import ListItem from "../ListItem.svelte";
    import type { ListGame } from "../../lib/list";

    export let listItems: ListGame[];
    export let onDragStart: (listGame: ListGame, index: number) => void;
    export let onDropAt: (index: number) => Promise<void>;

    let dragOverIdx: number | null = null;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="row-grid" on:dragend={() => { dragOverIdx = null; }}>
    {#each listItems as listGame, i}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            class="grid-item"
            class:drop-target={dragOverIdx === i}
            on:dragover|preventDefault={() => { dragOverIdx = i; }}
            on:dragleave={() => { if (dragOverIdx === i) dragOverIdx = null; }}
            on:drop|stopPropagation={async () => { await onDropAt(i); dragOverIdx = null; }}
        >
            <ListItem
                position={i}
                game={listGame.game}
                compact={true}
                draggable={true}
                on:dragstart={() => onDragStart(listGame, i)}
            />
        </div>
    {/each}
</div>

<style>
    .row-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.4rem;
        align-items: start;
    }

    @media (max-width: 1100px) { .row-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px)  { .row-grid { grid-template-columns: 1fr; } }

    .grid-item {
        border-radius: 8px;
        transition: outline 0.1s;
    }

    .grid-item.drop-target {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }
</style>
