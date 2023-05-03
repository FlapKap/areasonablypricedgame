import { writable } from "svelte/store";
import type { Writable } from "svelte/store";

export type Nav = "Main List" | "My List" | "Users"
export const nav: Writable<Nav> = writable("Main List");

nav.subscribe((value) => {
    console.log("Now showing", value);
})
