<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { currentUser, pb } from "../lib/pocketbase";
    import { Collections } from "../lib/pocketbase-types";
    import { getNowPlaying, passBaton, setCurrentGame, type NowPlayingState } from "../lib/nowPlaying";
    import IgdbSearch from "./IgdbSearch.svelte";

    export let state: NowPlayingState | null = null;
    let users: Array<{ id: string; name: string; username: string }> = [];
    let showPassBaton = false;
    let showGamePicker = false;
    let unsubscribe: (() => void) | null = null;

    $: isIt = !!state && !!$currentUser && state.it_user === $currentUser.id;
    $: needsGame = isIt && !state?.game;

    // Resolve display name locally when possible, falling back to what the backend returned.
    // This avoids depending on the users collection being publicly readable.
    $: itUserDisplayName = (() => {
        if (!state) return "";
        if ($currentUser && state.it_user === $currentUser.id)
            return ($currentUser as any).name || $currentUser.username || state.it_user_name;
        const found = users.find(u => u.id === state!.it_user);
        if (found) return found.name || found.username;
        return state.it_user_name;
    })();

    onMount(async () => {
        state = await getNowPlaying();

        if ($currentUser) {
            const all = await pb.collection(Collections.Users).getFullList(200, { $autoCancel: false });
            users = (all as any[]).filter(u => u.id !== $currentUser?.id);
        }

        // subscribe to real-time updates
        try {
            unsubscribe = await pb.collection(Collections.NowPlaying).subscribe("*", async () => {
                state = await getNowPlaying();
                showPassBaton = false;
                showGamePicker = false;
            }) as unknown as () => void;
        } catch {
            // real-time unavailable (e.g. unauthenticated) — silent fail
        }
    });

    onDestroy(() => {
        if (unsubscribe) {
            pb.collection(Collections.NowPlaying).unsubscribe("*");
        }
    });

    async function handlePassBaton(userId: string) {
        if (!state) return;
        await passBaton(state.id, userId);
    }

    async function handleGameSelect(event: CustomEvent) {
        if (!state) return;
        await setCurrentGame(state.id, event.detail.id);
        showGamePicker = false;
    }
</script>

{#if state}
    <div class="now-playing">
        <div class="np-header">
            <span class="np-label">Now Playing</span>
            {#if isIt && !needsGame && !showPassBaton}
                <button class="np-action-btn" on:click={() => showPassBaton = true}>Pass the baton</button>
            {/if}
        </div>

        {#if showPassBaton}
            <div class="pass-baton">
                <p class="np-prompt">Pass to whom?</p>
                <div class="pass-list">
                    {#each users as user}
                        <button class="pass-option" on:click={() => handlePassBaton(user.id)}>
                            {user.name || user.username}
                        </button>
                    {/each}
                </div>
                <button class="np-cancel" on:click={() => showPassBaton = false}>Cancel</button>
            </div>
        {:else if needsGame}
            <p class="np-prompt">You're it! Pick the next game:</p>
            {#if showGamePicker}
                <IgdbSearch modal on:select={handleGameSelect} />
            {:else}
                <button on:click={() => showGamePicker = true}>Search IGDB…</button>
            {/if}
        {:else if state.game}
            <div class="np-game">
                {#if state.game.cover_art}
                    <img src={state.game.cover_art} alt={state.game.name} class="np-cover" />
                {:else}
                    <div class="np-cover np-cover-empty"></div>
                {/if}
                <div class="np-info">
                    <span class="np-title">{state.game.name}</span>
                    <span class="np-picker">Picked by {itUserDisplayName}</span>
                </div>
            </div>
        {:else}
            <p class="np-waiting">{itUserDisplayName} is choosing a game…</p>
        {/if}
    </div>
{/if}

<style>
    .now-playing {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .np-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
    }

    .np-label {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--accent);
    }

    .np-game {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .np-cover {
        width: 2.8rem;
        height: 3.8rem;
        object-fit: cover;
        border-radius: 4px;
        flex-shrink: 0;
    }

    .np-cover-empty {
        background: rgba(255, 255, 255, 0.05);
    }

    .np-info {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        min-width: 0;
    }

    .np-title {
        font-size: 0.95rem;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .np-picker {
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    .np-waiting {
        font-size: 0.85rem;
        color: var(--text-muted);
        font-style: italic;
    }

    .np-prompt {
        font-size: 0.85rem;
        color: var(--text-muted);
    }

    .np-action-btn {
        font-size: 0.75rem;
        padding: 4px 10px;
        background-color: transparent;
        border: 1px solid var(--border-color);
        color: var(--text-muted);
    }

    .np-action-btn:hover {
        border-color: var(--accent);
        color: var(--text-color);
        filter: none;
    }

    .np-cancel {
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 0.8rem;
        padding: 0;
        cursor: pointer;
        text-decoration: underline;
    }

    .np-cancel:hover {
        color: var(--text-color);
        filter: none;
    }

    .pass-baton {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .pass-list {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }

    .pass-option {
        text-align: left;
        font-size: 0.9rem;
        padding: 6px 12px;
        background-color: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-color);
        color: var(--text-color);
        border-radius: 6px;
    }

    .pass-option:hover {
        background-color: rgba(157, 111, 255, 0.12);
        border-color: var(--accent);
        filter: none;
    }

    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        width: min(560px, 90vw);
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
    }

    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.25rem 0.75rem;
        border-bottom: 1px solid var(--border-color);
        flex-shrink: 0;
    }

    .modal-title {
        font-weight: 600;
        font-size: 1rem;
    }

    .modal-close {
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 1rem;
        padding: 0;
        cursor: pointer;
        line-height: 1;
    }

    .modal-close:hover {
        color: var(--text-color);
        filter: none;
    }
</style>
