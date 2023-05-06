<script lang="ts">
    import { pb } from "./lib/pocketbase";
    import Login from "./components/Login.svelte";
    import { nav } from "./lib/navigation";
    import { currentUser } from "./lib/pocketbase";
    import Verify from "./components/Verify.svelte";
    import { onMount } from "svelte";
    import { DateTime } from "luxon";
    import Views from "./views/Views.svelte";
    import { Collections } from "./lib/pocketbase-types";

    let backgroundImage: string;
    let message: string;

    onMount(async () => {
        const backgrounds = Object.keys(await import.meta.glob("../public/backgrounds/*.png"))
            .map(it => it.split("/").pop());
        const dt = DateTime.now();
        const r = dt.day / (dt.daysInMonth - dt.day);
        const background = backgrounds[Math.trunc(r * backgrounds.length)];
        backgroundImage = `/backgrounds/${background}`;
        document.body.style.backgroundSize = "auto";
        document.body.style.backgroundImage = `url(${backgroundImage})`;
        await pb.collection("users").authRefresh();
        const post = await pb.collection(Collections.BillboardPosts).getFirstListItem('display=true', {
            $autoCancel: false
        });
        message = post.message;
    });

    async function logOut() {
        await pb.authStore.clear();
    }
</script>
<div class="ten-wide">
    {#if !$currentUser}
        <Login/>
    {:else if !$currentUser.verified}
        <Verify/>
    {:else}
        <div class="segment">
            <h1 class="pad-extra">Flapkap's Spilklub</h1>
            <div class="pad-extra" style="display: inline-block; text-align: center; padding:1em;">
                {@html message ?? ""}
            </div>
            <div style="display: inline-block">
                <nav class="navbar">
                    <a class="navlink" href="#" on:click={() => {$nav = "Main List"}}>Main List</a>
                    <a class="navlink" href="#" on:click={() => {$nav = "My List"}}>My List</a>
                    <a class="navlink" href="#" on:click={() => {$nav = "Users"}}>Users</a>
                    {#if !!$currentUser}
                        <button class="navlink" on:click={logOut}>Log out</button>
                    {/if}
                </nav>
            </div>
        </div>
        <br>
        <Views/>
    {/if}
</div>
