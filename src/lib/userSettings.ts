import { get } from "svelte/store";
import { pb, currentUser } from "./pocketbase";
import { Collections, type ListMode } from "./pocketbase-types";

const LS_KEY = "list_mode";
const DEFAULT_MODE: ListMode = "column-grid";

const LS_TREE_KEY = "tree_orientation";
const DEFAULT_TREE_ORIENTATION = 0;

export function getTreeOrientation(): number {
    const v = localStorage.getItem(LS_TREE_KEY);
    return v !== null ? parseInt(v, 10) : DEFAULT_TREE_ORIENTATION;
}

export function setTreeOrientation(orientation: number): void {
    localStorage.setItem(LS_TREE_KEY, String(orientation));
}

type ViewState = { panX: number; panY: number; zoom: number };

export function getViewState(key: string): ViewState | null {
    const v = localStorage.getItem(key);
    try { return v ? JSON.parse(v) : null; } catch { return null; }
}

export function setViewState(key: string, state: ViewState): void {
    localStorage.setItem(key, JSON.stringify(state));
}

let cached: { id: string; list_mode: ListMode } | null = null;

export async function getListMode(): Promise<ListMode> {
    const user = get(currentUser);
    if (!user) return DEFAULT_MODE;

    try {
        const record = await pb.collection(Collections.UserSettings).getFirstListItem(
            `user = "${user.id}"`,
            { $autoCancel: false }
        );
        cached = { id: record.id, list_mode: record.list_mode as ListMode };
        return cached.list_mode || DEFAULT_MODE;
    } catch {
        // Fall back to localStorage if collection doesn't exist yet
        return (localStorage.getItem(LS_KEY) as ListMode) || DEFAULT_MODE;
    }
}

export async function setListMode(mode: ListMode): Promise<void> {
    const user = get(currentUser);
    localStorage.setItem(LS_KEY, mode);
    if (!user) return;

    try {
        if (cached) {
            await pb.collection(Collections.UserSettings).update(
                cached.id, { list_mode: mode }, { $autoCancel: false }
            );
            cached.list_mode = mode;
            return;
        }
        try {
            const record = await pb.collection(Collections.UserSettings).getFirstListItem(
                `user = "${user.id}"`, { $autoCancel: false }
            );
            await pb.collection(Collections.UserSettings).update(
                record.id, { list_mode: mode }, { $autoCancel: false }
            );
            cached = { id: record.id, list_mode: mode };
        } catch {
            const record = await pb.collection(Collections.UserSettings).create(
                { user: user.id, list_mode: mode }, { $autoCancel: false }
            );
            cached = { id: record.id, list_mode: mode };
        }
    } catch {
        // PocketBase collection may not exist yet; localStorage already saved
    }
}
