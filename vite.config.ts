import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { run } from 'vite-plugin-run';

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        https: false,
        host: "0.0.0.0",
        port: 7163,
        proxy: {
            "/token": {
                target: "https://id.twitch.tv/oauth2/token",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/token/, '')
            },
            "/igdb": {
                target: "https://api.igdb.com/v4",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/igdb/, '')
            }
        }
    },
    preview: {
        https: false,
        host: true,
        port: 7163,
        proxy: {
            "/token": {
                target: "https://id.twitch.tv/oauth2/token",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/token/, '')
            },
            "/igdb": {
                target: "https://api.igdb.com/v4",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/igdb/, '')
            }
        }
    },
    plugins: [
        svelte({hot: !process.env.VITEST, exclude: ['./pocketbase']}),
        // run([{
        //     startup: true,
        //     name: "generate typings",
        //     run: ["npx", "pocketbase-typegen", "--db", "bin/pb_data/data.db", "--out", "src/lib/pocketbase-types.ts"]
        // }, {
        //     startup: true,
        //     name: "start pb",
        //     run: ["./pocketbase", "serve"]
        // }]),
    ],
    build: {
        minify: false
    }
})
