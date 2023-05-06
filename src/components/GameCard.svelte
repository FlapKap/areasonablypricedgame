<!-- Element.svelte -->
<script lang="ts">
    import type { GamesResponse } from "../lib/pocketbase-types";
    export let game: GamesResponse;

</script>

<img
    on:dragstart
    on:drop
    on:dragover
    draggable="true"
    title={game.name}
    src={game.cover_art}
    style="display: inline-block; height: 5em; width: 7em; border-radius: 50%"
    alt={game.name}
>
