<script lang="ts">
    import type { ListItemsResponse } from "../lib/pocketbase-types";
    import { Collections } from "../lib/pocketbase-types";
    import { pb } from "../lib/pocketbase";
    import { onMount } from "svelte";
    import * as IGDB from "../lib/igdb";
    import ListItem from "../components/ListItem.svelte";

    let list: { id: string, position: number, game: any }[] = [];

    async function sequentialMap(array, fn) {
        const result = [];
        for (const value of array) {
            const mappedValue = await fn(value);
            result.push(mappedValue);
        }
        return result;
    }

    function reduceListToAverages(
        allListItems: { id: string, user: string, position: number, game: any }[]
    ): { id: string, position: number, game: any }[] {
        const reducedObjects = allListItems.reduce((acc, item) => {
            if (!acc[item.id]) {
                acc[item.id] = {
                    id: item.id,
                    position: item.position,
                    game: item.game,
                    count: 1
                };
            } else {
                acc[item.id].position += item.position;
                acc[item.id].count++;
            }
            return acc;
        }, {});

        for (const key in reducedObjects) {
            reducedObjects[key].position /= reducedObjects[key].count;
            delete reducedObjects[key].count;
        }

        const items = Object.values(reducedObjects);
        items.sort((a, b) => a.position - b.position);
        return items as { id: string, position: number, game: any }[];
    }

    async function loadList() {
        const query = {
            expand: "game",
            $autoCancel: false
        };
        const listItems = await pb.collection(Collections.ListItems)
            .getFullList(2048, query);
        const withCoverArt = await sequentialMap(listItems, async it => {
            const listItem: ListItemsResponse = it as ListItemsResponse;
            const game = it.expand.game;
            if (!game["cover_art"] && !!game["igdb_url"]) {
                game["cover_art"] = await IGDB.getCoverUrl(game["igdb_url"]);
            } else if (!!game["cover_art"]) {
                console.log(game["cover_art"]);
                console.log(game)
                console.log(pb)
                game['cover_art'] = `${pb.baseUrl}/api/files/${Collections.Games}/${game.id}/${game['cover_art']}`;
            }
            return {
                id: listItem.game,
                user: listItem.user,
                position: listItem.position,
                game: game
            };
        });

        list = reduceListToAverages(withCoverArt);
    }

    onMount(async () => {
        await loadList();
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


