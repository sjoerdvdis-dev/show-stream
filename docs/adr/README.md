# Architecture Decision Records

Decisions that are hard to reverse, surprising without context, and the result of a real trade-off. Format and numbering are in `.claude/skills/domain-modeling/ADR-FORMAT.md`.

| ADR | Decision |
|---|---|
| [0001](./0001-single-public-entry-through-caddy.md) | One public entry point through Caddy |
| [0002](./0002-vite-react-spa-replaces-nextjs.md) | Vite React SPA replaces Next.js |
| [0003](./0003-tanstack-router.md) | TanStack Router |
| [0004](./0004-api-owned-session-auth.md) | The API owns authentication |
| [0005](./0005-sqlite-replaces-mongodb.md) | SQLite replaces MongoDB |
| [0006](./0006-drizzle-with-better-sqlite3.md) | Drizzle ORM with better-sqlite3 |
| [0007](./0007-shadcn-on-base-ui.md) | shadcn on Base UI |
| [0008](./0008-schema-in-packages-db-migrated-at-startup.md) | The schema lives in `packages/db` and migrates at API startup |

ADRs are not rewritten once accepted. To change one, add a new ADR that supersedes it.
