# ShowStream Decisions

Last updated: 2026-11-01. Companion to [AUDIT.md](./AUDIT.md) and [PLAN.md](./PLAN.md).

## Decided

| # | Decision | Notes |
|---|---|---|
| A1 | One public entry point; the API is reachable only on the Docker network | Compose ports closed and tested. Caddy replaces port 3000 in Phase 1 |
| A2 | Caddy is the public reverse proxy | Provides HTTPS, which a PWA requires. Routes API and stream traffic straight to the API |
| A3 | SQLite replaces MongoDB | Supersedes the earlier Postgres request |
| A4 | Drizzle ORM in the API | Supports SQLite; see the spike below |
| A5 | shadcn on Base UI is the base of a reusable component system | Update steps are in PLAN.md section 9.6 |
| A6 | Clients are web, PWA and Electron | |
| A7 | Agent rules live in `AGENTS.md` files | Root, `packages/`, `docs/`, and each app |
| A8 | React SPA built with Vite replaces Next.js | Client was almost entirely client-rendered; one static build for every client |
| A9 | TanStack Router | Typed, validated URL state suits library views. Spike rejected an invalid param at compile time |
| A10 | Authentication moves entirely into the API | Design is in PLAN.md section 5.6 |
| A11 | Upgrade committed | `7efb290`, merged to `main` |
| A12 | Playwright MCP | Configured in `.mcp.json` and tested |

### Drizzle + SQLite spike (2026-11-01)

| Check | Result |
|---|---|
| `drizzle-orm` + `better-sqlite3` on Node 26 | Pass |
| Same on `node:26-alpine` (musl) | Pass |
| Unique index on `(type, tmdb_id)` holds a movie and a show with the same TMDB ID | Pass; fixes the ID collision in audit section 5.2 |
| JSON column round trip | Pass |
| `node:sqlite` driver in Drizzle | Not available |
| Second container reads a live WAL database | Pass, on a named Docker volume and one host |
| DBHub in Docker reads a live WAL database | Pass, with the volume mounted read-only |
| Writes through DBHub read-only mode | All rejected |

Not tested: a `./data` bind mount or `drizzle-kit` migrations.

## Open decisions

Each row has a recommendation, which [PLAN.md](./PLAN.md) follows. Replying "agree" accepts it.

### Backend

| # | Decision | Recommendation | Why |
|---|---|---|---|
| C1 | Keep Express? | Keep Express 5 | No need to change the framework during the database move |
| C2 | Shared API contract | Zod schemas in `packages/contract`, with a typed client package | One contract for every client; schemas also validate input (audit finding 9) |
| C3 | Metadata storage | Typed columns for what we filter on, JSON for the raw TMDB payload | Client-side filtering can move to SQL. FTS5 can power search |
| C4 | Internal IDs | Own primary key, unique `(type, tmdb_id)` | Also allows files with no TMDB match |
| C5 | Job handling | Jobs table in SQLite, with ffmpeg in a separate worker process | No Redis needed; `pg-boss` no longer applies. Survives restarts (audit findings 6, 7, 16) |
| C6 | Migrations | Drizzle migrations applied at API startup | One-step upgrades for self-hosters |
| C7 | Where the schema lives | `packages/db` | Shared by the API and the worker |
| C8 | Replace `fluent-ffmpeg`? | Yes, with `child_process.spawn` | Deprecated; needed for Phase 4 playback anyway |
| C9 | Backups | Scheduled `VACUUM INTO` to a backup folder | A plain file copy of a live WAL database is unsafe |

### MongoDB to SQLite refactor

No migration tool is needed if no other deployment holds data: `data/` in this repo is empty.

| Area | Change |
|---|---|
| `apps/api-server/src/db.ts` | Replace the Mongoose schemas and connection with Drizzle |
| `src/media.ts`, `src/video.ts`, `src/auth.ts` | Rewrite the 28 model calls as Drizzle queries |
| `packages/types/src/db-types.ts` | Infer types from the schema |
| `metadatas` collection | Replace with a settings table (fixes audit finding 15) |
| `docker-compose.yml` | Remove `mongodb`; add a persistent volume for the database file |
| `.env*`, README | Remove the `MONGO_DB_*` variables; add `DATABASE_PATH` |
| `pnpm-workspace.yaml` | Allow the `better-sqlite3` build |
| Tests | Use an in-memory database |

### AI tooling

| # | Decision | Recommendation | Why |
|---|---|---|---|
| D1 | Impeccable install | `npx impeccable install --providers=claude --scope=project --no-hooks`, telemetry off | Hooks run outside model approval and can download a binary. Telemetry is on by default |
| D2 | Matt Pocock skills install | `npx skills@latest add mattpocock/skills` | Plugins are documented as unavailable in WSL sessions. Use one route only, or every skill appears twice |
| D3 | Issue tracker for those skills | GitHub Issues | Their setup asks for one, and `to-tickets` feeds the feature list |
| D4 | Next.js skills and `next-devtools-mcp` | Do not install | Phase 2 removes Next |
| D5 | shadcn tooling | Add the MCP in `.mcp.json` plus `pnpm dlx skills add shadcn/ui` | Needed either way |
| D6 | Database MCP | DBHub in read-only mode, dev-only Compose profile, bound to `127.0.0.1` | Supports SQLite. The MCP must never reach the production stack |
| D7 | Other skills | `docker-skills` only if Docker work repeats; skip the rest | Mostly small or low-trust options for this stack |
| D8 | Rule file format | `AGENTS.md` only; no `CLAUDE.md` unless Claude-specific rules appear | Claude Code reads `AGENTS.md` natively unless a `CLAUDE.md` exists. Confirm with `/context` in this app |

`D1`, `D2` and `D5` run third-party code on install, so each one's files get reviewed before they are committed.

### Design system

| # | Decision | Recommendation |
|---|---|---|
| E1 | Theme direction | Dark-first with light mode, cool neutral base, one amber accent. Tokens are in PLAN.md section 9.3, final after a visual preview |
| E2 | Component docs | A `/dev/components` route rather than Storybook |
| E3 | Fonts | Geist Sans and Geist Mono; remove Zain and fix the font variable mismatch |
| E4 | TV navigation | Keep components keyboard-navigable now, so TV remote support is possible later |

### Items not yet on your list

| # | Decision | Recommendation |
|---|---|---|
| F1 | Test stack | Vitest for logic and API, Playwright for browser flows |
| F2 | CI | GitHub Actions: typecheck, lint, test, build, audit, image build |
| F3 | Toolchain targets | Node 26 and pnpm 12, moving from `corepack` because Node 26 has none. TypeScript 7 only if the stack supports it |
| F4 | Dependency updates | Renovate or Dependabot; a CVSS 10 in a stale lockfile started this work |
| F5 | Config validation | Validate environment variables at startup and fail fast |
| F6 | Logging | Structured logs to stdout, with health endpoints for Compose |
| F7 | Release flow | Versioned images in a registry, changelog, upgrade notes |
| F8 | Project licence | Choose one before any public release; the repo has no licence file |
| F9 | Package names | Rename to `apps/web`, `apps/api`, `apps/desktop` during the restructure |
| F10 | Image handling | API endpoint that caches TMDB images on disk |
| F11 | Repo hygiene | Branch and commit conventions, `.editorconfig` |
