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
    <form
        class={"fourteen-wide segment " + (errorMessage.length > 0 ? "error" : "")}
        on:submit|preventDefault
    >
        <h1 style="margin-bottom: 0.5rem;">Spilklubben - Login</h1>
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
            placeholder="********"
            name="password"
            type="password"
            minLength="8"
            bind:input={password}
        />
        {#if mode === "Up"}
            <Field
                classes="fourteen-wide"
                label="Repeat password"
                placeholder="********"
                name="password2"
                type="password"
                minLength="8"
                bind:input={password2}
            />
        {/if}
        {#if errorMessage.length > 0}
            <div class="error">
                <h2>Error</h2>
                <p>{errorMessage}</p>
            </div>
        {/if}
        <button class="four-wide float-left" style="padding: 8px 16px; margin-left: 2rem;" on:click={submit}>Sign {mode}</button>
        <div class="float-right" style="margin-right: 2rem;">
            {#if mode === "Up"}
                <a
                    href="#"
                    on:click={() => {
                        mode = "In";
                    }}>Already have a user? Click here to sign in!</a
                >
            {:else}
                <a
                    href="#"
                    on:click={() => {
                        mode = "Up";
                    }}>Don't have a user yet? Click here to sign up!</a
                >
            {/if}
        </div>
    </form>
</div>
