<!-- List.svelte -->
<script lang="ts">
    import { onMount } from "svelte";
    import { getAllGames } from "../lib/games";
    import { getAllListGames } from "../lib/list";
    import type { ListGame } from "../lib/list";
    import { currentUser } from "../lib/pocketbase";
    import type { GamesResponse } from "../lib/pocketbase-types";
    import GameCard from "../components/GameCard.svelte";
    import { pb } from "../lib/pocketbase";
    import { Collections } from "../lib/pocketbase-types";
    import ListItem from "../components/ListItem.svelte";
    import type { Writable } from "svelte/store";
    import { writable } from "svelte/store";


    let listItems: Writable<ListGame[]> = writable([]);
    let games: Writable<GamesResponse[]> = writable([]);

    type DragParams = {
        source: "games" | "list"
        sourceIndex: number | undefined
        index: number | undefined
        itemId: string | undefined
        game: GamesResponse
    }

    let dragParams: DragParams | undefined;

    let listEmpty = true;

    async function removeFromList() {
        const params = dragParams;
        games.update(it => {
            it.push(params.game);
            return Array.from(new Set(it));
        });
        listItems.update(it => {
            it.splice(params.sourceIndex, 1);
            return Array.from(new Set(it));
        });
        if (!!params.itemId) {
            await pb.collection(Collections.ListItems).delete(params.itemId, {$autoCancel: false});
        }
        listEmpty = $listItems.length === 0;
    }

    function displace(arr, old_index, new_index) {
        if (new_index >= arr.length) {
            let k = new_index - arr.length + 1;
            while (k--) {
                arr.push(undefined);
            }
        }
        arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
        return arr; // for testing
    }

    async function dropOnListGame(target: ListGame, targetIndex: number) {
        const params = dragParams;
        if (params.source === "games") {
            await dropInList();
            params.sourceIndex = $listItems.length - 1;
        }
        console.log(`Moving game ${params.sourceIndex} -> ${targetIndex}`);
        listItems.update(array => {
            const arr = displace(array, params.sourceIndex, targetIndex);
            const promises = [];
            for (let i = 0; i < arr.length; i++) {
                arr[i].position = i;
                promises.push(
                    pb.collection(Collections.ListItems).update(arr[i].id, {position: i}, {$autoCancel: false})
                );
            }
            Promise.all(promises);
            return arr;
        });
        listEmpty = $listItems.length === 0;
    }

    async function dropInList() {
        const params = dragParams;
        if (params.source === "games") {
            games.update(it => {
                it.splice(params.sourceIndex, 1);
                return it;
            });
            const position = $listItems.length;
            const listItem = {
                position,
                game: params.game.id,
                user: $currentUser.id
            };
            const record = await pb.collection(Collections.ListItems).create(listItem, {$autoCancel: false});
            const listGame = {
                id: record.id,
                position,
                game: params.game
            } as ListGame;
            listItems.update(it => {
                it.push(listGame);
                return it;
            });
        } else if (params.source === "list") {
            console.log("dropped in list!!!");
            listItems.update(it => {
                it.splice(params.sourceIndex, 1);
                return it;
            });
            const position = $listItems.length;
            const update = {
                game: params.game.id,
            };
            await pb.collection(Collections.ListItems).update(params.itemId, update, {$autoCancel: false});
            listItems.update(it => {
                    it.push({
                        id: params.itemId,
                        position,
                        game: params.game
                    });
                    return it;
                }
            );
        }
        listEmpty = $listItems.length === 0;
    }

    async function dragFromList(listGame: ListGame, index: number) {
        dragParams = {
            source: "list",
            sourceIndex: index,
            index,
            itemId: listGame.id,
            game: listGame.game
        } as DragParams;
    }

    async function dragFromGames(game: GamesResponse, index: number) {
        dragParams = {source: "games", game, sourceIndex: index} as DragParams;
    }

    onMount(async () => {
        if ($listItems.length === 0) {
            const allListItems = await getAllListGames($currentUser.id);
            listItems.set(allListItems);
        }
        games.set(await getAllGames());
        games.set($games.filter(it => !$listItems.find(li => li.game.id === it.id)));
        listEmpty = $listItems.length === 0;
    });

</script>
<div class="segment">
    <div
        class="sixteen-wide"
        style="height: 15vh; overflow: auto; margin-bottom: 1em"
        on:drop={removeFromList}
        on:dragover={(event) => event.preventDefault()}
    >
        {#each $games as game, i}
            <GameCard
                game={game}
                on:dragstart={async (_) => await dragFromGames(game, i)}
                on:dragover={(event) => event.preventDefault()}
            />
        {/each}
    </div>
</div>
<div class="segment column">
    <div
        id="dropzone"
        class={listEmpty ? 'empty' : ''}
        on:drop={async (event) => { event.preventDefault(); await dropInList(); event.stopPropagation(); } }
        on:dragover|preventDefault
    >
        {#if listEmpty}
            <p style="text-align: center; margin-top: 25vh; font-size: xx-large">
                Drop games here to begin ranking them!
            </p>
        {:else}
            {#each $listItems as listGame, i}
                <ListItem
                    position={i}
                    game={listGame.game}
                    extraMargins={true}
                    draggable={true}
                    compact={true}
                    on:dragstart={async (_) => await dragFromList(listGame, i)}
                    on:drop={async (event) => { event.preventDefault(); await dropOnListGame(listGame, i); event.stopPropagation();}}
                    on:dragover={(event) => event.preventDefault()}
                />
            {/each}
        {/if}
    </div>
</div>