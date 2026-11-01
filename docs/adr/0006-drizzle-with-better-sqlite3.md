# Drizzle ORM with better-sqlite3

Database access uses Drizzle ORM through the `better-sqlite3` driver. Drizzle has no driver for Node's built-in `node:sqlite`, so that option is out. A spike passed on Node 26 and `node:26-alpine`, including a unique `(type, tmdb_id)` index that lets a movie and a show share a TMDB ID.

## Consequences

`better-sqlite3` is a native module and must stay in pnpm's build allowlist. Drizzle is pre-1.0, so versions are pinned and queries stay behind `packages/db`.
