<script lang="ts">/**
 * Represents a game as a list item.
 * Displays cover art, rank, and title in a horizontal card.
 */

import { dutchTitle } from '../lib/joke';

export let position: number = 0.0;
export let game: {
    id?: string,
    name: string,
    igdb_url?: string,
    cover_art?: string
} | null = null;

export let compact = false;
export let draggable = false;
export let extraMargins = false;

$: displayName = ($dutchTitle && game?.id === $dutchTitle.gameId)
    ? $dutchTitle.name
    : game?.name;

</script>

<div
    class="list-card"
    class:compact
    class:extra-margins={extraMargins}
    data-value="{position}"
    on:dragstart
    on:drop
    on:dragover|preventDefault
    draggable={draggable ? "true" : "false"}
    on:dblclick={() => { if (game?.igdb_url) window.open(game.igdb_url) }}
    title="{displayName}"
>
    <span class="rank">#{position + 1}</span>
    {#if game?.cover_art}
        <img class="cover" src="{game.cover_art}" alt="{game.name}">
    {:else}
        <div class="cover cover-empty"></div>
    {/if}
    <span class="title" style={draggable ? 'user-select: none' : ''}>{displayName}</span>
</div>

<style>
    .list-card {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: 1rem;
        padding: 0.6rem 1rem;
        background-color: var(--card-bg);
        border-radius: 8px;
        border: 1px solid var(--border-color);
        cursor: pointer;
        transition: border-color 0.15s ease, background-color 0.15s ease;
        width: 100%;
        break-inside: avoid;
    }

    .list-card:hover {
        border-color: rgba(157, 111, 255, 0.35);
        background-color: rgba(157, 111, 255, 0.06);
    }

    .extra-margins {
        margin-bottom: 1rem;
    }

    .rank {
        font-size: 1.1rem;
        font-weight: 700;
        min-width: 2.25rem;
        text-align: right;
        opacity: 0.45;
        flex-shrink: 0;
        font-variant-numeric: tabular-nums;
    }

    .cover {
        width: 2.8rem;
        height: 3.8rem;
        object-fit: cover;
        border-radius: 4px;
        flex-shrink: 0;
    }

    .cover-empty {
        background: rgba(255, 255, 255, 0.05);
    }

    .title {
        font-size: 1rem;
        font-weight: 500;
        flex: 1;
        min-width: 0;
    }

    .compact {
        padding: 0.4rem 0.75rem;
    }

    .compact .cover {
        width: 2rem;
        height: 2.75rem;
    }

    .compact .title {
        font-size: 0.9rem;
    }

    .compact .rank {
        font-size: 0.95rem;
    }
</style>
