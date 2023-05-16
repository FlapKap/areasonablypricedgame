import { pb } from "./pocketbase";
import type { GamesResponse, ListItemsResponse } from "./pocketbase-types";
import { Collections } from "./pocketbase-types";
import { addCoverArtToGame } from "./games";
import { delay } from "./delay.js";

export type ListGame = {
    id: string,
    game: GamesResponse
    position?: number
}

const cache = new Map<string, ListGame[]>();

export async function getAllListGames(userId: string | null = null): Promise<ListGame[]> {
    if (cache.has(userId)) {
        return cache.get(userId);
    }
    const query = {
        expand: "game",
        $autoCancel: false
    };
    if (!!userId) {
        query["filter"] = `user = "${userId}"`;
    }
    const listItems = await pb.collection(Collections.ListItems).getFullList(
        2048,
        query
    ) as ListItemsResponse<{ game: GamesResponse }>[];
    const allListGames = [];
    for (const it of listItems) {
        if (!it.expand.game) {
            it.expand.game = await pb.collection(Collections.Games).getOne(it.game, {$autoCancel: false});
        }
        const game = await addCoverArtToGame(it.expand.game);
        allListGames.push({
            id: it.id,
            position: it.position,
            game
        } as ListGame);
    }
    allListGames.sort((a, b) => (a.position ?? Number.MAX_VALUE) - (b.position ?? Number.MAX_VALUE));
    cache.set(userId, allListGames);
    setTimeout(() => {
        cache.delete(userId);
    }, 60_000)
    return allListGames;
}