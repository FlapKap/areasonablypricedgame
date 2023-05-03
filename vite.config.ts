import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { run } from 'vite-plugin-run';

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        proxy: {
            "/token": {
                target: "https://id.twitch.tv/oauth2/token",
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/token/, '')
            },
            "/igdb": {
                target: "https://api.igdb.com/v4",
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/igdb/, '')
            }
        }
    },
    plugins: [
        svelte({hot: !process.env.VITEST}),
        run([{
            startup: true,
            name: "generate typings",
            run: ["npx", "pocketbase-typegen", "--db", "bin/pb_data/data.db", "--out", "src/lib/pocketbase-types.ts"]
        }]),
    ]
})
