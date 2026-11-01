# Apps

| App | Owns |
|---|---|
| `api` | All auth and data, Socket.IO, library scans |
| `worker` | Jobs from the queue in SQLite, and the only place ffmpeg runs |
| `next-client` | Today's web client, until `apps/web` replaces it in Phase 2 |
| `e2e` | Browser tests of the whole system. It ships nothing |

Apps share code only through `packages/`, so each app can build and ship alone.
