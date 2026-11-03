# Apps

| App | Owns |
|---|---|
| `api` | All auth and data, Socket.IO, and queueing jobs |
| `worker` | Jobs from the queue in SQLite: transcodes, library scans and backups. The only place ffmpeg and TMDB calls run |
| `web` | The static React SPA, which Caddy serves. Its `Dockerfile` builds the `caddy` service's image |
| `next-client` | The old web client. No Compose file uses it, and Phase 2 item 8 deletes it |
| `e2e` | Browser tests of the whole system. It ships nothing |

Apps share code only through `packages/`, so each app can build and ship alone.
