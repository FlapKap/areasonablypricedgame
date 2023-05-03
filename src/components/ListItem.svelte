<script lang="ts">/**
 * Represents a game as a list item.
 * Should display:
 * - A picture of the cover art (if any)
 * - The game's title.
 * - The game's global 🌍 ranking.
 * - The user's 👍 ranking of the game.
 */
import { onMount } from "svelte";

export let position: number = 0.0;
export let game: {
    name: string,
    igdb_url: string,
    cover_art: string
} | null = null;

onMount(async () => {

});
</script>

<div class="segment" style="cursor: pointer; margin-bottom: 1rem" on:click={() => {history.pushState({}, game.name, game.igdb_url)}}>
    <h1>{position + 1.0} - {game.name}</h1>
    {#if !!game.cover_art}
        <img src="{game.cover_art}" alt="{game.name}" style="width: 10em">
    {/if}
</div>
