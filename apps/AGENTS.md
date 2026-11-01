# Apps

| App | Owns |
|---|---|
| `api` | All auth and data, Socket.IO, library scans |
| `next-client` | Today's web client, until `apps/web` replaces it in Phase 2 |
| `e2e` | Browser tests of the whole system. It ships nothing |

Apps share code only through `packages/`, so each app can build and ship alone.
