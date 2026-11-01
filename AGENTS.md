# ShowStream

Self-hosted media server, intended to replace Jellyfin. A pnpm and Turborepo monorepo.

Today it is an Express API and a Next.js client on MongoDB. It is moving to the architecture in [docs/PLAN.md](docs/PLAN.md). Read that and [docs/adr/](docs/adr/README.md) before structural work.

## Rules

- The API is the only authority for auth and data. Client-side guards are only for user experience.
- Only the public proxy is published. Dev ports bind to `127.0.0.1` in `docker-compose.dev.yml`.
- ffmpeg runs only in the worker, once it exists.
- Do not add features to `apps/next-client`; it is being replaced.
- Never read, print or commit real `.env` values.

## Commands

See [docs/guides/local-development.md](docs/guides/local-development.md).

## Definition of done

Typecheck, lint, tests and build pass. UI changes are verified in a browser. Docs are updated. Anything not verified is stated.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the root plus `docs/adr/`. See `docs/agents/domain.md`.
