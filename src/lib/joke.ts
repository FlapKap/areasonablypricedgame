import { writable } from "svelte/store";
import { pb } from "./pocketbase";
import { Collections } from "./pocketbase-types";

const JOKE_USER_ID = 'jndq4cs434jt3at';

// Null for everyone else; { gameId, name } for the lucky Dutchman
export const dutchTitle = writable<{ gameId: string; name: string } | null>(null);

function capitalize(str: string): string {
    return str.split(/\s+/).map(w =>
        (w.length <= 3) ? w : w.charAt(0).toLocaleUpperCase() + w.slice(1)
    ).join(" ")
}

async function translateToDutch(text: string): Promise<string> {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=nl&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const data = await res.json();
        const translation = capitalize(data?.[0]?.[0]?.[0]);
        console.warn(`GEKOLONISEERD '${translation}'`)
        return translation ?? text;
    } catch {
        return text;
    }
}

export async function maybeSetupJoke(userId: string): Promise<void> {
    if (userId !== JOKE_USER_ID) return;
    const games = await pb.collection(Collections.Games).getFullList(2048, { $autoCancel: false });
    if (!games.length) return;
    const victim = games[Math.floor(Math.random() * games.length)];
    const dutch = await translateToDutch(victim.name as string);
    dutchTitle.set({ gameId: victim.id, name: dutch });
}
