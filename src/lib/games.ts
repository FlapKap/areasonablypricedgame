import type { GamesResponse } from "./pocketbase-types";
import * as IGDB from "./igdb";
import { pb, currentUser } from "./pocketbase";
import { Collections } from "./pocketbase-types";
import { sequentialMap } from "./sequentialMap";

export async function addCoverArtToGame(game: GamesResponse): Promise<GamesResponse> {
    if (!!game.cover_art_url) {
        game["cover_art"] = game.cover_art_url;
        return game;
    }
    if (!game.cover_art && !game.cover_art_url && !!game.igdb_url) {
        const cover_art_url = await IGDB.getCoverUrl(game.igdb_url);
        
        console.log(`Auth store valid? ${pb.authStore.isValid}`);
        console.log('model', pb.authStore.model);
        if (pb.authStore.isValid) {
            await pb.collection(Collections.Games).update(game.id, { cover_art_url }, {$autoCancel: false});
        }
        game["cover_art"] = cover_art_url;
        return game;
    }
    if (!!game.cover_art) {
        game["cover_art"] = `${pb.baseUrl}/api/files/${Collections.Games}/${game.id}/${game.cover_art}`;
        return game;
    }
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
