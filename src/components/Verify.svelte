<script lang="ts">
    import { pb, currentUser } from "../lib/pocketbase";
    import type { UsersResponse } from '../lib/pocketbase-types'
    import Field from "./Field.svelte";

    async function resend() {
        // console.log($currentUser);
        const email = ($currentUser as any).email;
        // console.log("Sending user verification code to email:", email);
        await pb.collection("users").requestVerification(email);
    }

    let token: string = "";
    let errorMessage: string = "";

    async function submit() {
        try {
            const verified = await pb.collection("users").confirmVerification(token);
            if (!verified) {
                errorMessage = "Verification failed!"
            }
        } catch (e) {
            console.error(e)
            errorMessage = e?.message ?? "An error occurred."
        }
    }


</script>

<div class="segment">
    <h1>Awaiting verification...</h1>
    <p>Your user has been created, but is yet to be verified.</p>
    <p>Upon creation, a verification email should have been dispatched to {$currentUser.email},
        but you can click the button below to send another.</p>
    <br>
    <div class="divider"></div>
    <button class="button " on:click={resend}>Resend verification</button>
</div>