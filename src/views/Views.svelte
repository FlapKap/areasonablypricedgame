<script>
    import {nav} from "../lib/navigation";
    import Main from "./Main.svelte";
    import Personal from "../views/Personal.svelte";
    import Users from "../views/Users.svelte";
</script>
{#if $nav === "Main List"}
    <Main/>
{:else if $nav === "My List"}
    <Personal/>
{:else if $nav === "Users"}
    <Users/>
{/if}
