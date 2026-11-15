# Apps

| App | Owns |
|---|---|
| `api` | All auth and data, Socket.IO, and queueing jobs |
| `worker` | Jobs from the queue in SQLite: transcodes, library scans and backups. The only place ffmpeg and TMDB calls run |
| `web` | The static React SPA, which Caddy serves. Its `Dockerfile` builds the `caddy` service's image |
| `desktop` | The Electron shell, which asks for a server's address and loads that server's `web` in its window. No product logic |
| `e2e` | Browser tests of the whole system, and of `desktop` against it. It ships nothing |

Apps share code only through `packages/`, so each app can build and ship alone.
