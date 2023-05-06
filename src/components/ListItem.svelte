<script lang="ts">/**
 * Represents a game as a list item.
 * Should display:
 * - A picture of the cover art (if any)
 * - The game's title.
 * - The game's global 🌍 ranking.
 * - The user's 👍 ranking of the game.
 */

export let position: number = 0.0;
export let game: {
    name: string,
    igdb_url: string,
    cover_art: string
} | null = null;

export let compact = false;
export let draggable = false;
export let extraMargins = false;

</script>

<div
    class="segment column {compact ? 'four-wide' : 'eight-wide'}"
    style="cursor: pointer; display: inline-block; margin-bottom: {extraMargins ? '1em' : '1rem'}"
    data-value="{position}"
    on:dragstart
    on:drop
    on:dragover|preventDefault
    draggable={draggable ? "true" : "false"}
    on:dblclick={() => {window.location = game.igdb_url}}
>
    <h2
        style="max-width: 100%; margin-left: 0;white-space: nowrap; text-overflow: ellipsis; {draggable ? 'user-select: none' : ''}"
    >{position + 1.0} - {game.name}</h2>
    {#if !!game.cover_art}
        <img src="{game.cover_art}" alt="{game.name}"
             style="width: 10em; height: 14em; margin-top: 1rem; margin-left: auto; margin-right: auto"
        >
    {/if}
</div>
