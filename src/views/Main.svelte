<script lang="ts">
    import { onMount } from "svelte";
    import ListItem from "../components/ListItem.svelte";
    import { getAllListGames } from "../lib/list";
    import type { ListGame } from "../lib/list";

    let list: ListGame[] = [];

    async function reduceListToAverages(
        allListItems: ListGame[]
    ): Promise<ListGame[]> {
        const averagedPositions = allListItems.reduce((acc, item) => {
            if (acc.has(item.game.id)) {
                const entry = acc.get(item.game.id);
                entry.sum += item.position ?? 0;
                entry.count++;
            } else {
                acc.set(item.game.id, {
                    sum: item.position,
                    count: 1
                });
            }
            return acc;
        }, new Map<string, { sum: number, count: number }>());
        const addedGames = new Set();
        const items = allListItems.flatMap(it => {
            const entry = averagedPositions.get(it.game.id);
            it.position = entry.sum / entry.count;
            if (addedGames.has(it.game.id)) {
                return [];
            }
            addedGames.add(it.game.id);
            return [it];
        });
        items.sort((a, b) => a.position - b.position);
        const withFakePositions = items.map((e: ListGame, i) => {
            e.position = i;
            return e;
        })
        return withFakePositions as ListGame[];
    }

    async function populateList() {
        if (list.length === 0) {
            const allItems = await getAllListGames();
            list = await reduceListToAverages(allItems);
        }
    }

    onMount(async () => {
        await populateList();
    });
</script>

<div class="segment main-grid">
    {#if list.length === 0}
        <h1>Loading list...</h1>
    {:else}
        {#each list as item}
            <div class="main-item">
                <ListItem position={item.position} game={item.game} />
            </div>
        {/each}
    {/if}
</div>

<style>
    .main-grid {
        columns: 3;
        column-gap: 1rem;
    }

    @media (max-width: 1100px) { .main-grid { columns: 2; } }
    @media (max-width: 600px)  { .main-grid { columns: 1; } }

    .main-item {
        break-inside: avoid;
        margin-bottom: 0.4rem;
    }
</style>


