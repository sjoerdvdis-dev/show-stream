# Open Decisions

Each row has a recommendation, which [PLAN.md](./PLAN.md) follows. When one is accepted, record it as an [ADR](./adr/README.md) if it is hard to reverse, then remove it here.

## Backend

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

## AI tooling

| # | Decision | Recommendation | Why |
|---|---|---|---|
| D1 | Impeccable design hook | Turn on with `/impeccable hooks on` when Phase 2 starts | It runs outside model approval and helps only during UI work |
| D2 | `docker-skills` plugin | Add only if Docker work repeats | Plugin installs are documented as unavailable in WSL |

## Design system

| # | Decision | Recommendation |
|---|---|---|
| E1 | Theme direction | Dark-first with light mode, cool neutral base, one amber accent. Tokens are in PLAN.md section 9.3, final after a visual preview |
| E2 | Component docs | A `/dev/components` route rather than Storybook |
| E3 | Fonts | Geist Sans and Geist Mono; remove Zain and fix the font variable mismatch |
| E4 | TV navigation | Keep components keyboard-navigable now, so TV remote support is possible later |

## Items not yet on your list

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
