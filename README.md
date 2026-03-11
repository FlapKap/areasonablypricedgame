# Spilklubben

A web app for Flapkap's Games Club (Spilklubben) — track, rate, and browse a shared games list.

## Stack

- [Svelte](https://svelte.dev/) + TypeScript, built with [Vite](https://vitejs.dev/)
- [PocketBase](https://pocketbase.io/) for the backend/database
- [IGDB](https://www.igdb.com/api) for game metadata (covers, summaries), authenticated via Twitch OAuth

## Development

Install dependencies:

```sh
npm install
```

Start the dev server (runs on port 7163):

```sh
npm run dev
```

The dev server proxies `/token` to the Twitch OAuth endpoint and `/igdb` to the IGDB API, so credentials are not exposed to the browser.

## Building

To build for production into the `dist/` directory:

```sh
npm run build
```

To preview the production build locally:

```sh
npm run preview
```

## Other commands

```sh
npm run check     # Svelte type checking
npm run test      # Run tests with vitest
npm run coverage  # Run tests with coverage report
```
