# Open Decisions

Each row has a recommendation, which [PLAN.md](./PLAN.md) follows. When one is accepted, record it as an [ADR](./adr/README.md) if it is hard to reverse, then remove it here.

## Backend

| # | Decision | Recommendation | Why |
|---|---|---|---|
| C1 | Keep Express? | Keep Express 5 | No need to change the framework during the database move |
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
| F6 | Logging | Structured logs to stdout, with health endpoints for Compose |
| F7 | Release flow | Versioned images in a registry, changelog, upgrade notes |
| F10 | Image handling | API endpoint that caches TMDB images on disk |
