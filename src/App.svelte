<script lang="ts">
    import { pb } from "./lib/pocketbase";
    import Login from "./components/Login.svelte";
    import { nav } from "./lib/navigation";
    import { currentUser } from "./lib/pocketbase";
    import { onMount } from "svelte";
    // import { DateTime } from "luxon";
    import Views from "./views/Views.svelte";
    import Main from "./views/Main.svelte";
    import NowPlaying from "./components/NowPlaying.svelte";
    import { maybeSetupJoke } from "./lib/joke";

    let showLogin = false;
    let landingNpState: any = null;

    onMount(async () => {
        try {
            await pb.collection("users").authRefresh();
            maybeSetupJoke(pb.authStore.model?.id ?? '');
        } catch (_) {
            pb.authStore.clear();
        }
    });

    async function logOut() {
        await pb.authStore.clear();
    }
</script>
<svelte:window on:keydown={(e) => { if (e.key === 'Escape') showLogin = false; }}/>
{#if !$currentUser || !$currentUser.verified}
    <div class="landing-page">
        <div class="landing-grid">
            <div class="landing-left">
                <div class="segment landing-hero">
                    <h1>Flapkap's Spilklub</h1>
                    <p>A private board game club's collective list — browse games rated and ranked by members. Sign in to add your own ratings.</p>
                    <button class="cta-btn" on:click={() => showLogin = true}>Sign in</button>
                    {#if landingNpState}<hr/>{/if}
                    <NowPlaying bind:state={landingNpState}/>
                </div>
            </div>
            <div class="landing-right">
                <Main/>
            </div>
        </div>
        {#if showLogin}
            <div class="dimmer" on:click={(e) => { if (e.target === e.currentTarget) showLogin = false; }}>
                <Login/>
            </div>
        {/if}
    </div>
{:else}
    <div class="app-layout">
        <aside class="sidebar">
            <span class="sidebar-title">Flapkap's Spilklub</span>
            <nav class="sidebar-nav">
                <button class="navlink" class:active={$nav === "Main List"} on:click={() => { $nav = "Main List"; }}>Main List</button>
                <button class="navlink" class:active={$nav === "My List"} on:click={() => { $nav = "My List"; }}>My List</button>
                <button class="navlink" on:click={logOut}>Log out</button>
            </nav>
            <hr/>
            <NowPlaying/>
        </aside>
        <div class="app-content">
            <Views/>
        </div>
    </div>
{/if}