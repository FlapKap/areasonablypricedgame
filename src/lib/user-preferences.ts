import { writable } from "svelte/store";
import type { Writable } from "svelte/store";

type Theme = "Light" | "Dark";

type UserPreferences = {
    theme: Theme
}

export const userPreferences: Writable<UserPreferences> = writable({
    theme: "Light"
})
