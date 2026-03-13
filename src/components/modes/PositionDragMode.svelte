<script lang="ts">
    import type { ListGame } from "../../lib/list";
    import type { GamesResponse } from "../../lib/pocketbase-types";

    // Ranked games (already in the personal list), sorted by position
    export let listItems: ListGame[];
    // Unranked games (still in the pool)
    export let poolGames: GamesResponse[] = [];
    // Swap two already-ranked games
    export let onSwap: (indexA: number, indexB: number) => Promise<void>;
    // Add an unranked pool game at a given rank position
    export let onAddWithPosition: (game: GamesResponse, targetPosition: number) => Promise<void>;
    // Remove a ranked game (unrank it, cascade positions)
    export let onRemove: (rankIndex: number) => Promise<void>;

    // All games shown alphabetically: ranked ones first (with their badge), then pool games (no badge)
    $: allAlpha = [
        ...listItems.map(li => ({ game: li.game, rankIndex: listItems.indexOf(li), isRanked: true })),
        ...poolGames.map(g => ({ game: g, rankIndex: -1, isRanked: false })),
    ].sort((a, b) => a.game.name.localeCompare(b.game.name));

    // All available rank slots: 1 through N+1 (one for each possible insertion point)
    $: availableBadges = poolGames.length > 0 ? Array.from({ length: poolGames.length }, (_, i) => listItems.length + 1 + i) : [];

    // The badge currently being dragged: its rank (1-indexed) and source rank index (-1 = tray badge)
    let draggingRank: number | null = null;
    let draggingFrom: number | null = null;

    function startTrayDrag(rank: number, e: DragEvent) {
        draggingRank = rank;
        draggingFrom = -1;
        e.stopPropagation();
    }

    function startBadgeDrag(rank: number, fromRankIndex: number, e: DragEvent) {
        draggingRank = rank;
        draggingFrom = fromRankIndex;
        e.stopPropagation();
    }

    async function dropBadgeOnGame(entry: typeof allAlpha[0], e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (draggingRank === null || draggingFrom === null) return;

        const targetIndex = entry.rankIndex; // -1 if unranked

        if (!entry.isRanked) {
            // Dropping any badge onto an unranked pool game → add it at that rank position
            const insertAt = draggingRank <= listItems.length ? draggingRank - 1 : listItems.length;
            await onAddWithPosition(entry.game as GamesResponse, insertAt);
        } else if (draggingFrom === -1) {
            // Tray badge → move this ranked game to last place
            await onSwap(targetIndex, listItems.length - 1);
        } else if (draggingFrom !== targetIndex) {
            // Swap two ranked games
            await onSwap(draggingFrom, targetIndex);
        }

        draggingRank = null;
        draggingFrom = null;
    }

    function cancelDrag() {
        draggingRank = null;
        draggingFrom = null;
    }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="pd-root" on:dragend={cancelDrag}>
    <div class="pd-tray-row">
        <span class="pd-hint">Available ranks — drag onto a game to assign:</span>
        <div class="pd-tray">
            {#each availableBadges as rank}
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <span
                    class="pd-badge tray"
                    draggable="true"
                    on:dragstart={(e) => startTrayDrag(rank, e)}
                >{rank}</span>
            {/each}
        </div>
    </div>

    <div class="pd-grid">
        {#each allAlpha as entry}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                class="pd-card"
                class:unranked={!entry.isRanked}
                class:drag-over={draggingRank !== null}
                on:drop={(e) => dropBadgeOnGame(entry, e)}
                on:dragover={(e) => e.preventDefault()}
            >
                {#if entry.isRanked}
                    <div class="pd-badge-wrap">
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <span
                            class="pd-badge"
                            draggable="true"
                            on:dragstart={(e) => startBadgeDrag(entry.rankIndex + 1, entry.rankIndex, e)}
                        >{entry.rankIndex + 1}</span>
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <button
                            class="pd-remove"
                            title="Remove from ranked list"
                            on:click|stopPropagation={() => onRemove(entry.rankIndex)}
                        >×</button>
                    </div>
                {:else}
                    <span class="pd-badge-empty" title="Drop a badge here to rank this game">?</span>
                {/if}
                {#if entry.game.cover_art}
                    <img class="pd-cover" src={entry.game.cover_art} alt={entry.game.name} />
                {:else}
                    <div class="pd-cover pd-cover-empty"></div>
                {/if}
                <span class="pd-name">{entry.game.name}</span>
            </div>
        {/each}
    </div>
</div>

<style>
    .pd-root {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .pd-tray-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0.75rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        flex-wrap: wrap;
    }

    .pd-hint {
        font-size: 0.78rem;
        color: var(--text-muted);
        flex-shrink: 0;
    }

    .pd-tray {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
    }

    .pd-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 0.75rem;
    }

    .pd-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 0.5rem 0.6rem;
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        position: relative;
        transition: border-color 0.15s;
        cursor: default;
    }

    .pd-card.unranked {
        opacity: 0.55;
        border-style: dashed;
    }

    .pd-card.drag-over:hover {
        border-color: var(--accent);
        background: rgba(157, 111, 255, 0.08);
        opacity: 1;
    }

    .pd-badge-wrap {
        position: absolute;
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 2px;
        z-index: 1;
    }

    .pd-badge {
        background: var(--accent);
        color: #fff;
        font-size: 0.8rem;
        font-weight: 700;
        min-width: 24px;
        height: 24px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 6px;
        cursor: grab;
        user-select: none;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    }

    .pd-badge.tray {
        position: static;
        transform: none;
        background: rgba(157, 111, 255, 0.35);
        box-shadow: none;
        font-size: 0.75rem;
        height: 22px;
        min-width: 22px;
    }

    .pd-badge.tray:hover {
        background: rgba(157, 111, 255, 0.6);
    }

    .pd-badge:active { cursor: grabbing; }

    .pd-remove {
        background: rgba(255, 255, 255, 0.12);
        border: none;
        color: var(--text-muted);
        font-size: 0.85rem;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        cursor: pointer;
        line-height: 1;
        transition: background 0.12s, color 0.12s;
    }

    .pd-remove:hover {
        background: rgba(255, 80, 80, 0.7);
        color: #fff;
    }

    .pd-badge-empty {
        position: absolute;
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-muted);
        font-size: 0.8rem;
        font-weight: 700;
        min-width: 24px;
        height: 24px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 6px;
        border: 1px dashed var(--border-color);
        z-index: 1;
    }

    .pd-cover {
        width: 3rem;
        height: 4rem;
        object-fit: cover;
        border-radius: 4px;
    }

    .pd-cover-empty {
        background: rgba(255, 255, 255, 0.05);
    }

    .pd-name {
        font-size: 0.8rem;
        font-weight: 500;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        width: 100%;
    }
</style>
