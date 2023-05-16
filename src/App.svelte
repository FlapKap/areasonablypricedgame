<script lang="ts">
    import { pb } from "./lib/pocketbase";
    import Login from "./components/Login.svelte";
    import { nav } from "./lib/navigation";
    import { currentUser } from "./lib/pocketbase";
    import Verify from "./components/Verify.svelte";
    import { onMount } from "svelte";
    // import { DateTime } from "luxon";
    import Views from "./views/Views.svelte";
    import Main from "./views/Main.svelte";
    import { Collections } from "./lib/pocketbase-types";

    // let backgroundImage: string;
    let message: string;

    // const backgrounds = [
    //     '2cd5bdb780bca4694ecdf4232bc5337ca264bb0ec449636257342404.png',
    //     '4bb34647e55b0ed9d33122cbfbcb84848e54227adb7736a62b65cf65.png',
    //     '6fabe26c88d802b25f89b6ef54ce5d9c879713cdf0eeea1f96adad27.png',
    //     '15d6f5295319d33bcf3d499171fee5670c31132f169f6919099a56a2.png',
    //     'ca2aa9fa4bcf9cbd0c2cf6babe5fb03f25483decfca2e6de2867405a.png',
    //     'e1c4b0151472ed02661ae6087cf35435fa6478fbcb3c8f956e203426.png',
    //     'f18f7deee360f27c067bae3165146bae013f461ae06f027c2b733d66.png',
    //     'fba1cd118d8234da4db9b6511b1b64c51a1ca515114dcbb183058b40.png'
    // ];

    onMount(async () => {
        // Disable the rolling backgrounds for now...
        // const dt = DateTime.now();
        // const r = dt.day / dt.daysInMonth;
        // const background = backgrounds[Math.trunc(r * backgrounds.length)];
        // backgroundImage = `/backgrounds/${background}`;
        // document.body.style.backgroundSize = "auto";
        // document.body.style.backgroundImage = `url(${backgroundImage})`;
        // document.body.style.backgroundSize = 'cover';
        document.body.style.background = "#543d8b"
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
    {#if !$currentUser || !$currentUser.verified}
        <Login/>
        <Main compact={true}/>
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
                    <!-- <a class="navlink" href="#" on:click={() => {$nav = "Users"}}>Users</a> -->
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
