# Dashboard

A SvelteKit dashboard with shadcn-svelte components, configured for static SPA deployment.

## Tech Stack

- SvelteKit 5
- TypeScript
- Tailwind CSS v4
- shadcn-svelte (bits-ui)
- adapter-static (SPA mode)

## Development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

This creates a static SPA in the `build/` directory with a fallback to `index.html` for client-side routing.

## Project Structure

- `/src/app.css` - Tailwind imports and shadcn-svelte dark theme CSS variables
- `/src/lib/utils.ts` - Utility functions including `cn()` helper for class merging
- `/src/routes/+layout.svelte` - Root layout with CSS import
- `/src/routes/+layout.ts` - SPA configuration (SSR disabled, prerender enabled)
- `/vite.config.ts` - Vite config with Tailwind CSS v4 plugin
- `/svelte.config.js` - SvelteKit config with adapter-static

## Configuration

The project is configured as a Single Page Application (SPA) for embedding in a binary:

- `adapter-static` with `fallback: 'index.html'`
- SSR disabled (`export const ssr = false`)
- Prerendering enabled (`export const prerender = true`)

All routes will be handled client-side after the initial HTML load.
