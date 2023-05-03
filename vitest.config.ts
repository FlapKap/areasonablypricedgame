import { defineConfig } from "vitest/config";
import { viteRequire } from "vite-require";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
    plugins: [
        svelte({hot: false}),
        viteRequire()
    ],
    esbuild: {
        target: 'node14',
    }
})