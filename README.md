# ProSync (Nitro v3 + Vite)

This project now runs as one app using Nitro v3 for server/runtime and Vite for frontend build assets.

Phase 1 API scope is intentionally minimal:
- `GET /api/health` (Hono)

All previous Express endpoints are not part of this phase.

## Local development

Prerequisites:
- Node.js 20+

1. Install dependencies:
   - `npm install`
2. Create local env file:
   - PowerShell: `Copy-Item .env.example .env.local`
3. Start app:
   - `npm run dev`

This command builds Vite assets, then starts Nitro dev server.

## Scripts

- `npm run dev` -> Vite build + Nitro dev
- `npm run build:web` -> Vite build to `dist`
- `npm run build` -> Vite build + Nitro build
- `npm run preview` -> Nitro preview

## API

- Health endpoint: `/api/health`

Response:

```json
{ "status": "ok" }
```

## Deploy to Vercel

Nitro config uses preset `vercel` in `nitro.config.ts`.

1. Import this repository in Vercel.
2. Ensure build command is `npm run build`.
3. Deploy.

## Notes

- Frontend routes still load from Vite build output served by Nitro.
- Because this is Phase 1, frontend features requiring old API routes will not work until those routes are migrated.
