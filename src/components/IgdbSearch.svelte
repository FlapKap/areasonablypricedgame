<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { searchGames, getCoverUrlFromCoverId } from "../lib/igdb";
    import { pb } from "../lib/pocketbase";
    import { Collections } from "../lib/pocketbase-types";

    const dispatch = createEventDispatcher();

    export let modal = false;
    let query = "";
    let results: Array<{ id: number; name: string; url: string; cover?: number; coverUrl?: string }> = [];
    let loading = false;
    let debounceTimer: ReturnType<typeof setTimeout>;

    async function search() {
        if (query.length < 2) { results = []; return; }
        loading = true;
        try {
            const raw = await searchGames(query);
            if (!Array.isArray(raw)) { results = []; return; }
            results = raw.map(g => ({ ...g, coverUrl: undefined }));
            // fetch covers without blocking the list render
            raw.forEach(async (game, i) => {
                if (game.cover) {
                    const url = await getCoverUrlFromCoverId(game.cover);
                    results[i] = { ...results[i], coverUrl: url ?? undefined };
                    results = results;
                }
            });
        } finally {
            loading = false;
        }
    }

    function onInput() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(search, 400);
    }

    async function selectGame(game: typeof results[0]) {
        let pbGame;
        try {
            pbGame = await pb.collection(Collections.Games).getFirstListItem(
                `igdb_url="${game.url}"`,
                { $autoCancel: false }
            );
        } catch {
            pbGame = await pb.collection(Collections.Games).create({
                name: game.name,
                igdb_url: game.url,
                cover_art_url: game.coverUrl ?? "",
            }, { $autoCancel: false });
        }
        dispatch("select", pbGame);
    }
</script>

<div class="igdb-search" class:modal>
    <div class="search-input-wrap">
        <input
            type="text"
            bind:value={query}
            on:input={onInput}
            placeholder="Search for a game…"
            autofocus
        />
    </div>
    {#if loading}
        <p class="search-hint">Searching…</p>
    {:else if results.length > 0}
        <div class="search-results">
            {#each results as game}
                <button class="search-result" on:click={() => selectGame(game)}>
                    {#if game.coverUrl}
                        <img src={game.coverUrl} alt={game.name} class="result-cover" />
                    {:else}
                        <div class="result-cover result-cover-empty"></div>
                    {/if}
                    <span class="result-name">{game.name}</span>
                </button>
            {/each}
        </div>
    {:else if query.length >= 2 && !loading}
        <p class="search-hint">No results found.</p>
    {/if}
</div>

<style>
    .igdb-search {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    /* When used inside a modal, fill the modal and let results scroll */
    .igdb-search.modal {
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }

    .search-input-wrap {
        padding: 0.75rem 1.25rem 0.5rem;
        flex-shrink: 0;
    }

    .igdb-search:not(.modal) .search-input-wrap {
        padding: 0;
    }

    .igdb-search.modal input {
        font-size: 1.05rem;
        padding: 0.6rem 0.9rem;
    }

    .search-results {
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        border-top: 1px solid var(--border-color);
    }

    .igdb-search:not(.modal) .search-results {
        max-height: 280px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background-color: var(--card-bg);
    }

    .igdb-search.modal .search-results {
        flex: 1;
        min-height: 0;
    }

    .search-result {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.6rem 1.25rem;
        background: transparent;
        border: none;
        border-radius: 0;
        border-bottom: 1px solid var(--border-color);
        text-align: left;
        color: var(--text-color);
        cursor: pointer;
        font-size: 0.9rem;
        transition: background-color 0.15s;
        width: 100%;
    }

    .igdb-search:not(.modal) .search-result {
        padding: 0.5rem 0.75rem;
    }

    .search-result:last-child {
        border-bottom: none;
    }

    .search-result:hover {
        background-color: rgba(157, 111, 255, 0.1);
        filter: none;
    }

    .result-cover {
        width: 2.5rem;
        height: 3.4rem;
        object-fit: cover;
        border-radius: 3px;
        flex-shrink: 0;
    }

    .igdb-search:not(.modal) .result-cover {
        width: 2rem;
        height: 2.75rem;
    }

    .result-cover-empty {
        background: rgba(255, 255, 255, 0.05);
    }

    .result-name {
        font-size: 0.95rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .search-hint {
        font-size: 0.85rem;
        color: var(--text-muted);
        padding: 0.75rem 1.25rem;
    }

    .igdb-search:not(.modal) .search-hint {
        padding: 0;
    }
</style>
