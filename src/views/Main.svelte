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

<div class="segment column" style="height: 80vh;overflow-y: scroll">
    {#each list as item}
        <ListItem
            position={item.position}
            game={item.game}
        />
    {/each}
</div>


