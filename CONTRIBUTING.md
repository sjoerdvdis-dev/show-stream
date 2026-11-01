# Contributing to ShowStream

## Before you start

- ShowStream is moving to a new architecture. Read [the plan](./docs/PLAN.md) and the [decisions](./docs/adr/README.md) before structural work.
- `apps/next-client` is being replaced, so do not add features to it.
- Report vulnerabilities [privately](./SECURITY.md), not in an issue.
- Everyone here follows the [code of conduct](./CODE_OF_CONDUCT.md).

## Set up

Fork or clone the repo, then run:

```bash
./scripts/setup.sh
```

It needs Node.js 26 and a running Docker, and tells you what to do if either is missing. Everything else it installs itself. To run the apps, see the [local development guide](./docs/guides/local-development.md).

## Make a change

1. Pick an issue, or open one first for anything large. Issues labelled `ready-for-agent` or `ready-for-human` are ready to start.
2. Branch from `main`, named `type/short-description`, such as `fix/seek-crash`.
3. Commit as `type: summary`, in the imperative. Types in use are `feat`, `fix`, `chore`, `ci` and `docs`.
4. Run the checks:

   ```bash
   pnpm turbo check-types lint build
   ```

5. Open a pull request to `main`. The template asks for evidence and what you did not test.

`main` only accepts pull requests that pass the `check` job. The `audit` job only reports, so it does not block a merge.

## Definition of done

- Typecheck, lint, tests and build pass.
- UI changes are verified in a browser.
- Docs are updated.
- Anything not verified is stated.

## Project rules

- The API is the only authority for auth and data. Client-side guards are only for user experience.
- Only the public proxy is published. Dev ports bind to `127.0.0.1` in `docker-compose.dev.yml`.
- ffmpeg runs only in the worker, once it exists.
- Never read, print or commit real `.env` values.

## Working with Claude Code

Skills, agents and MCP servers come with the clone, and `AGENTS.md` holds the rules agents follow. The usual path through a piece of work is:

| Stage | Skill |
|---|---|
| Sharpen an idea, update the glossary and decisions | `/grill-with-docs` |
| Turn it into a spec | `/to-spec` |
| Break the spec into tickets | `/to-tickets` |
| Build a ticket | `/implement` |
| Bugs | `/diagnosing-bugs` |

Not sure which one fits? Use `/ask-matt`. The full list is in [the plan](./docs/PLAN.md#105-how-we-develop). The pinned MCP servers are enabled in `.claude/settings.json`.

## Licence

Contributions are licensed under [Apache-2.0](./LICENSE), the same as the project. There is no CLA.
