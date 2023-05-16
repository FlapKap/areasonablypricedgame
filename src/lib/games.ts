import type { GamesResponse } from "./pocketbase-types";
import * as IGDB from "./igdb";
import { pb } from "./pocketbase";
import { Collections } from "./pocketbase-types";
import { sequentialMap } from "./sequentialMap";

export async function addCoverArtToGame(game: GamesResponse): Promise<GamesResponse> {
    if (!game.cover_art && !!game.igdb_url) {
        game.cover_art = await IGDB.getCoverUrl(game.igdb_url);
    } else if (!!game.cover_art) {
        game["cover_art"] = `${pb.baseUrl}/api/files/${Collections.Games}/${game.id}/${game.cover_art}`;
    }
    return game;
}

export async function getAllGames(): Promise<GamesResponse[]> {
    const query = {
        $autoCancel: false
    }
    const games = await pb.collection(Collections.Games)
        .getFullList(2048, query);
    // console.log(games);
    return await sequentialMap(games, addCoverArtToGame);
}
