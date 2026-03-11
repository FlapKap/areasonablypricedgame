import { pb } from "./pocketbase";
import { Collections } from "./pocketbase-types";
import { addCoverArtToGame } from "./games";

export type NowPlayingState = {
    id: string;
    it_user: string;
    it_user_name: string;
    game?: {
        id: string;
        name: string;
        cover_art?: string;
        igdb_url?: string;
    };
};

export async function getNowPlaying(): Promise<NowPlayingState | null> {
    try {
        const record = await pb.collection(Collections.NowPlaying).getFirstListItem("id != ''", {
            expand: "it_user,game",
            $autoCancel: false,
        });

        const itUser = record.expand?.it_user;
        const it_user_name = itUser?.name || itUser?.username || "Unknown";

        const expandedGame = record.expand?.game;
        const game = expandedGame ? await addCoverArtToGame(expandedGame) : undefined;
        return {
            id: record.id,
            it_user: record.it_user,
            it_user_name,
            game: game ? { id: game.id, name: game.name, cover_art: game["cover_art"], igdb_url: game.igdb_url } : undefined,
        };
    } catch {
        return null;
    }
}

export async function passBaton(nowPlayingId: string, newUserId: string): Promise<void> {
    await pb.collection(Collections.NowPlaying).update(nowPlayingId, {
        it_user: newUserId,
        game: null,
    }, { $autoCancel: false });
}

export async function setCurrentGame(nowPlayingId: string, gameId: string): Promise<void> {
    await pb.collection(Collections.NowPlaying).update(nowPlayingId, {
        game: gameId,
    }, { $autoCancel: false });
}
