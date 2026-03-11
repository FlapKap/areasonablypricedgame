<script lang="ts">
    import Field from "./Field.svelte";
    import { currentUser, pb } from "../lib/pocketbase";
    import type { UsersResponse } from "../lib/pocketbase-types";

    let mode: "In" | "Up" = "In";

    let email: string = "";
    let username: string = "";
    let password: string = "";
    let password2: string = "";
    let errorMessage: string = "";

    async function login() {
        try {
            const user: UsersResponse = (await pb.collection("users").authWithPassword(
                email,
                password
            )).record as UsersResponse;
            // console.log(JSON.stringify(user));
            // console.log("verified?", user.verified);
            if (!user.verified) {
                await pb.collection("users").requestVerification(email);
                pb.authStore.clear();
                errorMessage = "Cannot sign in until email is verified.";
            }
        } catch (err) {
            console.error(err);
            errorMessage = err?.message ?? "An error occurred.";
        }
    }

    async function signUp() {
        try {
            const data = {
                email: email,
                password,
                passwordConfirm: password2,
                user: username,
            };
            const createdUser = await pb.collection("users").create(data);
            await login();
        } catch (err) {
            console.error(err);
            errorMessage = err?.message ?? "An error occurred.";
        }
    }

    async function submit() {
        if (mode == "In") {
            await login();
        } else {
            await signUp();
        }
    }
</script>

<div>
    <form class="segment login-form" on:submit|preventDefault>
        <p class="login-subtitle">{mode === "In" ? "Sign in to your account" : "Create an account"}</p>
        <hr>
        <Field
            classes="fourteen-wide"
            name="email"
            label={mode === "In" ? "Email / Username" : "Email"}
            placeholder="your@email.com"
            type="text"
            bind:input={email}
        />
        {#if mode === "Up"}
            <Field
                classes="fourteen-wide"
                name="username"
                label="Username"
                placeholder="username"
                type="text"
                bind:input={username}
            />
        {/if}
        <Field
            classes="fourteen-wide"
            label="Password"
            placeholder="••••••••"
            name="password"
            type="password"
            minLength="8"
            bind:input={password}
        />
        {#if mode === "Up"}
            <Field
                classes="fourteen-wide"
                label="Repeat password"
                placeholder="••••••••"
                name="password2"
                type="password"
                minLength="8"
                bind:input={password2}
            />
        {/if}
        {#if errorMessage.length > 0}
            <div class="error-box">
                <p>{errorMessage}</p>
            </div>
        {/if}
        <div class="login-actions">
            <button on:click={submit}>Sign {mode}</button>
            {#if mode === "Up"}
                <button class="link-btn" on:click={() => { mode = "In"; }}>Already have an account?</button>
            {:else}
                <button class="link-btn" on:click={() => { mode = "Up"; }}>Don't have an account yet?</button>
            {/if}
        </div>
    </form>
</div>

<style>
    .login-form {
        max-width: 420px;
        margin: 0 auto;
        padding: 2rem;
    }

    .login-subtitle {
        color: var(--text-muted);
        font-size: 0.95rem;
        margin-bottom: 1rem;
    }

    .login-actions {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        margin-top: 0.5rem;
    }

    .link-btn {
        background: none;
        border: none;
        padding: 0;
        color: var(--anchor-color);
        font-size: inherit;
        cursor: pointer;
        font-weight: normal;
    }

    .link-btn:hover {
        text-decoration: underline;
        filter: none;
    }

    .error-box {
        background: rgba(248, 113, 113, 0.12);
        border: 1px solid rgba(248, 113, 113, 0.35);
        border-radius: 6px;
        padding: 0.75rem 1rem;
        color: var(--error-color);
        font-size: 0.9rem;
        margin-bottom: 0.75rem;
    }
</style>
