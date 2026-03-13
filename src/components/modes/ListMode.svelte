<script lang="ts">
    import ListItem from "../ListItem.svelte";
    import type { ListGame } from "../../lib/list";

    export let listItems: ListGame[];
    export let onDragStart: (listGame: ListGame, index: number) => void;
    export let onDropAt: (index: number) => Promise<void>;

    let dragOverIdx: number | null = null;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="list-mode" on:dragend={() => { dragOverIdx = null; }}>
    {#each listItems as listGame, i}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            class="list-item-wrap"
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
    .list-mode {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .list-item-wrap {
        border-radius: 8px;
        transition: outline 0.1s;
    }

    .list-item-wrap.drop-target {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }
</style>
