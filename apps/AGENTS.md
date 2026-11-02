# Apps

| App | Owns |
|---|---|
| `api` | All auth and data, Socket.IO, and queueing jobs |
| `worker` | Jobs from the queue in SQLite: transcodes, library scans and backups. The only place ffmpeg and TMDB calls run |
| `web` | The static React SPA. Runs under `pnpm dev` beside Next, and nothing serves it in production until Phase 2 item 7 |
| `next-client` | Today's web client, until `apps/web` replaces it in Phase 2 |
| `e2e` | Browser tests of the whole system. It ships nothing |

Apps share code only through `packages/`, so each app can build and ship alone.
