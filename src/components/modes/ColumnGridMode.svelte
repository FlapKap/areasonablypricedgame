<script lang="ts">
    import ListItem from "../ListItem.svelte";
    import type { ListGame } from "../../lib/list";

    export let listItems: ListGame[];
    export let onDragStart: (listGame: ListGame, index: number) => void;
    export let onDropAt: (index: number) => Promise<void>;

    let dragOverIdx: number | null = null;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="column-grid" on:dragend={() => { dragOverIdx = null; }}>
    {#each listItems as listGame, i}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            class="col-item"
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
    .column-grid {
        columns: 3;
        column-gap: 1rem;
    }

    @media (max-width: 1100px) { .column-grid { columns: 2; } }
    @media (max-width: 600px)  { .column-grid { columns: 1; } }

    .col-item {
        break-inside: avoid;
        margin-bottom: 0.4rem;
        border-radius: 8px;
        transition: outline 0.1s;
    }

    .col-item.drop-target {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }
</style>
